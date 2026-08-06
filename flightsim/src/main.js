/* main.js
   READS:  -
   WRITES: -
   TICK:   frame
   DEPS:   core/util, core/vecmat, core/geo, core/clock, core/state, ui/selftest */

/* Entry point: BFS.main(host).
 *
 * `host` comes from whichever shell loaded us — the built single file, dev.html,
 * or the sandbox harness — and carries the canvas, the boot overlay, and the
 * query parameters. Nothing above this line knows anything about the simulator.
 *
 * Phase 0 stands up the skeleton and nothing more: the clock, the state tree,
 * the WebGL2 context, resize and pixel-ratio handling, the click-to-start
 * gesture, and a diagnostic overlay that makes the loop's behaviour visible.
 * There is deliberately no aircraft yet.
 */

BFS.main = function (host) {
  "use strict";

  var U = BFS.Util, V = BFS.V, Geo = BFS.Geo;

  var params = host.params || new URLSearchParams("");
  var overlay = host.overlay, message = host.message, button = host.button;

  /* ---------------------------------------------------------------- selftest */
  if (params.get("selftest")) {
    return BFS.SelfTest.runAsync().then(function (r) { BFS.SelfTest.render(r, overlay); });
  }

  /* ------------------------------------------------------------------ canvas */
  var canvas = host.canvas;
  var gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,               // graphics are not the priority; frame time is
    depth: true,
    stencil: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false
  });
  if (!gl) {
    message.textContent = "This browser could not create a WebGL2 context, which " +
      "Bing Flight Simulator needs. Try a different browser, or check that hardware " +
      "acceleration is enabled.";
    button.style.display = "none";
    return Promise.resolve();
  }

  var renderScale = 1;              // driven by the frame-time watchdog
  var viewW = 1, viewH = 1;

  function resize() {
    var w = canvas.clientWidth | 0, h = canvas.clientHeight | 0;
    if (!w || !h) return false;     // minimised: skip the frame rather than divide by zero
    var dpr = Math.min(window.devicePixelRatio || 1, 2) * renderScale;
    var bw = Math.max(1, Math.round(w * dpr)), bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw; canvas.height = bh;
    }
    viewW = bw; viewH = bh;
    return true;
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  /* --------------------------------------------------------- clock and state */
  var clock = new BFS.Clock.Clock();
  var sim = BFS.State.create();

  /* Cardiff Airport, stand 7. The airport model and the real stand survey land
     in Phase 1 (data/egff.js); until then this is the aerodrome reference point
     with the published elevation, which is enough to exercise the frame. */
  var SPAWN = { lat: 51.396702, lon: -3.343330, alt: 67.1, hdg: 30 };
  BFS.State.placeAt(sim, SPAWN.lat, SPAWN.lon, SPAWN.alt, SPAWN.hdg);

  /* The render frame. Everything the GPU sees is metres from this origin, and it
     rebases when the aircraft gets far enough away that float32 would start to
     matter. */
  var frame = new Geo.Frame(SPAWN.lat, SPAWN.lon, SPAWN.alt);
  var rebases = 0;

  function updateFrame() {
    frame.geodeticToEnu(sim.truth.enu, sim.truth.geo[0], sim.truth.geo[1], sim.truth.geo[2]);
    var d = Math.hypot(sim.truth.enu[0], sim.truth.enu[1]);
    if (d > Geo.REBASE_M) {
      frame.setOrigin(sim.truth.geo[0], sim.truth.geo[1], frame.h);
      frame.geodeticToEnu(sim.truth.enu, sim.truth.geo[0], sim.truth.geo[1], sim.truth.geo[2]);
      rebases++;
    }
  }
  updateFrame();

  /* ------------------------------------------------------------------- input */
  var keys = Object.create(null);

  /* Bind no Ctrl/Alt/Meta combination anywhere in the simulator. Inside
     WinClone those belong to the host — and to the browser above it. */
  function isOurs(e) { return !e.ctrlKey && !e.altKey && !e.metaKey; }

  window.addEventListener("keydown", function (e) {
    if (!isOurs(e)) return;
    keys[e.code] = true;
    if (e.code === "KeyP") clock.togglePause();
    if (e.code === "F8") { frame.setOrigin(sim.truth.geo[0], sim.truth.geo[1], frame.h); rebases++; }
    if (e.code === "Backquote") debugOn = !debugOn;
    if (e.code === "Space" || e.code.slice(0, 5) === "Arrow") e.preventDefault();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });

  /* --------------------------------------------------------------- debug HUD */
  var debugOn = params.get("debug") !== "0";
  var hud = document.createElement("div");
  hud.style.cssText =
    "position:absolute;left:8px;top:8px;z-index:6;font:11px/1.55 Consolas,monospace;" +
    "color:#9fb0c0;background:rgba(6,10,16,.66);padding:7px 10px;border-radius:2px;" +
    "white-space:pre;pointer-events:none";
  canvas.parentNode.appendChild(hud);

  var pill = host.pill;
  function notice(text) {
    if (!pill) return;
    pill.textContent = text;
    pill.style.display = text ? "block" : "none";
  }

  if (!U.safeStorage.persistent) {
    notice("No persistent storage in this window — settings and progress are not saved");
  }

  /* ------------------------------------------------------------------- loop */
  var running = false;

  function stepSim() {
    /* Phase 0 has no dynamics. The tick still advances so that the decimation
       schedule, the frame rebasing and the substep cap are all exercised — the
       three things most likely to be quietly wrong when physics does arrive. */
    sim.t = clock.t;
    updateFrame();
  }

  function render() {
    gl.viewport(0, 0, viewW, viewH);
    /* A plain horizon wash, so the window is not simply black while the renderer
       is still to be written. */
    gl.clearColor(0.055, 0.075, 0.105, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  function tuneQuality() {
    /* Adaptivity lives with the renderer, not the clock. The sim step is cheap;
       when frames get long it is pixels that must give. */
    if (clock.load > 1.35 && renderScale > 0.5) { renderScale = Math.max(0.5, renderScale - 0.1); resize(); }
    else if (clock.load < 0.7 && renderScale < 1) { renderScale = Math.min(1, renderScale + 0.05); resize(); }
  }

  function drawHud() {
    if (!debugOn) { hud.style.display = "none"; return; }
    hud.style.display = "block";
    var g = sim.truth.geo, e = sim.truth.enu;
    hud.textContent =
      "BING FLIGHT SIMULATOR — phase 0 skeleton\n" +
      "fps    " + clock.fps.toFixed(0).padStart(5) +
      "   frame " + clock.frameMs.mean().toFixed(1) + " ms" +
      "   load " + (clock.load * 100).toFixed(0) + "%\n" +
      "sim t  " + clock.t.toFixed(1).padStart(5) + " s" +
      "   tick " + clock.tick + "   dropped " + clock.dropped.toFixed(2) + " s\n" +
      "scale  " + renderScale.toFixed(2) + "   buffer " + viewW + "x" + viewH +
      "   dpr " + (window.devicePixelRatio || 1) + "\n" +
      "pos    " + g[0].toFixed(6) + ", " + g[1].toFixed(6) + "  " + g[2].toFixed(1) + " m\n" +
      "enu    " + e[0].toFixed(1) + ", " + e[1].toFixed(1) + ", " + e[2].toFixed(1) +
      "   |xy| " + Math.hypot(e[0], e[1]).toFixed(1) + " m   rebases " + rebases + "\n" +
      "origin " + (window.origin === "null" ? "opaque (real sandbox)" : String(window.origin)) +
      "   storage " + U.safeStorage.kind + "\n" +
      (clock.paused ? "PAUSED (" + clock.pauseReason + ")   " : "") +
      "P pause  ` hud  F8 force rebase";
  }

  function loop(wallMs) {
    requestAnimationFrame(loop);
    if (!resize()) return;                 // zero-size window: nothing to do
    var steps = clock.beginFrame(wallMs);
    for (var i = 0; i < steps; i++) { clock.advance(); stepSim(); }
    tuneQuality();
    render();
    drawHud();
  }

  /* ------------------------------------------------------------------- start
     The click serves three purposes at once: it is the user gesture Web Audio
     requires, it puts keyboard focus inside the iframe (WinClone's own hotkeys
     live on the parent document and cannot reach us once we have focus), and it
     is the natural place to hang the pre-flight preset card in Phase 1. */
  message.innerHTML =
    "Phase 0 — engine skeleton.<br>" +
    "Clock, state tree, geodetic frame and WebGL2 context are up.";
  button.disabled = false;
  button.textContent = "CLICK TO START";

  return new Promise(function (resolve) {
    button.addEventListener("click", function start() {
      if (running) return;
      running = true;
      overlay.classList.add("gone");
      canvas.tabIndex = 0;
      canvas.focus();
      clock.bindVisibility(function (c) {
        notice(c.paused ? "Paused — " + c.pauseReason : "");
      });
      resize();
      requestAnimationFrame(loop);
      resolve();
    });
  });
};
