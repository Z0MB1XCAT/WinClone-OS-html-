/* terrain/heightfield.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util, core/geo, data/dem_egff, data/egff */

/* The single authority on "how high is the ground here".
 *
 * Everything asks this: the landing gear, the terrain mesh, the radio altimeter,
 * and later the ground-proximity warnings. They must all get the same answer, or
 * the aeroplane sinks into a runway that is drawn somewhere else.
 *
 * Sources are tried in order of trustworthiness:
 *
 *   1. Airport pavement, where the aeroplane is on it. This overrides the
 *      elevation data completely and deliberately. The digital elevation model
 *      has roughly a hundred-metre post spacing regionally and thirteen locally,
 *      and it was sampled from a surface that includes whatever was standing on
 *      the ground. Drive a runway off it and it undulates by a couple of metres
 *      over its length — the aeroplane porpoises on the take-off roll and the
 *      touchdown zone is a hill. So the pavement defines its own surface, and
 *      the terrain is blended *into* it over a few hundred metres rather than
 *      the other way round.
 *
 *   2. The baked airfield grid, thirteen-metre posts over about three
 *      kilometres.
 *
 *   3. The baked regional grid, hundred-metre posts over twenty-five
 *      kilometres.
 *
 *   4. Beyond that, fractal displacement seeded from the edge of the regional
 *      grid — so the world degrades into something that still looks like
 *      terrain rather than ending at a cliff onto a flat plate.
 *
 * Streamed elevation tiles slot in at level 2 in a later phase; the interface
 * here does not change when they do.
 */

BFS.Height = (function () {
  "use strict";

  var U = BFS.Util, Geo = BFS.Geo;

  var grids = [];
  var ready = false;

  /* Undo the delta coding the baker applied along rows. */
  function undelta(d, n) {
    var h = new Int16Array(n * n);
    for (var j = 0; j < n; j++) {
      for (var i = 0; i < n; i++) {
        var pred = i ? h[j * n + i - 1] : (j ? h[(j - 1) * n] : 0);
        h[j * n + i] = pred + d[j * n + i];
      }
    }
    return h;
  }

  function decodeGrid(meta) {
    var bin = atob(meta.b64), len = bin.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(new Response(bytes).body.pipeThrough(new DecompressionStream("gzip")))
      .arrayBuffer()
      .then(function (buf) {
        var d = new Int16Array(buf);
        return {
          n: meta.n, h: undelta(d, meta.n),
          lat0: meta.lat0, lat1: meta.lat1, lon0: meta.lon0, lon1: meta.lon1,
          dLat: (meta.lat1 - meta.lat0) / (meta.n - 1),
          dLon: (meta.lon1 - meta.lon0) / (meta.n - 1)
        };
      });
  }

  /* Load the baked grids. Finest first, so the lookup can return on the first
     grid that covers the point. */
  function init() {
    var d = BFS.DemEGFF;
    return Promise.all([decodeGrid(d.airfield), decodeGrid(d.regional)])
      .then(function (g) { grids = g; ready = true; return g; });
  }

  function bilinear(g, lat, lon) {
    var fx = (lon - g.lon0) / g.dLon;
    var fy = (lat - g.lat0) / g.dLat;
    if (fx < 0 || fy < 0 || fx > g.n - 1.001 || fy > g.n - 1.001) return null;
    var x0 = fx | 0, y0 = fy | 0;
    var tx = fx - x0, ty = fy - y0;
    var h = g.h, n = g.n;
    var a = h[y0 * n + x0], b = h[y0 * n + x0 + 1];
    var c = h[(y0 + 1) * n + x0], e = h[(y0 + 1) * n + x0 + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + e * tx) * ty;
  }

  /* Value noise, for extrapolating beyond the baked coverage. Deterministic, so
     the same hill is in the same place every session. */
  function hash2(x, y) {
    var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return U.lerp(U.lerp(hash2(xi, yi), hash2(xi + 1, yi), u),
                  U.lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
  }
  function fbm(x, y) {
    var a = 0, amp = 1, f = 1;
    for (var i = 0; i < 4; i++) { a += vnoise(x * f, y * f) * amp; amp *= 0.5; f *= 2.1; }
    return a;
  }

  /* --------------------------------------------------------------- pavement */

  var _uv = new Float64Array(2);

  /* Signed distance from the paved area, in metres, negative inside. Returns
     null when nowhere near the airport, which is the common case and lets the
     caller skip the rest. */
  function pavementBlend(lat, lon) {
    var E = BFS.EGFF;
    E.toLocal(_uv, lat, lon);
    var u = _uv[0], v = _uv[1];

    /* Cheap reject: a box around everything paved, plus the blend margin. */
    if (u < -700 || u > E.length() + 700 || v < -400 || v > 800) return null;

    var L = E.length(), halfW = E.RWY.width / 2;

    /* Distance outside the runway rectangle. */
    var du = Math.max(0, Math.max(-u, u - L));
    var dv = Math.max(0, Math.abs(v) - halfW);
    var dRwy = Math.hypot(du, dv);

    /* Distance outside the apron rectangle. */
    var A = E.APRON;
    var au = Math.max(0, Math.max(A.u0 - u, u - A.u1));
    var av = Math.max(0, Math.max(A.v0 - v, v - A.v1));
    var dApron = Math.hypot(au, av);

    /* Distance to the taxiway centrelines. */
    var dTaxi = 1e9;
    for (var i = 0; i < E.TAXIWAYS.length; i++) {
      var tw = E.TAXIWAYS[i], p = tw.pts;
      for (var j = 0; j + 1 < p.length; j++) {
        var d = segDist(u, v, p[j][0], p[j][1], p[j + 1][0], p[j + 1][1]) - tw.width / 2;
        if (d < dTaxi) dTaxi = d;
      }
    }
    dTaxi = Math.max(0, dTaxi);

    var d = Math.min(dRwy, dApron, dTaxi);
    return { d: d, u: u, v: v };
  }

  function segDist(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? U.clamp((wx * vx + wy * vy) / len2, 0, 1) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return Math.hypot(px - cx, py - cy);
  }

  /* --------------------------------------------------------------- lookup */

  var BLEND_M = 300;    // how far out the terrain is feathered into the pavement

  function terrainAt(lat, lon) {
    for (var i = 0; i < grids.length; i++) {
      var h = bilinear(grids[i], lat, lon);
      if (h !== null) return h;
    }
    /* Outside the baked coverage. Anchor on the nearest edge of the regional
       grid so there is no step at the boundary, then add fractal relief. */
    var g = grids[grids.length - 1];
    if (!g) return 0;
    var clat = U.clamp(lat, g.lat0, g.lat1 - g.dLat * 1.001);
    var clon = U.clamp(lon, g.lon0, g.lon1 - g.dLon * 1.001);
    var edge = bilinear(g, clat, clon) || 0;
    var far = Geo.distance(lat, lon, clat, clon);
    var t = U.clamp(far / 30000, 0, 1);
    var relief = (fbm(lon * 55, lat * 55) - 0.5) * 240 * t;
    return U.lerp(edge, Math.max(-40, edge + relief), t);
  }

  /* The public query. */
  function at(lat, lon) {
    if (!ready) return BFS.EGFF ? BFS.EGFF.ARP.elev : 0;

    var pv = pavementBlend(lat, lon);
    var terr = terrainAt(lat, lon);
    if (!pv) return terr;

    var pave = BFS.EGFF.pavementElev(pv.u, pv.v);
    if (pv.d <= 0) return pave;
    if (pv.d >= BLEND_M) return terr;
    /* Smoothstep rather than linear: the join has a continuous slope, so the
       aeroplane does not feel a ridge taxiing off the pavement. */
    return U.lerp(pave, terr, U.smoothstep(0, BLEND_M, pv.d));
  }

  /* Surface normal, by sampling. Used for shading and for how the aeroplane
     sits on a slope. */
  var _n = new Float64Array(3);
  function normalAt(lat, lon, step) {
    var s = step || 8;
    var dLat = s / 111320, dLon = s / (111320 * Math.cos(lat * U.DEG));
    var hx = at(lat, lon + dLon) - at(lat, lon - dLon);
    var hy = at(lat + dLat, lon) - at(lat - dLat, lon);
    var nx = -hx / (2 * s), ny = -hy / (2 * s);
    var inv = 1 / Math.hypot(nx, ny, 1);
    _n[0] = nx * inv; _n[1] = ny * inv; _n[2] = inv;
    return _n;
  }

  /* Is this point on something the aeroplane can taxi on? Drives rolling
     friction and, later, the difference between a taxiway and a field. */
  function surfaceAt(lat, lon) {
    var pv = pavementBlend(lat, lon);
    if (pv && pv.d <= 0) return "asphalt";
    return terrainAt(lat, lon) < 0.3 ? "water" : "grass";
  }

  return {
    init: init, at: at, normalAt: normalAt, surfaceAt: surfaceAt,
    terrainAt: terrainAt, pavementBlend: pavementBlend,
    isReady: function () { return ready; },
    grids: function () { return grids; }
  };
})();
