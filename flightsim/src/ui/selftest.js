/* ui/selftest.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util */

/* Boot-time assertions about the environment we are actually running in.
 *
 * The point is not to check the browser works. It is to detect the specific,
 * expensive mistake available here: developing against a friendlier environment
 * than the one the simulator ships into. dev.html runs same-origin, where
 * localStorage works and pointer lock is available; WinClone's HTML Viewer does
 * not. Code written against the former fails silently in the latter.
 *
 * So the expectations below are inverted from the usual: under the real sandbox,
 * localStorage MUST throw, pointer lock MUST be unavailable, and workers MUST
 * fail to construct. If this reports that storage works, you are not testing
 * what you think you are testing — check the harness before the code.
 *
 * Run it with ?selftest=1, or from the sandbox harness button.
 */

BFS.SelfTest = (function () {
  "use strict";

  function check(name, fn, expect) {
    var r;
    try { r = { ok: true, value: fn() }; }
    catch (e) { r = { ok: false, value: String(e && e.name || e) }; }
    return { name: name, threw: !r.ok, value: r.value, expect: expect };
  }

  /* Worker construction succeeding proves nothing — the blob URL can be accepted
     and the script then fail to execute. Only a round trip settles it, so this
     one check is asynchronous. Measured behaviour: current Chromium runs blob
     workers happily in an opaque origin, contrary to the older guidance that
     they are blocked there. That is why the simulator probes rather than assumes
     in either direction, and why the terrain decoder stays a pure function that
     works on the main thread regardless. */
  function probeWorker() {
    return new Promise(function (resolve) {
      var url, w;
      var done = function (v) {
        if (!url) return;
        try { w && w.terminate(); URL.revokeObjectURL(url); } catch (e) { /* gone */ }
        url = null;
        resolve(v);
      };
      try {
        url = URL.createObjectURL(new Blob(
          ["self.onmessage=function(e){self.postMessage(e.data*2)}"],
          { type: "text/javascript" }));
        w = new Worker(url);
        w.onmessage = function (e) {
          done({ name: "Worker(blob:)", threw: false,
                 value: e.data === 42 ? "constructed and round-tripped" : "replied oddly",
                 expect: "usable here — but the terrain decoder must still work without it" });
        };
        w.onerror = function () {
          done({ name: "Worker(blob:)", threw: true, value: "script failed to run",
                 expect: "decode stays on the main thread" });
        };
        w.postMessage(21);
        setTimeout(function () {
          done({ name: "Worker(blob:)", threw: true, value: "constructed but never replied",
                 expect: "decode stays on the main thread" });
        }, 1200);
      } catch (e) {
        done({ name: "Worker(blob:)", threw: true, value: String(e.name || e),
               expect: "decode stays on the main thread" });
      }
    });
  }

  function run() {
    var results = [];

    /* --- the sandbox fingerprint --- */

    results.push(check("localStorage", function () {
      window.localStorage.setItem("__bfs__", "1");
      window.localStorage.removeItem("__bfs__");
      return "readable and writable";
    }, "should THROW under WinClone (opaque origin)"));

    results.push(check("indexedDB", function () {
      if (!window.indexedDB) return "absent";
      window.indexedDB.open("__bfs__");
      return "openable";
    }, "should THROW or be absent under WinClone"));

    results.push(check("pointer lock", function () {
      return document.body.requestPointerLock ? "API present" : "API absent";
    }, "API may exist but the request is denied — never rely on it"));

    results.push(check("fullscreen", function () {
      return document.fullscreenEnabled ? "enabled" : "disabled";
    }, "should be DISABLED — no allowfullscreen on the iframe"));

    results.push(check("origin", function () {
      return String(window.origin || location.origin);
    }, '"null" under WinClone'));

    /* --- capabilities the simulator genuinely depends on --- */

    results.push(check("DecompressionStream", function () {
      if (typeof DecompressionStream !== "function") throw new Error("missing");
      return "available";
    }, "REQUIRED — the payload is gzipped"));

    results.push(check("fetch cross-origin", function () {
      return typeof fetch === "function" ? "available" : "missing";
    }, "REQUIRED for terrain, though the sim flies without it"));

    results.push(check("createImageBitmap", function () {
      return typeof createImageBitmap === "function" ? "available" : "missing";
    }, "REQUIRED — off-thread PNG decode for elevation tiles"));

    results.push(check("OffscreenCanvas", function () {
      return typeof OffscreenCanvas === "function" ? "available" : "missing";
    }, "preferred; a plain canvas is the fallback"));

    results.push(check("WebGL2", function () {
      var c = document.createElement("canvas");
      var gl = c.getContext("webgl2", { antialias: false });
      if (!gl) throw new Error("no context");
      var dbg = gl.getExtension("WEBGL_debug_renderer_info");
      var name = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "renderer hidden";
      return name + " | max texture " + gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }, "REQUIRED"));

    results.push(check("devicePixelRatio", function () {
      return String(window.devicePixelRatio) + " @ " +
             window.innerWidth + "x" + window.innerHeight;
    }, "informational — 760x526 is the default WinClone window body"));

    return results;
  }

  /* The full sweep: the synchronous checks, plus the worker round trip. */
  function runAsync() {
    var results = run();
    return probeWorker().then(function (w) {
      results.splice(2, 0, w);
      return results;
    });
  }

  /* Renders into the boot overlay. Deliberately plain: this screen is read when
     something is already wrong. */
  function render(results, into) {
    var opaque = results.find(function (r) { return r.name === "origin"; });
    var isSandboxed = opaque && opaque.value === "null";
    var storage = results.find(function (r) { return r.name === "localStorage"; });

    var rows = results.map(function (r) {
      var mark = r.threw ? "THREW" : "ok";
      var colour = r.threw ? "#d9a441" : "#7fb069";
      return '<tr><td style="color:#8b97a3;padding:2px 12px 2px 0">' + r.name +
             '</td><td style="color:' + colour + ';padding-right:12px">' + mark +
             '</td><td style="color:#c8d2dd">' + String(r.value).slice(0, 90) +
             '</td><td style="color:#5c6875;padding-left:12px">' + r.expect + "</td></tr>";
    }).join("");

    var verdict = isSandboxed
      ? '<div style="color:#7fb069">Opaque origin confirmed — this is the real WinClone environment.</div>'
      : '<div style="color:#d9a441">Origin is <b>' + (opaque ? opaque.value : "?") +
        "</b>, not <b>null</b>. This is NOT the sandbox WinClone uses.<br>" +
        "Results below are from a more permissive environment. Use sandbox.html " +
        "before trusting anything about storage, workers or pointer lock.</div>";

    if (!storage.threw && isSandboxed) {
      verdict += '<div style="color:#e0574a;margin-top:6px">localStorage is writable in an ' +
                 "opaque origin, which should be impossible. The harness is wrong.</div>";
    }

    into.innerHTML =
      '<div style="text-align:left;font-size:11px;line-height:1.6;max-width:100%;overflow:auto">' +
      '<div style="font-size:14px;letter-spacing:.2em;color:#e8eef5;margin-bottom:10px">' +
      "BING FLIGHT SIMULATOR — SELF TEST</div>" + verdict +
      '<table style="margin-top:12px;border-collapse:collapse">' + rows + "</table></div>";
  }

  return { run: run, runAsync: runAsync, probeWorker: probeWorker, render: render };
})();
