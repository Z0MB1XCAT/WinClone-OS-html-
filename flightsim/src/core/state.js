/* core/state.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/vecmat, core/geo */

/* The simulation state tree.
 *
 * One mutable object, no message passing. What keeps that from turning into mud
 * is not encapsulation but three ownership rules, declared in every file's
 * contract header and enforced by build.mjs:
 *
 *   1. The flight model never reads avionics. It sees `surf`, `sys.eng[].thrust`,
 *      `env`, `mass` and `truth` — nothing else.
 *
 *   2. Avionics never read `truth`. They read `adr`. Exactly one module, the
 *      air-data/inertial reference, is allowed to read `truth` and write `adr`,
 *      and that is where sensor lag, pitot blockage and IRS drift will live.
 *      This split is worth establishing before there is anything to split:
 *      retrofitting it later would mean touching every display and every
 *      autoflight mode, whereas today it costs one line of discipline. It is
 *      what will later make unreliable-airspeed and fly-by-wire law degradation
 *      fall out of the model instead of being scripted.
 *
 *   3. The renderer and the displays are pure readers. They never write here.
 *
 * `truth` is float64 and is physical reality. `adr` is what the aeroplane
 * believes, and it is allowed to be wrong.
 */

BFS.State = (function () {
  "use strict";

  var V = BFS.V;

  /* A320 flight phases 1-10, as used for ECAM warning inhibition. */
  var PHASE = {
    ELEC_PWR: 1, FIRST_ENG_START: 2, FIRST_ENG_TO_PWR: 3, ABOVE_80KT: 4,
    LIFTOFF: 5, CLIMB: 6, CRUISE: 7, DESCENT: 8, APPROACH: 9, TOUCHDOWN: 10
  };

  function create() {
    var s = {
      /* ---- bookkeeping ---- */
      t: 0,
      phase: PHASE.ELEC_PWR,
      preset: "cold",

      /* ---- pilot inputs, raw ---- */
      ctl: {
        stick: [0, 0],        // [pitch, roll], -1..1, sidestick deflection
        pedals: 0,            // -1..1, rudder
        tiller: 0,            // -1..1, nosewheel steering
        brakeL: 0, brakeR: 0, // -1..1, toe brakes
        parkBrake: true,
        thrust: [0, 0],       // lever position 0..1 (detents resolved by the FADEC)
        flapLever: 0,         // 0..4 -> 0 / 1 / 2 / 3 / FULL
        speedbrake: 0,
        gearLever: 1,         // 1 = down
        sw: {}                // overhead and pedestal switch positions, by name
      },

      /* ---- physical reality, float64, owned by the flight model ---- */
      truth: {
        geo: new Float64Array(3),     // lat deg, lon deg, altitude m above ellipsoid
        enu: new Float64Array(3),     // position in the current render frame
        vBody: new Float64Array(3),   // body-frame velocity, m/s, x fwd y right z down
        vEnu: new Float64Array(3),    // world velocity
        quat: V.quat(),               // body -> ENU attitude
        omega: new Float64Array(3),   // body rates p q r, rad/s
        accel: new Float64Array(3),   // body specific force, m/s^2
        agl: 0,                       // height of the wheels above ground, m
        onGround: true,
        crashed: false
      },

      /* ---- environment ---- */
      env: {
        rho: 1.225, T: 288.15, p: 101325, a: 340.29,
        qnh: 1013.25, oat: 15,
        wind: new Float64Array(3),    // ENU, m/s
        turb: new Float64Array(3),
        sunDir: new Float64Array(3)
      },

      /* ---- mass and balance ---- */
      mass: {
        m: 60000, zfw: 55000, gw: 60000,
        cg: new Float64Array(3),      // body-frame offset of CG from the datum, m
        cgPctMac: 27,
        I: new Float64Array(9),
        fuel: { left: 0, right: 0, centre: 0, total: 0 }
      },

      /* ---- systems ---- */
      sys: {
        elec: null, hyd: null, fuel: null, pneu: null, apu: null,
        eng: [engineState(), engineState()],
        gear: {
          lever: 1, pos: [1, 1, 1],       // 0 up, 1 down
          stroke: [0, 0, 0],              // oleo compression, m
          wow: [true, true, true],
          brakeTemp: [40, 40, 40, 40],
          autobrake: 0                    // 0 off, 1 LO, 2 MED, 3 MAX
        }
      },

      /* ---- sensed air data and inertial reference: what the aeroplane believes ----
         Every field av/adirs.js writes must appear here with a sane initial
         value. The displays and the head-up figures are drawn on the first frame,
         which is before the first 30 Hz sensor tick has run — so anything missing
         is read as undefined by a display rather than defaulting to zero. */
      adr: {
        ias: 0, tas: 0, gs: 0, mach: 0,
        altBaro: 0, altStd: 0, ralt: 0,
        pitch: 0, roll: 0, hdgTrue: 0, hdgMag: 0, trk: 0, trkMag: 0,
        vs: 0, fpa: 0, aoa: 0, slip: 0, load: 1, onGround: true,
        valid: { adr1: false, adr2: false, ir1: false, ir2: false }
      },

      /* ---- commanded by the flight control system ---- */
      cmd: {
        law: "direct",                  // direct | alternate | normal, until fbw exists
        surfaces: { elev: 0, ail: 0, rud: 0, ths: 0 },
        thrust: [0, 0],
        prot: {}
      },

      /* ---- actual control surface positions: the only channel from systems
              into the flight model ---- */
      surf: {
        elev: 0, ailL: 0, ailR: 0, rud: 0, ths: 0,
        spoiler: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        flap: 0, slat: 0,               // degrees, actual
        flapTarget: 0, slatTarget: 0
      },

      /* ---- aerodynamic output, for displays and debug ---- */
      aero: {
        F: new Float64Array(3), M: new Float64Array(3),
        alpha: 0, beta: 0, q: 0, load: 1,
        strips: null
      },

      /* ---- avionics ---- */
      fcu: { spd: 250, hdg: 0, alt: 5000, vs: 0, spdMode: "sel", hdgMode: "sel", altMode: "sel" },
      fma: { thr: "", vert: "", lat: "", appr: "", ap: 0, fd: false, athr: false },
      ecam: { alerts: [], sdPage: "DOOR", masterCaution: false, masterWarning: false },
      nd: { mode: "ARC", range: 40 },
      fms: { plan: [], active: 0 },

      /* ---- non-simulation, for the shell and the debug overlay ---- */
      ui: { paused: false, view: "forward", pill: "", notices: [] }
    };

    V.qset(s.truth.quat, 1, 0, 0, 0);
    return s;
  }

  function engineState() {
    return {
      n1: 0, n2: 0, egt: 15, ff: 0, thrust: 0,
      master: false, running: false, starter: false, ignition: false,
      revDeploy: 0, oilPsi: 0, oilTemp: 15,
      n1Cmd: 0, mode: "off"
    };
  }

  /* Place the aircraft, at rest, at a geodetic point and heading. Used by every
     spawn preset; the presets themselves differ only in what they then do to
     `sys` and `ctl`. */
  function placeAt(s, latDeg, lonDeg, altM, hdgTrueDeg) {
    s.truth.geo[0] = latDeg;
    s.truth.geo[1] = lonDeg;
    s.truth.geo[2] = altM;
    V.set3(s.truth.vBody, 0, 0, 0);
    V.set3(s.truth.vEnu, 0, 0, 0);
    V.set3(s.truth.omega, 0, 0, 0);
    /* Attitude is body -> NED, so yaw is the true heading directly. */
    V.qFromEuler(s.truth.quat, 0, 0, hdgTrueDeg * BFS.Util.DEG);
    s.truth.onGround = true;
    s.truth.crashed = false;
    return s;
  }

  return { create: create, placeAt: placeAt, PHASE: PHASE };
})();
