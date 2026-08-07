#!/usr/bin/env node
/* Bakes the seed elevation grids around Cardiff Airport into src/data/dem_egff.js.
 *
 *   node flightsim/tools/bake_dem.mjs
 *
 * Two grids come out of it:
 *   regional  256x256 over ~25 km, sampled from zoom 12  (~100 m posts)
 *   airfield  256x256 over ~3 km,  sampled from zoom 14  (~12 m posts)
 *
 * Why bake at all, when the simulator can stream the same tiles at runtime: the
 * sandbox has no persistent cache, so every session would start with a flat
 * world and fill in over several seconds — with the aeroplane sitting on it. The
 * baked grids mean the view from the gate is right on the first frame, and the
 * simulator stays fully flyable with no network at all.
 *
 * Encoding is delta-coded Int16 metres, gzipped, base64. Delta coding first
 * matters: terrain is smooth, so row-wise differences are small numbers that
 * gzip compresses far harder than raw absolute heights.
 *
 * Zero dependencies. Node has no PNG decoder, so there is a small one below.
 */
import { writeFileSync } from "node:fs";
import { gzipSync, inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TILE_URL = (z, x, y) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

/* ------------------------------------------------------------------- PNG ----
 * Just enough of the format for what these tiles actually are: 8-bit,
 * non-interlaced, colour type 2 (RGB) or 6 (RGBA). Anything else is rejected
 * loudly rather than decoded wrongly. */

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let p = 8, width = 0, height = 0, depth = 0, colour = 0, interlace = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      depth = data[8]; colour = data[9]; interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  if (depth !== 8) throw new Error(`unsupported bit depth ${depth}`);
  if (colour !== 2 && colour !== 6) throw new Error(`unsupported colour type ${colour}`);
  if (interlace !== 0) throw new Error("interlaced PNG not supported");

  const channels = colour === 2 ? 3 : 4;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;   // left
      const b = prev ? prev[i] : 0;                       // up
      const c = prev && i >= channels ? prev[i - channels] : 0; // up-left
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else if (filter !== 0) throw new Error(`bad filter ${filter} on row ${y}`);
      cur[i] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

/* ------------------------------------------------------------- tile fetching */

const cache = new Map();
async function tile(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (cache.has(key)) return cache.get(key);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(TILE_URL(z, x, y));
      if (r.status === 404) { cache.set(key, null); return null; }   // outside coverage
      if (!r.ok) throw new Error("HTTP " + r.status);
      const img = decodePng(Buffer.from(await r.arrayBuffer()));
      cache.set(key, img);
      return img;
    } catch (e) {
      if (attempt === 3) throw new Error(`${key}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
}

/* ------------------------------------------------------------- slippy maths */

const lonToX = (lon, z) => (lon + 180) / 360 * Math.pow(2, z);
const latToY = (lat, z) => {
  const r = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z);
};

/* Bilinear sample of the terrarium elevation surface at a geodetic point.
   Bilinear rather than nearest because these grids get downsampled hard, and
   nearest-neighbour aliasing on a coastline is very visible from the air. */
async function sample(lat, lon, z) {
  const fx = lonToX(lon, z) * 256, fy = latToY(lat, z) * 256;   // global pixel coords
  const x0 = Math.floor(fx - 0.5), y0 = Math.floor(fy - 0.5);
  const tx = fx - 0.5 - x0, ty = fy - 0.5 - y0;
  let acc = 0;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const px = x0 + i, py = y0 + j;
      const img = await tile(z, Math.floor(px / 256), Math.floor(py / 256));
      let h = 0;
      if (img) {
        const lx = ((px % 256) + 256) % 256, ly = ((py % 256) + 256) % 256;
        const o = (ly * img.width + lx) * img.channels;
        h = (img.data[o] * 256 + img.data[o + 1] + img.data[o + 2] / 256) - 32768;
      }
      acc += h * (i ? tx : 1 - tx) * (j ? ty : 1 - ty);
    }
  }
  return acc;
}

/* ------------------------------------------------------------------- baking */

const EGFF = { lat: 51.396702, lon: -3.343330 };

async function grid(name, halfKm, n, z) {
  const dLat = (halfKm * 1000) / 111320;
  const dLon = (halfKm * 1000) / (111320 * Math.cos(EGFF.lat * Math.PI / 180));
  const lat0 = EGFF.lat - dLat, lat1 = EGFF.lat + dLat;
  const lon0 = EGFF.lon - dLon, lon1 = EGFF.lon + dLon;

  const h = new Int16Array(n * n);
  let min = Infinity, max = -Infinity;
  for (let j = 0; j < n; j++) {
    const lat = lat0 + (lat1 - lat0) * (j / (n - 1));
    for (let i = 0; i < n; i++) {
      const lon = lon0 + (lon1 - lon0) * (i / (n - 1));
      const v = Math.round(await sample(lat, lon, z));
      h[j * n + i] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (j % 32 === 0) process.stdout.write(`\r  ${name}: row ${j}/${n}   `);
  }
  process.stdout.write(`\r  ${name}: ${n}x${n} from z${z}, ${min}..${max} m, ` +
    `${(2 * halfKm * 1000 / (n - 1)).toFixed(0)} m posts\n`);

  /* Delta-code along rows; the first column of each row differs from the row
     above, so a smooth surface becomes a field of small numbers. */
  const d = new Int16Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const cur = h[j * n + i];
      const pred = i ? h[j * n + i - 1] : (j ? h[(j - 1) * n] : 0);
      d[j * n + i] = cur - pred;
    }
  }
  const gz = gzipSync(Buffer.from(d.buffer, d.byteOffset, d.byteLength), { level: 9 });
  return {
    name, n, z, lat0, lat1, lon0, lon1, min, max,
    b64: gz.toString("base64"), rawBytes: d.byteLength, gzBytes: gz.length
  };
}

console.log("baking seed elevation for EGFF from AWS terrarium tiles\n");
const regional = await grid("regional", 12.5, 256, 12);
const airfield = await grid("airfield", 1.6, 256, 14);

const meta = (g) => `{n:${g.n},lat0:${g.lat0.toFixed(7)},lat1:${g.lat1.toFixed(7)},` +
  `lon0:${g.lon0.toFixed(7)},lon1:${g.lon1.toFixed(7)},b64:"${g.b64}"}`;

const out = `/* data/dem_egff.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   - */

/* Seed elevation around Cardiff Airport, baked from AWS terrarium tiles by
 * tools/bake_dem.mjs. Do not edit by hand — re-run the baker.
 *
 * Two grids of delta-coded Int16 metres, gzipped and base64'd. The simulator can
 * stream the same source at runtime, but the sandbox gives it no persistent
 * cache, so without these every session would begin with a flat world filling in
 * underneath the aeroplane. With them the view from the gate is correct on the
 * first frame, and the simulator flies with no network at all.
 *
 *   regional  ${regional.n}x${regional.n} over ~25 km, ~100 m posts, ${regional.min}..${regional.max} m
 *   airfield  ${airfield.n}x${airfield.n} over ~3.2 km, ~13 m posts, ${airfield.min}..${airfield.max} m
 */

BFS.DemEGFF = {
  regional: ${meta(regional)},
  airfield: ${meta(airfield)}
};
`;

writeFileSync(join(ROOT, "src", "data", "dem_egff.js"), out);

const total = regional.b64.length + airfield.b64.length;
console.log(`\n  regional  ${(regional.rawBytes / 1024).toFixed(0)} KB raw -> ` +
            `${(regional.gzBytes / 1024).toFixed(1)} KB gz -> ${(regional.b64.length / 1024).toFixed(1)} KB base64`);
console.log(`  airfield  ${(airfield.rawBytes / 1024).toFixed(0)} KB raw -> ` +
            `${(airfield.gzBytes / 1024).toFixed(1)} KB gz -> ${(airfield.b64.length / 1024).toFixed(1)} KB base64`);
console.log(`  total base64 payload ${(total / 1024).toFixed(1)} KB\n`);
console.log("  wrote src/data/dem_egff.js\n");
