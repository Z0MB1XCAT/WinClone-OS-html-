/* core/util.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   - */

BFS.Util = (function () {
  "use strict";

  var TAU = Math.PI * 2, DEG = Math.PI / 180, RAD = 180 / Math.PI;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function invLerp(a, b, v) { return b === a ? 0 : (v - a) / (b - a); }
  function smoothstep(e0, e1, x) { var t = clamp(invLerp(e0, e1, x), 0, 1); return t * t * (3 - 2 * t); }
  function sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; }

  /* Shortest signed difference between two angles, radians. */
  function wrapPi(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
  function wrap2Pi(a) { a %= TAU; return a < 0 ? a + TAU : a; }
  function wrap360(d) { d %= 360; return d < 0 ? d + 360 : d; }

  /* Move `cur` toward `target` at no more than `rate` units per second. Used
     everywhere an actuator has a maximum slew rate — which, once hydraulics
     exist, is how loss of pressure shows up in the flight model. */
  function rateLimit(cur, target, rate, dt) {
    var d = target - cur, m = rate * dt;
    return d > m ? cur + m : d < -m ? cur - m : target;
  }

  /* First-order lag. `tau` is the time constant in seconds; the exponential form
     is used rather than the Euler approximation so behaviour does not change
     when the tick rate does. */
  function lag(cur, target, tau, dt) {
    if (tau <= 0) return target;
    return target + (cur - target) * Math.exp(-dt / tau);
  }

  /* Linear interpolation into a table of [x, y] pairs sorted by x. Clamps at
     both ends rather than extrapolating. */
  function lut(table, x) {
    var n = table.length;
    if (x <= table[0][0]) return table[0][1];
    if (x >= table[n - 1][0]) return table[n - 1][1];
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (table[mid][0] > x) hi = mid; else lo = mid; }
    var a = table[lo], b = table[hi];
    return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }

  /* mulberry32 — small, fast, and deterministic, which matters because terrain
     detail and turbulence must look identical on every machine. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Fixed-capacity ring buffer of numbers, for frame-time and rate statistics. */
  function Ring(n) {
    this.buf = new Float64Array(n); this.n = n; this.i = 0; this.count = 0;
  }
  Ring.prototype.push = function (v) {
    this.buf[this.i] = v; this.i = (this.i + 1) % this.n;
    if (this.count < this.n) this.count++;
  };
  Ring.prototype.mean = function () {
    if (!this.count) return 0;
    var s = 0; for (var i = 0; i < this.count; i++) s += this.buf[i];
    return s / this.count;
  };
  Ring.prototype.max = function () {
    var m = -Infinity; for (var i = 0; i < this.count; i++) if (this.buf[i] > m) m = this.buf[i];
    return this.count ? m : 0;
  };

  /* ---------------------------------------------------------------- storage
     The simulator runs inside WinClone's HTML Viewer, whose iframe is sandboxed
     without allow-same-origin. That gives the document an opaque origin, and in
     an opaque origin *touching* localStorage throws SecurityError — reading the
     property, not just calling a method. So there is no persistence, at all.

     This is the only place in the codebase permitted to reference localStorage.
     Everything else goes through safeStorage, which falls back to a Map that
     dies with the window. Keeping that fact in exactly one file is what stops
     it being rediscovered painfully somewhere else later. */
  var safeStorage = (function () {
    var backing = null, kind = "memory", mem = new Map();
    try {
      var probe = window.localStorage;
      probe.setItem("__bfs_probe__", "1");
      probe.removeItem("__bfs_probe__");
      backing = probe; kind = "localStorage";
    } catch (e) { backing = null; kind = "memory"; }

    return {
      kind: kind,
      persistent: kind === "localStorage",
      get: function (k, dflt) {
        try {
          var v = backing ? backing.getItem(k) : (mem.has(k) ? mem.get(k) : null);
          return v == null ? (dflt === undefined ? null : dflt) : v;
        } catch (e) { return dflt === undefined ? null : dflt; }
      },
      set: function (k, v) {
        try { if (backing) backing.setItem(k, String(v)); else mem.set(k, String(v)); return true; }
        catch (e) { mem.set(k, String(v)); return false; }
      },
      getJSON: function (k, dflt) {
        var raw = this.get(k, null);
        if (raw == null) return dflt;
        try { return JSON.parse(raw); } catch (e) { return dflt; }
      },
      setJSON: function (k, v) { return this.set(k, JSON.stringify(v)); }
    };
  })();

  function fmtBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }

  return {
    TAU: TAU, DEG: DEG, RAD: RAD,
    clamp: clamp, lerp: lerp, invLerp: invLerp, smoothstep: smoothstep, sign: sign,
    wrapPi: wrapPi, wrap2Pi: wrap2Pi, wrap360: wrap360,
    rateLimit: rateLimit, lag: lag, lut: lut,
    rng: rng, Ring: Ring,
    safeStorage: safeStorage, fmtBytes: fmtBytes
  };
})();
