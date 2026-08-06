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

const server = createServer((req, res) => {
  const params = req.url.includes("selftest") ? "selftest=1" : "";
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(hostPage(build, params));
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
  await page.goto(`${base}/?selftest`, { waitUntil: "load" });
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
  }, null, { timeout: 15000 });
  t("payload decompressed and evaluated",
    await g.evaluate(() => !!(window.BFS && typeof window.BFS.main === "function")),
    "gzip -> base64 -> new Function survived the strip pass");

  await g.click("#go");
  await g.waitForFunction(() => document.getElementById("ovl").classList.contains("gone"),
                          null, { timeout: 5000 });

  /* Let the loop actually run, then confirm simulated time advanced. */
  await new Promise((r) => setTimeout(r, 1500));
  const hud = await g.evaluate(() => {
    const d = [...document.querySelectorAll("div")].find((n) => n.textContent.startsWith("BING FLIGHT SIMULATOR — phase"));
    return d ? d.textContent : "";
  });
  const simT = parseFloat((hud.match(/sim t\s+([\d.]+)/) || [])[1] || "0");
  const fps = parseFloat((hud.match(/fps\s+(\d+)/) || [])[1] || "0");
  t("simulation clock advances", simT > 0.5, `sim t = ${simT.toFixed(2)} s`);
  t("render loop runs", fps > 0, `${fps} fps (software GL in CI)`);

  /* The dt clamp: a long stall must not be integrated. */
  const dropped = parseFloat((hud.match(/dropped ([\d.]+)/) || [])[1] || "0");
  t("no runaway backlog", dropped < 5, `${dropped.toFixed(2)} s discarded`);

  t("no console errors", consoleErrors.length === 0,
    consoleErrors.slice(0, 3).join(" | ") || "clean");
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length ? 1 : 0);
