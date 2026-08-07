/* main.js
   READS:  -
   WRITES: sim.t, sim.ui
   TICK:   frame
   DEPS:   core/util, core/vecmat, core/geo, core/clock, core/state, ui/selftest,
           ui/input, gfx/scene, sim/atmos, sim/aero_strips, sim/rigidbody,
           sim/gear, sim/engine_cfm56, sim/massbalance, sys/flightcontrols,
           av/adirs, terrain/heightfield, data/egff */

/* Entry point, and the fixed tick order.
 *
 * The order below is not arbitrary and does not vary. Systems settle first, then
 * the sensors read the world, then the control laws act on what the sensors say,
 * then the actuators move, and only then does the flight model see anything. The
 * one-way flow is what keeps a simulator this size comprehensible: no stage can
 * see the output of a stage that runs after it, so there is never a question of
 * what order two things happened in within a step.
 */

BFS.main = function (host) {
  "use strict";

  var U = BFS.Util, V = BFS.V, Geo = BFS.Geo;

  var params = host.params || new URLSearchParams("");
  var overlay = host.overlay, message = host.message, button = host.button;
  var canvas = host.canvas;

  if (params.get("selftest")) {
    return BFS.SelfTest.runAsync().then(function (r) { BFS.SelfTest.render(r, overlay); });
  }

  var gl = canvas.getContext("webgl2", {
    alpha: false, antialias: false, depth: true, stencil: false,
    powerPreference: "high-performance", preserveDrawingBuffer: false
  });
  if (!gl) {
    message.textContent = "Bing Flight Simulator needs WebGL2, which this browser " +
      "could not provide. Check that hardware acceleration is enabled.";
    button.style.display = "none";
    return Promise.resolve();
  }

  /* ------------------------------------------------------------------ state */
  var clock = new BFS.Clock.Clock();
  var sim = BFS.State.create();
  var input = new BFS.Input.Input(canvas);
  var atmos = new BFS.Atmos.Atmosphere();
  var aero = new BFS.Aero.Aero();
  var body = new BFS.Body.RigidBody();
  var gear = new BFS.Gear.Gear();
  var engines = new BFS.Engine.Engines();
  var fctl = new BFS.FlightControls.FlightControls();
  var adirs = new BFS.ADIRS.ADIRS();
  sim._fctl = fctl;

  var scene = null, frame = null, rebases = 0;
  var renderScale = 1, viewW = 1, viewH = 1;

  function resize() {
    var w = canvas.clientWidth | 0, h = canvas.clientHeight | 0;
    if (!w || !h) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2) * renderScale;
    var bw = Math.max(1, Math.round(w * dpr)), bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    viewW = bw; viewH = bh;
    return true;
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  /* ------------------------------------------------------------------ spawn */

  /* Cold and dark is the default the moment there are systems to power up. Until
     the electrical and hydraulic models land in Phase 3 there is nothing to
     switch on, so Phase 1 starts at the stand with the engines running — the
     honest version of "ready to taxi" rather than a cold-and-dark screen with no
     cold-and-dark behind it. */
  var PRESETS = {
    turnaround: { name: "At the gate", engines: true, alt: 0 },
    lineup: { name: "Lined up RWY 12", engines: true, lineup: true },
    approach: { name: "Short final RWY 30", engines: true, approach: true }
  };

  function applyPreset(key) {
    var p = PRESETS[key] || PRESETS.turnaround;
    sim.preset = key;
    var E = BFS.EGFF;

    if (p.lineup) {
      var g = new Float64Array(2);
      E.toGeo(g, E.RWY.displaced[0] + 40, 0);
      BFS.State.placeAt(sim, g[0], g[1], E.runwayElev(E.RWY.displaced[0] + 40) + 3.1,
                        E.bearing());
      sim.ctl.parkBrake = false;
      sim.ctl.flapLever = 1;
    } else if (p.approach) {
      /* Eight kilometres out on the extended centreline for runway 30, on a
         three-degree path, at the speed and configuration that implies. */
      var thr = E.THR30, crs = U.wrap360(E.bearing() + 180);
      var pt = new Float64Array(2);
      Geo.destination(pt, thr.lat, thr.lon, U.wrap360(crs + 180), 8000);
      BFS.State.placeAt(sim, pt[0], pt[1], thr.elev + 8000 * Math.tan(3 * U.DEG), crs);
      sim.ctl.parkBrake = false;
      sim.ctl.gearLever = 1;
      sim.ctl.flapLever = 4;
      sim.surf.flap = 35; sim.surf.slat = 27;
      /* Established on the glidepath, and genuinely in trim.
       *
       * The attitude, the stabiliser setting and the thrust are solved for
       * rather than guessed. Guessing does not work — the answer depends on
       * weight, speed, flap setting and centre of gravity simultaneously, and
       * the hand-picked numbers this replaced put the aeroplane on short final
       * descending at five thousand feet a minute. */
      BFS.MassBalance.init(sim, { fuel: 5200, payload: 13500 });
      var vs = BFS.Trim.stallSpeed({ mass: sim.mass.m, alt: thr.elev,
                                     flap: 35, slat: 27 });
      var vapp = vs * 1.23;
      var tr = BFS.Trim.solve({
        mass: sim.mass.m, alt: thr.elev + 244, speed: vapp, gamma: -3 * U.DEG,
        flap: 35, slat: 27, gear: 1, settle: 120
      });
      var body = tr.pitch;
      V.qFromEuler(sim.truth.quat, 0, body, crs * U.DEG);
      V.set3(sim.truth.vBody, vapp * Math.cos(tr.alpha), 0,
                              vapp * Math.sin(tr.alpha));
      sim.ctl.thrust[0] = sim.ctl.thrust[1] = U.clamp(tr.thrustFrac, 0, 1);
      fctl.thsTrim = tr.ths;
    } else {
      var s = E.spawn("7");
      BFS.State.placeAt(sim, s.lat, s.lon, s.elev + 3.05, s.hdg);
      sim.ctl.parkBrake = true;
    }

    BFS.MassBalance.init(sim, { fuel: 5200, payload: 13500 });

    for (var i = 0; i < 2; i++) {
      var e = sim.sys.eng[i];
      e.master = !!p.engines;
      e.running = !!p.engines;
      e.lit = !!p.engines;
      if (p.engines) {
        e.n1 = BFS.A320.C.n1Idle; e.n2 = BFS.A320.C.n2Idle;
        e.egt = 380; e.oilPsi = 78;
      }
    }
    sim.sys.gear.pos = [1, 1, 1];
    sim.ctl.groundSpoilers = true;
    sim.fcu.hdg = Math.round(sim.adr.hdgMag || E.bearing());
    sim.fcu.alt = 5000;
    sim.fcu.spd = 250;
    sim.fma.thr = "MAN"; sim.fma.vert = ""; sim.fma.lat = "";

    frame = new Geo.Frame(sim.truth.geo[0], sim.truth.geo[1], sim.truth.geo[2]);
    if (scene) scene.terrain.ready = false;
  }

  function updateFrame() {
    var t = sim.truth;
    frame.geodeticToEnu(t.enu, t.geo[0], t.geo[1], t.geo[2]);
    if (Math.hypot(t.enu[0], t.enu[1]) > Geo.REBASE_M) {
      frame.setOrigin(t.geo[0], t.geo[1], frame.h);
      frame.geodeticToEnu(t.enu, t.geo[0], t.geo[1], t.geo[2]);
      rebases++;
    }
  }

  /* -------------------------------------------------------------- the step */

  function step(dt) {
    /* 1. environment */
    atmos.update(sim, dt);

    /* 2. sensors: the only place truth becomes belief */
    if (clock.is30Hz()) {
      adirs.update(sim, dt * 4);
      BFS.MassBalance.update(sim);
      sim._speeds = adirs.speeds(sim);
    }

    /* 3. control laws */
    fctl.directLaw(sim, dt);

    /* 4. actuators — the only channel from systems into the flight model */
    fctl.update(sim, dt);

    /* 5. propulsion */
    engines.update(sim, dt);

    /* 6. forces */
    body.reset();
    aero.update(sim, dt);
    body.addForce(sim.aero.F);
    body.addMoment(sim.aero.M);
    engines.applyForces(sim, body);
    gear.update(sim, body, dt);

    /* 7. integrate */
    body.integrate(sim, dt);
    body.derive(sim);

    updateFrame();
    sim.t = clock.t;
  }

  /* ------------------------------------------------------------------- HUD */
  var hud = document.createElement("div");
  hud.style.cssText =
    "position:absolute;left:8px;top:8px;z-index:6;font:11px/1.5 Consolas,monospace;" +
    "color:#a8bccd;background:rgba(6,10,16,.62);padding:7px 10px;border-radius:2px;" +
    "white-space:pre;pointer-events:none";
  canvas.parentNode.appendChild(hud);

  var toast = document.createElement("div");
  toast.style.cssText =
    "position:absolute;left:50%;transform:translateX(-50%);bottom:52px;z-index:6;" +
    "font:13px Consolas,monospace;color:#dce6f0;text-shadow:0 1px 3px #000;" +
    "pointer-events:none;text-align:center";
  canvas.parentNode.appendChild(toast);

  var debugOn = params.get("debug") !== "0";

  function drawHud() {
    if (!debugOn) { hud.style.display = "none"; } else {
      hud.style.display = "block";
      var a = sim.adr, e = sim.sys.eng;
      hud.textContent =
        "BING FLIGHT SIMULATOR   " + clock.fps.toFixed(0) + " fps   " +
          (clock.load * 100).toFixed(0) + "%   x" + renderScale.toFixed(2) + "\n" +
        "IAS " + a.ias.toFixed(0).padStart(3) + " kt    ALT " +
          a.altBaro.toFixed(0).padStart(6) + " ft    VS " + a.vs.toFixed(0).padStart(5) + "\n" +
        "HDG " + a.hdgMag.toFixed(0).padStart(3) + "     PITCH " +
          a.pitch.toFixed(1).padStart(5) + "    ROLL " + a.roll.toFixed(1).padStart(6) + "\n" +
        "AoA " + a.aoa.toFixed(1).padStart(5) + "    Nz " + a.load.toFixed(2) +
          "     RA " + (a.ralt >= 0 ? a.ralt.toFixed(0) : "---") + "\n" +
        "N1  " + e[0].n1.toFixed(1).padStart(5) + " / " + e[1].n1.toFixed(1).padStart(5) +
          "   EGT " + e[0].egt.toFixed(0) + "   FF " + (e[0].ff * 3600).toFixed(0) + " kg/h\n" +
        "FLAP " + sim.surf.flap.toFixed(0) + "/" + sim.surf.slat.toFixed(0) +
          "   GEAR " + sim.sys.gear.pos.map(function (p) { return p.toFixed(1); }).join(" ") +
          "   " + (sim.truth.onGround ? "ON GROUND" : "AIRBORNE") + "\n" +
        "GW " + (sim.mass.m / 1000).toFixed(1) + " t   CG " + sim.mass.cgPctMac.toFixed(1) +
          "%   FUEL " + sim.mass.fuel.total.toFixed(0) + " kg\n" +
        "buffet " + (sim.aero.buffet || 0).toFixed(2) + "   rebases " + rebases +
          (clock.paused ? "   PAUSED" : "");
    }
    var n = input.notices;
    toast.innerHTML = n.map(function (x) {
      return '<div style="opacity:' + U.clamp(1 - x.t / 3.2, 0, 1).toFixed(2) + '">' +
             x.text + "</div>";
    }).join("");
  }

  function tuneQuality() {
    if (clock.load > 1.4 && renderScale > 0.55) { renderScale -= 0.08; resize(); }
    else if (clock.load < 0.72 && renderScale < 1) { renderScale = Math.min(1, renderScale + 0.04); resize(); }
  }

  /* ------------------------------------------------------------------- loop */
  var started = false;

  function loop(wallMs) {
    requestAnimationFrame(loop);
    if (!resize()) return;

    var steps = clock.beginFrame(wallMs);
    input.update(sim, Math.max(1 / 240, clock.frameMs.mean() / 1000));
    for (var i = 0; i < steps; i++) { clock.advance(); step(clock.step); }

    tuneQuality();

    scene.terrain.update(sim, frame);
    scene.setAttitude(sim.truth.quat);
    sim._wind = { dir: atmos.windDirDeg, kt: atmos.windKt };
    scene.updateDisplays(sim, clock.t);
    scene.render(sim, input, frame, viewW, viewH, clock.t);

    drawHud();
  }

  /* ------------------------------------------------------------------ start */

  message.innerHTML = "Loading Cardiff…";

  var PRESET_LABELS = {
    turnaround: "At the gate — stand 7",
    lineup: "Lined up — runway 12",
    approach: "Short final — runway 30"
  };

  return BFS.Height.init().then(function () {
    /* The preset is selectable from the query string, which is how the headless
       tests reach the runway — starting at the stand and applying take-off
       thrust just drives the aeroplane into the terminal. */
    var wanted = params.get("preset");
    applyPreset(PRESETS[wanted] ? wanted : "turnaround");

    /* Weather overrides, mainly so the automated tests can fly in still air.
       A crosswind with nobody on the rudder weathercocks the aeroplane off the
       runway, which is correct behaviour and useless as a measurement. */
    if (params.has("wind")) atmos.windKt = Math.max(0, +params.get("wind") || 0);
    if (params.has("winddir")) atmos.windDirDeg = +params.get("winddir") || 0;
    if (params.has("turb")) atmos.turbulence = U.clamp(+params.get("turb") || 0, 0, 1);

    scene = new BFS.Scene.Scene(gl, canvas);
    scene.setAttitude(sim.truth.quat);

    /* A handle for the console and for the headless tests. Nothing in the
       simulator reads it — it exists so that a render problem can be
       interrogated from outside rather than guessed at. */
    BFS.debug = { sim: sim, scene: scene, clock: clock, input: input, gl: gl,
                  atmos: atmos, aero: aero, frame: function () { return frame; } };

    message.innerHTML =
      "<b>Cardiff Airport (EGFF)</b><br>" +
      "Arrows fly · , . rudder · PgUp/PgDn thrust · G gear · [ ] flaps<br>" +
      "B parking brake · Space brakes · V speedbrake · R reverse<br>" +
      "F1–F7 views · drag to look · P pause";

    /* Preset picker. With no persistence in this sandbox there are no saved
       situations to return to, so the way back to a useful starting point has to
       be one click away every time. */
    var picker = document.createElement("div");
    picker.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
    Object.keys(PRESETS).forEach(function (key) {
      var b = document.createElement("button");
      b.textContent = PRESET_LABELS[key];
      b.style.cssText =
        "font:inherit;font-size:11px;letter-spacing:.06em;padding:6px 12px;" +
        "border-radius:2px;cursor:pointer;border:1px solid #2b3644;" +
        (key === sim.preset ? "background:#5c9ad6;color:#05070c;border-color:#5c9ad6"
                            : "background:#141a22;color:#8fa0b0");
      b.onclick = function () {
        applyPreset(key);
        scene.terrain.ready = false;
        scene.setAttitude(sim.truth.quat);
        [].forEach.call(picker.children, function (o, i) {
          var on = Object.keys(PRESETS)[i] === key;
          o.style.background = on ? "#5c9ad6" : "#141a22";
          o.style.color = on ? "#05070c" : "#8fa0b0";
          o.style.borderColor = on ? "#5c9ad6" : "#2b3644";
        });
      };
      picker.appendChild(b);
    });
    message.parentNode.insertBefore(picker, button);

    button.disabled = false;
    button.textContent = "FLY";

    return new Promise(function (resolve) {
      button.addEventListener("click", function () {
        if (started) return;
        started = true;
        overlay.classList.add("gone");
        canvas.tabIndex = 0;
        canvas.focus();
        clock.bindVisibility(function (c) {
          if (host.pill) {
            host.pill.textContent = c.paused ? "Paused — " + c.pauseReason : "";
            host.pill.style.display = c.paused ? "block" : "none";
          }
        });
        resize();
        requestAnimationFrame(loop);
        resolve();
      });
    });
  }).catch(function (e) {
    message.style.color = "#e0574a";
    message.textContent = "Startup failed: " + (e && e.stack ? e.stack : e);
    button.style.display = "none";
    throw e;
  });
};
