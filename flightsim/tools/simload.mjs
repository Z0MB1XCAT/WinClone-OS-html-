/* Loads simulator modules into Node so the physics can be tested without a
 * browser.
 *
 * Every source file is `BFS.Name = (function(){ … })()` with no top-level side
 * effects, which is exactly what makes this possible: give the modules a `BFS`
 * to hang themselves off and a `window` to find it on, evaluate them in order,
 * and the whole simulation core is available as plain objects.
 *
 * Only the modules that touch no DOM can be loaded this way — core, sim, and
 * the parts of av and sys that are pure logic. That is the whole flight model,
 * which is the part worth testing numerically.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/* The flight model and everything under it. Order matters only in that a module
   must be able to see its dependencies when its factory runs. */
export const PHYSICS = [
  "core/util.js",
  "core/vecmat.js",
  "core/geo.js",
  "core/state.js",
  "sim/a320_config.js",
  "sim/atmos.js",
  "sim/aero_strips.js",
  "sim/massbalance.js",
  "sim/rigidbody.js",
  "sim/engine_cfm56.js",
  "sys/flightcontrols.js",
  "av/adirs.js"
];

export function loadSim(files = PHYSICS) {
  const sandbox = { console, Math, Date, JSON, Object, Array, Float64Array,
                    Float32Array, Int16Array, Uint8Array, Uint16Array, Uint32Array,
                    isNaN, isFinite, parseFloat, parseInt, String, Number, Boolean,
                    Error, RegExp, Promise, atob: (s) => Buffer.from(s, "base64").toString("binary") };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.BFS = {};
  sandbox.window.BFS = sandbox.BFS;
  const ctx = vm.createContext(sandbox);

  for (const f of files) {
    const src = readFileSync(join(ROOT, "src", f), "utf8");
    try {
      vm.runInContext(src, ctx, { filename: "src/" + f });
    } catch (e) {
      throw new Error(`while loading src/${f}: ${e.message}`);
    }
  }
  return sandbox.BFS;
}

/* A tiny assertion helper shared by the test scripts. */
export function makeReporter() {
  const results = [];
  const t = (name, ok, detail = "") => {
    results.push({ name, ok });
    console.log(`  ${ok ? "pass" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  };
  /* Most checks here are "is this number close enough to the real aeroplane",
     so the tolerance is part of the assertion rather than an afterthought. */
  t.near = (name, got, want, tol, unit = "") => {
    const ok = Math.abs(got - want) <= tol;
    t(name, ok, `${got.toFixed(2)}${unit} against ${want}${unit} ±${tol}`);
    return ok;
  };
  t.done = () => {
    const bad = results.filter((r) => !r.ok).length;
    console.log(`\n  ${results.length - bad}/${results.length} passed\n`);
    return bad;
  };
  return t;
}
