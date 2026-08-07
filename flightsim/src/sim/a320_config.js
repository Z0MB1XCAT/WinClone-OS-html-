/* sim/a320_config.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util

   Pure data and the strip-layout generators. No logic that changes with time —
   if it needs the simulation state, it belongs in aero_strips or engine_cfm56,
   not here. */

/* Airbus A320-200, CFM56-5B4.
 *
 * Body axes throughout: x forward, y right, z down. The datum is the aircraft
 * reference point; positions are metres from it.
 *
 * Where the numbers come from: published dimensions and certified weights are
 * used as given. Inertias, section properties and the engine deck are
 * engineering estimates chosen to reproduce known behaviour — the roll rate, the
 * short-period period, cruise fuel flow — and they get pinned down by the
 * validation harness rather than by assertion.
 */

BFS.A320 = (function () {
  "use strict";

  var U = BFS.Util;

  var C = {
    /* ---- mass ---- */
    oew: 42600,          // kg, operating empty
    mzfw: 62500,
    mtow: 78000,
    mlw: 66000,
    maxFuel: 18730,      // kg usable: 2 x 5552 wing, 6476 centre
    tankWing: 5552,
    tankCentre: 6476,

    /* Inertia at OEW about the CG, kg m^2. Scaled with load in massbalance. */
    Ixx: 1.30e6, Iyy: 2.90e6, Izz: 4.00e6, Ixz: 1.40e5,

    /* ---- geometry ---- */
    span: 34.10,
    wingArea: 122.6,
    mac: 4.19,
    aspect: 9.49,
    sweepQC: 25.0 * Math.PI / 180,
    dihedral: 5.11 * Math.PI / 180,
    washout: -3.5 * Math.PI / 180,      // tip incidence relative to root
    rootIncidence: 4.0 * Math.PI / 180,
    rootChord: 6.07,
    tipChord: 1.73,
    kinkEta: 0.34,                       // yehudi kink, fraction of semi-span
    kinkChord: 3.80,
    wingTc: 0.123,                       // thickness/chord, supercritical section

    /* Root leading edge, from the datum.
     *
     * This one number ties the whole aeroplane together and is easy to get
     * badly wrong. It has to place the quarter-chord of the mean aerodynamic
     * chord next to the centre of gravity, which in turn has to sit about a
     * metre forward of the main gear or the aeroplane sits on its tail. Working
     * backwards: the MAC is at roughly 40% semi-span, so its leading edge is
     * apex - 0.40 * (span/2) * tan(sweep) = apex - 3.18 m. Putting that at
     * +2.02 with the CG at +0.90 gives 27% MAC, which is where an A320 is
     * loaded. */
    wingApex: [5.20, 0, 0.55],

    length: 37.57,
    fuseDia: 4.14,
    noseToDatum: 17.6,                   // datum is this far aft of the nose

    /* Empennage. The tail arm — the distance from the CG back to the
       stabiliser's quarter chord — comes out at 14.9 m, which is what sets the
       pitch stiffness and the short-period frequency. */
    htSpan: 12.45, htArea: 31.0, htTc: 0.10, htSweep: 29 * Math.PI / 180,
    htPos: [-14.0, 0, -0.55],            // quarter chord, from datum
    htIncidence: 0,
    vtArea: 21.5, vtSpan: 6.26, vtTc: 0.11, vtSweep: 34 * Math.PI / 180,
    vtPos: [-13.5, 0, -3.1],

    /* Engines, hung forward of and below the wing. Forward of the CG and below
       it, so adding thrust pitches the nose up — the coupling that dominates a
       go-around, and it comes out of these three numbers rather than a rule. */
    engPos: [[4.20, -5.75, 1.35], [4.20, 5.75, 1.35]],
    engDia: 1.735,
    nacelleLen: 4.40,

    /* Landing gear, from the datum. Nose 5.07 m aft of the nose tip; the mains
       follow from the published 12.64 m wheelbase, and the track is 7.59 m.
       The nose strut's z is set so that both contact patches — position plus
       wheel radius — are level, and the aeroplane then sits a quarter of a
       degree nose-up because the mains carry more load and compress further. */
    gear: [
      { name: "nose", pos: [12.53, 0, 2.80], travel: 0.42, k: 3.2e5, c: 3.0e4,
        radius: 0.38, steer: 75, brake: false, maxLoad: 1.2e5 },
      { name: "left", pos: [-0.11, -3.795, 2.62], travel: 0.48, k: 1.35e6, c: 1.1e5,
        radius: 0.56, steer: 0, brake: true, maxLoad: 5.5e5 },
      { name: "right", pos: [-0.11, 3.795, 2.62], travel: 0.48, k: 1.35e6, c: 1.1e5,
        radius: 0.56, steer: 0, brake: true, maxLoad: 5.5e5 }
    ],
    muDry: 0.72,
    muBrake: 0.45,
    slipPeak: 0.12,               // longitudinal slip ratio of peak friction
    corneringStiffness: 1.5e5,    // N/rad per main gear

    /* ---- control surfaces ---- */
    /* Trailing edge DOWN is positive. The A320's elevator travels 30 degrees up
       and 17 down, so the nose-up authority is the larger of the two. */
    elevMax: 17 * U.DEG, elevMin: -30 * U.DEG,
    thsMax: 4 * U.DEG, thsMin: -13.5 * U.DEG,
    ailMax: 25 * U.DEG,
    rudMax: 30 * U.DEG,
    spoilerMax: 35 * U.DEG,
    elevRate: 40 * U.DEG,      // rad/s at full hydraulic pressure
    ailRate: 60 * U.DEG,
    rudRate: 45 * U.DEG,
    thsRate: 0.5 * U.DEG,
    spoilerRate: 50 * U.DEG,

    /* Flap and slat schedule by lever position 0..4 -> 0 / 1 / 2 / 3 / FULL.
       Position 1 is the awkward one: it means slats only in the air, but slats
       plus ten degrees of flap when selected on the ground for take-off. */
    flapDeg: [0, 0, 15, 20, 35],
    flap1fDeg: 10,
    slatDeg: [0, 18, 22, 22, 27],
    flapRate: 1.1,             // deg/s of surface travel
    slatRate: 1.6,
    vfe: [280, 230, 215, 200, 177],   // kt, placard for the NEXT position

    /* ---- engine ---- */
    engThrustSL: 120000,       // N per engine, static sea level
    n1Idle: 19.5, n2Idle: 58.9,
    n1Max: 100, egtMaxStart: 725, egtMaxCont: 915, egtMaxTO: 950,
    tsfcStatic: 0.0000098,     // kg/(N s), scaled with Mach and altitude

    /* ---- limits ---- */
    vmo: 350, mmo: 0.82, vle: 280, vlo: 250,
    alphaMax: 17.5 * U.DEG,
    nzMax: 2.5, nzMin: -1.0
  };

  /* ------------------------------------------------------------------ strips
   *
   * The flight model computes forces per surface element from the local airflow
   * rather than from whole-aircraft coefficients. That means the geometry below
   * IS the aerodynamic model: sweep, taper, twist and dihedral are described
   * once, here, and roll damping, adverse yaw, tip stall and the pitch change
   * with flap all emerge from it. There is no table of derivatives anywhere in
   * this simulator, and nothing to keep in sync when the geometry changes.
   *
   * Each strip carries:
   *   r       quarter-chord position in body axes, m
   *   c       chord, m
   *   S       area, m^2
   *   n, t, s local lift-normal / chordwise / spanwise unit vectors
   *   sweep   local sweep angle, for the normal-flow decomposition
   *   ctl     which control channel deflects it, and by how much of its chord
   *   flapFrac / slatFrac  chord fractions of high-lift devices on this strip
   */

  var WING_STRIPS = 20;    // per side
  var HT_STRIPS = 8;       // per side
  var VT_STRIPS = 8;
  var FUSE_STRIPS = 10;

  function chordAt(eta) {
    /* Two linear panels meeting at the yehudi kink. */
    if (eta <= C.kinkEta) return U.lerp(C.rootChord, C.kinkChord, eta / C.kinkEta);
    return U.lerp(C.kinkChord, C.tipChord, (eta - C.kinkEta) / (1 - C.kinkEta));
  }

  function makeStrip(r, c, S, nx, ny, nz, sweep, opts) {
    var s = {
      r: new Float64Array(r),
      c: c, S: S,
      n: new Float64Array([nx, ny, nz]),
      t: new Float64Array([1, 0, 0]),
      sp: new Float64Array([0, 1, 0]),
      sweep: sweep || 0,
      /* The axis the section's own pitching moment acts about: perpendicular to
         both the chord and the lift normal. For a wing or tailplane strip this
         comes out along +y whichever side it is on, and for the fin along +z,
         so one expression serves every surface. */
      mAxis: new Float64Array(3),
      incidence: 0,
      tc: 0.12,
      ctl: null, ctlFrac: 0, ctlSign: 1,
      flapFrac: 0, slatFrac: 0,
      spoiler: -1,
      /* Separation state persists between ticks. It starts fully attached: a
         parked aeroplane is not stalled, and starting at zero makes the buffet
         indication read full scale until the first time air moves over it. */
      sep: 1,
      gamma: 0,               // circulation, seeded from the previous tick
      /* Must be initialised. Left undefined it becomes NaN on the first
         relaxation step, and `NaN || 0` is 0 — so every downstream guard of that
         shape silently discarded the entire lifting-line contribution while
         every test still passed on geometry alone. */
      alphaInd: 0,
      alpha: 0, cl: 0, cd: 0, lift: 0,
      kind: "wing", side: 0
    };
    if (opts) for (var k in opts) if (opts.hasOwnProperty(k)) s[k] = opts[k];
    setMomentAxis(s);
    return s;
  }

  function setMomentAxis(s) {
    var t = s.t, n = s.n;
    s.mAxis[0] = t[1] * n[2] - t[2] * n[1];
    s.mAxis[1] = t[2] * n[0] - t[0] * n[2];
    s.mAxis[2] = t[0] * n[1] - t[1] * n[0];
    return s;
  }

  function buildStrips() {
    var strips = [], i, side;
    var semi = C.span / 2;

    /* ---- wing ---- */
    for (side = -1; side <= 1; side += 2) {
      for (i = 0; i < WING_STRIPS; i++) {
        var eta0 = i / WING_STRIPS, eta1 = (i + 1) / WING_STRIPS;
        var eta = (eta0 + eta1) * 0.5;
        var c = chordAt(eta);
        var dy = (eta1 - eta0) * semi;
        var y = side * eta * semi;

        /* Quarter-chord line sweeps aft and the wing rises with dihedral. */
        var x = C.wingApex[0] - Math.abs(y) * Math.tan(C.sweepQC) - c * 0.25;
        var z = C.wingApex[2] - Math.abs(y) * Math.tan(C.dihedral);

        var twist = C.rootIncidence + C.washout * eta;

        /* Lift normal — the direction positive lift acts on this strip.
         *
         * Body z is down, so "up" is -z. Two rotations from there:
         *
         *   twist. A section pitched nose-up by t has its up-normal tilted
         *   *aft*, so the x component is -sin(t). Getting this sign backwards
         *   makes a wing at +4 degrees of incidence report -4 degrees of angle
         *   of attack, and everything downstream inherits the error.
         *
         *   dihedral. Both wings' normals tilt *inboard*, toward each other —
         *   which is the whole mechanism of the dihedral effect, since their
         *   horizontal components cancel in symmetric flight and stop
         *   cancelling in a sideslip. So the y component carries the side sign;
         *   without it both wings tilt the same way and roll-with-sideslip
         *   disappears. */
        var n = [-Math.sin(twist),
                 -Math.sin(C.dihedral) * side,
                 -Math.cos(C.dihedral)];

        var s = makeStrip([x, y, z], c, c * dy, n[0], n[1], n[2], C.sweepQC, {
          incidence: twist, tc: C.wingTc, kind: "wing", side: side
        });
        /* Spanwise edges, ordered left-to-right regardless of which wing this
           is. The lifting-line solve sheds a trailing vortex from each edge, so
           these are load-bearing geometry rather than bookkeeping. */
        var e0 = side * eta0 * semi, e1 = side * eta1 * semi;
        s._yL = Math.min(e0, e1);
        s._yR = Math.max(e0, e1);
        s.sp[0] = 0; s.sp[1] = side; s.sp[2] = 0;

        /* High-lift devices run to about 70% of span; ailerons live outboard. */
        if (eta < 0.70) { s.flapFrac = 0.28; }
        s.slatFrac = eta > 0.08 ? 0.16 : 0;
        /* ctlSign stays +1: the ailerons' antisymmetry lives in their commanded
           positions (flightcontrols.js drives ailL and ailR opposite), and
           putting it here as well would cancel it and roll both wings the same
           way. */
        if (eta > 0.72) { s.ctl = "ail"; s.ctlFrac = 0.24; }

        /* Five spoiler panels per side, between the flap and the aileron. */
        if (eta > 0.22 && eta < 0.72) {
          s.spoiler = Math.min(4, Math.floor((eta - 0.22) / 0.10)) + (side > 0 ? 5 : 0);
        }
        strips.push(s);
      }
    }

    /* ---- horizontal stabiliser ---- */
    var htSemi = C.htSpan / 2, htChord = C.htArea / C.htSpan;
    for (side = -1; side <= 1; side += 2) {
      for (i = 0; i < HT_STRIPS; i++) {
        var he = (i + 0.5) / HT_STRIPS;
        var hy = side * he * htSemi;
        var hc = htChord * (1.35 - 0.7 * he);     // tapered
        var hx = C.htPos[0] - Math.abs(hy) * Math.tan(C.htSweep);
        var hs = makeStrip([hx, hy, C.htPos[2]], hc, hc * (htSemi / HT_STRIPS),
                           0, 0, -1, C.htSweep, {
          tc: C.htTc, kind: "ht", side: side
        });
        hs.ctl = "elev"; hs.ctlFrac = 0.30;
        strips.push(hs);
      }
    }

    /* ---- vertical stabiliser ----
       Identical code path to the wing, with the lift normal pointing sideways.
       Weathercock stability, dutch roll and the rudder's roll coupling all come
       out of that one change; none of them is modelled explicitly. */
    var vtChord = C.vtArea / C.vtSpan;
    for (i = 0; i < VT_STRIPS; i++) {
      var ve = (i + 0.5) / VT_STRIPS;
      var vz = C.vtPos[2] - ve * C.vtSpan;
      var vc = vtChord * (1.45 - 0.85 * ve);
      var vx = C.vtPos[0] - ve * C.vtSpan * Math.tan(C.vtSweep);
      var vs = makeStrip([vx, 0, vz], vc, vc * (C.vtSpan / VT_STRIPS),
                         0, 1, 0, C.vtSweep, {
        tc: C.vtTc, kind: "vt", side: 0
      });
      vs.sp[0] = 0; vs.sp[1] = 0; vs.sp[2] = -1;
      /* Right pedal deflects the rudder's trailing edge right, which pushes the
         fin left and swings the nose right. The fin's normal points right, so
         that is a negative lift — hence the inverted control sign. */
      vs.ctl = "rud"; vs.ctlFrac = 0.32; vs.ctlSign = -1;
      strips.push(vs);
    }

    /* ---- fuselage ----
       Crossflow elements. They give the fuselage its destabilising pitch and yaw
       moment, which is a real and sizeable effect: without it the aeroplane is
       noticeably too stable in yaw. */
    var fl = C.length, seg = fl / FUSE_STRIPS;
    for (i = 0; i < FUSE_STRIPS; i++) {
      var fx = C.noseToDatum - (i + 0.5) * seg;
      var frac = (i + 0.5) / FUSE_STRIPS;
      /* Diameter tapers at nose and tail. */
      var d = C.fuseDia * Math.min(1, Math.sin(Math.PI * Math.pow(frac, 0.62)) * 1.35);
      strips.push(makeStrip([fx, 0, 0], seg, seg * Math.max(0.4, d), 0, 0, -1, 0, {
        tc: 1.0, kind: "fuse", side: 0
      }));
    }

    /* ---- nacelles ---- */
    for (side = 0; side < 2; side++) {
      for (i = 0; i < 3; i++) {
        var p = C.engPos[side];
        strips.push(makeStrip([p[0] - i * 1.3, p[1], p[2]], 1.3, 1.3 * C.engDia,
                              0, 0, -1, 0, { tc: 1.0, kind: "nacelle", side: side ? 1 : -1 }));
      }
    }

    return strips;
  }

  /* Flap and slat targets for a lever position, accounting for the CONF 1+F
     case: lever 1 on the ground (or below the retraction speed) also gives ten
     degrees of flap. */
  function highLiftTarget(lever, onGround, ias) {
    var slat = C.slatDeg[lever] || 0;
    var flap = C.flapDeg[lever] || 0;
    if (lever === 1 && (onGround || ias < 210)) flap = C.flap1fDeg;
    return { flap: flap, slat: slat };
  }

  return {
    C: C, buildStrips: buildStrips, chordAt: chordAt, highLiftTarget: highLiftTarget,
    WING_STRIPS: WING_STRIPS, HT_STRIPS: HT_STRIPS, VT_STRIPS: VT_STRIPS
  };
})();
