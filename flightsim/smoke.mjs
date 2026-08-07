#!/usr/bin/env node
/* Bing Flight Simulator — headless smoke test.
 *
 *   node flightsim/smoke.mjs
 *
 * Loads the built file the way WinClone loads it — assigned to the `srcdoc` of
 * an iframe sandboxed with exactly `allow-scripts allow-modals allow-popups` —
 * and checks that it boots and keeps running in an opaque origin.
 *
 * srcdoc, not src, is the whole point. Pointing src at a served file would give
 * the frame a real origin, localStorage would work, and the test would pass on a
 * build that breaks the moment it is imported for real.
 *
 * Playwright is used only as a browser driver; there is no test framework and no
 * dependency added to the simulator itself.
 */
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

/* Playwright is a developer tool here, not a dependency of the simulator, so it
   may only be installed globally. ESM ignores NODE_PATH, hence the manual walk. */
async function loadPlaywright() {
  let mod = null;
  try { mod = await import("playwright"); } catch (e) { /* fall through to the global install */ }
  if (!mod) {
    let root = "";
    try { root = execSync("npm root -g", { encoding: "utf8" }).trim(); } catch (e) { /* none */ }
    const p = root && join(root, "playwright", "index.js");
    if (p && existsSync(p)) mod = await import(pathToFileURL(p).href);
  }
  /* A CommonJS playwright imported from ESM arrives entirely under `default`. */
  const api = mod && (mod.chromium ? mod : mod.default);
  if (!api || !api.chromium) {
    console.error("\n  playwright not found. Install it with:  npm i -g playwright\n" +
                  "  (Chromium itself is already present at " +
                  (process.env.PLAYWRIGHT_BROWSERS_PATH || "the default location") + ")\n");
    process.exit(2);
  }
  return api;
}
const { chromium } = await loadPlaywright();

const ROOT = dirname(fileURLToPath(import.meta.url));
const SANDBOX = "allow-scripts allow-modals allow-popups";

const results = [];
const t = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

/* JSON.stringify does not escape "/", so a document containing "</script>" ends
   the very script tag it is being embedded in. Break the sequence. */
const jsString = (s) => JSON.stringify(s).replace(/<\//g, "<\\/");

/* A page whose only job is to host the sandboxed frame. Served over http so the
   parent has a real origin and the child, via srcdoc, does not. */
function hostPage(buildHtml, params) {
  const injected = params
    ? buildHtml.replace('<meta charset="utf-8">',
        `<meta charset="utf-8">\n<script>window.__BFS_PARAMS__=${jsString(params)}<\/script>`)
    : buildHtml;
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;height:100%;background:#111}
    iframe{display:block;border:0;width:760px;height:526px}</style>
    <iframe id="f" sandbox="${SANDBOX}"></iframe>
    <script>
      document.getElementById("f").srcdoc = ${jsString(injected)};
    <\/script>`;
}

const onDisk = readFileSync(join(ROOT, "BingFlightSimulator.html"), "utf8");

/* WinClone does not hand the file to the iframe. It stores it as a string in a
   JSON blob in localStorage (saveFS, app.js:7741), reads it back, and assigns
   that to srcdoc. Run the whole test against the round-tripped text, so any
   character that does not survive being stringified and parsed shows up here
   rather than after import. */
const build = JSON.parse(JSON.stringify(onDisk));
t("survives the localStorage JSON round trip", build === onDisk,
  `${(JSON.stringify(onDisk).length / 1024).toFixed(1)} KB of WinClone's quota`);

/* A srcdoc document has no query string of its own, so whatever the test asks
   for on the outer URL is injected into the inner document as a global that the
   shell reads in place of location.search. */
const server = createServer((req, res) => {
  const q = (req.url.split("?")[1] || "").replace(/^&+/, "");
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(hostPage(build, q));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({
  executablePath: process.env.BFS_CHROMIUM || undefined,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

try {
  /* ------------------------------------------------ 1. selftest / fingerprint */
  await page.goto(`${base}/?selftest=1`, { waitUntil: "load" });
  const f = page.frames().find((fr) => fr !== page.mainFrame());
  await f.waitForFunction(() => document.body.innerText.includes("SELF TEST"), null,
                          { timeout: 15000 });
  const report = await f.evaluate(() => document.body.innerText);

  t("frame origin is opaque", await f.evaluate(() => String(window.origin)) === "null",
    "srcdoc + sandbox without allow-same-origin");
  t("localStorage throws", /localStorage\s+THREW/.test(report),
    "no persistence — as designed");
  /* Not a pass/fail: blob workers are usable in current Chromium's opaque origin
     even though older guidance says otherwise. Recorded so a future regression
     is visible, never depended on. */
  console.log("  note  blob worker in opaque origin: " +
    (/Worker\(blob:\)\s+ok/.test(report) ? "usable" : "unavailable") +
    "  — terrain decode works either way");
  t("DecompressionStream available", /DecompressionStream\s+ok/.test(report),
    "the payload is gzipped");
  t("WebGL2 available", /WebGL2\s+ok/.test(report));

  /* ---------------------------------------------------- 2. real boot and loop */
  await page.goto(base, { waitUntil: "load" });
  const g = page.frames().find((fr) => fr !== page.mainFrame());

  await g.waitForFunction(() => {
    const b = document.getElementById("go");
    return b && !b.disabled;
  }, null, { timeout: 20000 });
  t("payload decompressed and evaluated",
    await g.evaluate(() => !!(window.BFS && typeof window.BFS.main === "function")),
    "gzip -> base64 -> new Function survived the strip pass");

  await g.click("#go");
  await g.waitForFunction(() => document.getElementById("ovl").classList.contains("gone"),
                          null, { timeout: 5000 });

  const readHud = () => g.evaluate(() => {
    const d = [...document.querySelectorAll("div")]
      .find((n) => n.textContent.startsWith("BING FLIGHT SIMULATOR "));
    return d ? d.textContent : "";
  });
  const num = (s, re) => parseFloat((s.match(re) || [])[1] || "NaN");

  await new Promise((r) => setTimeout(r, 1500));
  let hud = await readHud();
  t("render loop runs", num(hud, /SIMULATOR\s+(\d+) fps/) > 0, "software GL in CI");
  t("sits level at the stand", Math.abs(num(hud, /PITCH\s+(-?[\d.]+)/)) < 1.5,
    `pitch ${num(hud, /PITCH\s+(-?[\d.]+)/).toFixed(1)} deg`);
  t("centre of gravity is inside the envelope",
    num(hud, /CG\s+(-?[\d.]+)%/) > 15 && num(hud, /CG\s+(-?[\d.]+)%/) < 41,
    `${num(hud, /CG\s+(-?[\d.]+)%/).toFixed(1)}% MAC`);

  /* ------------------------------------------------------------ 3. take off
     The acceptance test for this phase. Starting at the stand and applying
     take-off thrust proves nothing — the aeroplane faces the terminal — so this
     boots lined up on runway 12. */
  await page.goto(`${base}/?preset=lineup&wind=0&turb=0`, { waitUntil: "load" });
  const h = page.frames().find((fr) => fr !== page.mainFrame());
  await h.waitForFunction(() => {
    const b = document.getElementById("go");
    return b && !b.disabled;
  }, null, { timeout: 20000 });
  await h.click("#go");
  await h.waitForFunction(() => document.getElementById("ovl").classList.contains("gone"),
                          null, { timeout: 5000 });

  const key = (code, down = true) => h.evaluate(
    ([c, d]) => window.dispatchEvent(new KeyboardEvent(d ? "keydown" : "keyup", { code: c })),
    [code, down]);
  const tap = async (code) => { await key(code, true); await key(code, false); };

  const readHud2 = () => h.evaluate(() => {
    const d = [...document.querySelectorAll("div")]
      .find((n) => n.textContent.startsWith("BING FLIGHT SIMULATOR "));
    return d ? d.textContent : "";
  });

  /* The lineup preset already has the brake released, so KeyB — which toggles —
     would set it. Check the state rather than assuming either way. */
  await new Promise((r) => setTimeout(r, 1200));   // let a frame populate the HUD
  const lined = await readHud2();
  t("starts lined up on the runway",
    Math.abs(num(lined, /HDG\s+(\d+)/) - 117) < 12 && /ON GROUND/.test(lined),
    `heading ${num(lined, /HDG\s+(\d+)/)}, runway 12 is 117 true`);

  await tap("BracketRight");  // flaps 1
  await tap("Backslash");     // thrust to TOGA

  /* Roll until rotation speed, then rotate. Wall-clock is used as the timeout
     rather than the yardstick — under software rendering the simulation runs
     slower than real time, and what is being tested is the aeroplane, not the
     frame rate. */
  let vr = false, ias = 0, rollStart = Date.now();
  while (Date.now() - rollStart < 90000) {
    await new Promise((r) => setTimeout(r, 500));
    ias = num(await readHud2(), /IAS\s+(-?[\d.]+) kt/);
    if (ias >= 140) { vr = true; break; }
  }
  t("accelerates to rotation speed", vr, `${ias.toFixed(0)} kt on the runway`);

  if (vr) {
    const alt0 = num(await readHud2(), /ALT\s+(-?[\d.]+)/);

    await key("ArrowUp", true);              // rotate — a nudge, not a heave
    await new Promise((r) => setTimeout(r, 700));
    await key("ArrowUp", false);

    /* Fly it for a while, standing in for the pilot with a crude pitch hold.
       There is no auto-trim in Phase 1 — the aeroplane is in direct law, and
       the engines sit below the centre of gravity, so full thrust pitches the
       nose up and somebody has to hold it. That is correct behaviour, not a
       defect, but it does mean the test cannot simply let go of the stick. */
    let climbed = false, air = "";
    const flyStart = Date.now();
    while (Date.now() - flyStart < 45000) {
      await new Promise((r) => setTimeout(r, 1500));
      air = await readHud2();
      const pitch = num(air, /PITCH\s+(-?[\d.]+)/);
      if (pitch > 15) { await key("ArrowDown", true); await new Promise((r) => setTimeout(r, 200)); await key("ArrowDown", false); }
      else if (pitch < 8) { await key("ArrowUp", true); await new Promise((r) => setTimeout(r, 200)); await key("ArrowUp", false); }
      if (num(air, /ALT\s+(-?[\d.]+)/) - alt0 > 1000) { climbed = true; break; }
    }

    const gained = num(air, /ALT\s+(-?[\d.]+)/) - alt0;
    t("becomes airborne", /AIRBORNE/.test(air),
      `pitch ${num(air, /PITCH\s+(-?[\d.]+)/).toFixed(1)} deg`);
    t("climbs away", climbed, `${gained.toFixed(0)} ft gained`);
    t("still flying, not stalled", num(air, /IAS\s+(-?[\d.]+) kt/) > 110,
      `${num(air, /IAS\s+(-?[\d.]+) kt/).toFixed(0)} kt`);
    /* Directional stability with nothing on the rudder, which is what caught the
       asymmetric downwash that used to roll and yaw the aeroplane off the runway
       in dead calm — that failure was sixty degrees and climbing.
     *
     * The band is wide because this is a forty-five second climb flown by a
     * crude pitch-hold and nobody at all on the rudder or the ailerons; a slow
     * wander of a few degrees is a real aeroplane's behaviour, not a defect.
     * What it is testing for is departure, not perfection. */
    t("does not depart directionally",
      Math.abs(num(air, /HDG\s+(\d+)/) - 117) < 25,
      `heading ${num(air, /HDG\s+(\d+)/)} against 117 after an unattended climb`);

    /* Gear retraction — the visible half of the moving-parts work. */
    await tap("KeyG");
    await new Promise((r) => setTimeout(r, 5000));
    const gearPos = ((await readHud2()).match(/GEAR\s+([\d.]+)/) || [])[1];
    t("gear retracts", parseFloat(gearPos) < 0.9, `lever up, position ${gearPos}`);
  }

  t("no console errors", consoleErrors.length === 0,
    consoleErrors.slice(0, 3).join(" | ") || "clean");
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length ? 1 : 0);
