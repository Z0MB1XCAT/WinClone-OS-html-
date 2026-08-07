/* sim/engine_cfm56.js
   READS:  sim.ctl, sim.env, sim.truth, sim.mass
   WRITES: sim.sys.eng
   TICK:   fdm, 120Hz
   DEPS:   core/util, core/vecmat, sim/a320_config, sim/massbalance */

/* CFM56-5B4 with a simplified FADEC.
 *
 * The thing that matters most here is not peak thrust but spool time. An A320's
 * engines take roughly eight seconds to go from flight idle to take-off thrust,
 * and that single number governs how a go-around feels, whether you can salvage
 * a low approach, and why you stabilise early. So the spool is modelled as a
 * lag whose time constant varies with N2 — slow at the bottom of the range,
 * quick at the top — rather than as a fixed rate.
 *
 * Thrust levers are analogue but the A320's are read as detents: IDLE, CL, FLX
 * and TOGA. The FADEC resolves position to a target N1; the lever itself never
 * commands thrust directly.
 */

BFS.Engine = (function () {
  "use strict";

  var U = BFS.Util, V = BFS.V, C = BFS.A320.C;
  var RHO0 = 1.225;

  var DETENT = { IDLE: 0, CLB: 0.62, FLX: 0.83, TOGA: 1.0 };

  function detentName(lever) {
    if (lever >= 0.97) return "TOGA";
    if (lever >= 0.80) return "FLX";
    if (lever >= 0.58) return "CL";
    if (lever <= 0.03) return "IDLE";
    return "MAN";
  }

  function Engines() {
    this.startTimer = [0, 0];
    this._f = new Float64Array(3);
    this._r = new Float64Array(3);
  }

  /* Target N1 for a lever position. Between detents the FADEC interpolates, so
     manual thrust still behaves sensibly even though line pilots live in the
     detents. */
  function n1Target(lever, env, mach) {
    var idle = C.n1Idle, max = 100;
    var l = U.clamp(lever, 0, 1);
    var frac;
    if (l <= DETENT.CLB) frac = (l / DETENT.CLB) * 0.84;
    else frac = 0.84 + ((l - DETENT.CLB) / (1 - DETENT.CLB)) * 0.16;
    /* Flat rating: available N1 falls off with density altitude and rises
       slightly with ram at speed. */
    var densRatio = env.rho / RHO0;
    var ceiling = max * (0.86 + 0.14 * Math.pow(densRatio, 0.35)) + mach * 3.0;
    return U.clamp(idle + frac * (ceiling - idle), idle, 104);
  }

  /* Thrust as a function of spool state, Mach and density.
   *
   * Two exponents carry the behaviour: density to the 0.85 (a turbofan loses
   * thrust with altitude a little more slowly than pure density scaling), and
   * the N1 term to the 1.7 (thrust is strongly non-linear in fan speed, which is
   * why the last ten percent of the lever does most of the work). Tuned so that
   * cruise at FL350 and M0.78 needs about 22 kN per engine, which is the number
   * a real one sits at. */
  function thrustOf(n1, mach, rho) {
    var span = 100 - C.n1Idle;
    var x = U.clamp((n1 - C.n1Idle) / span, 0, 1.15);
    var ram = 1 - 0.40 * mach + 0.15 * mach * mach;
    return C.engThrustSL * Math.pow(rho / RHO0, 0.85) * ram * Math.pow(x, 1.7);
  }

  /* Spool time constant. Slow when the core is unwound, fast when it is up. */
  function spoolTau(n2, spoolingUp) {
    var t = U.lerp(4.6, 1.1, U.clamp((n2 - C.n2Idle) / (100 - C.n2Idle), 0, 1));
    return spoolingUp ? t : t * 1.35;    // decel is lazier than accel
  }

  Engines.prototype.update = function (sim, dt) {
    var env = sim.env, mach = sim.aero.mach || 0;

    for (var i = 0; i < 2; i++) {
      var e = sim.sys.eng[i];
      var lever = sim.ctl.thrust[i];
      e.detent = detentName(lever);

      /* ---- start sequence ----
         Starter spins N2; at 22% the fuel valve opens; light-up follows within a
         couple of seconds and EGT peaks well above the idle value before
         settling. Getting the shape of that EGT excursion right is most of what
         makes a start look real. */
      if (e.starter && !e.running) {
        e.n2 = U.lag(e.n2, 30, 6.0, dt);
        if (e.master && e.n2 > 22 && !e.lit) {
          e.lit = true;
          e.lightTimer = 0;
        }
        if (e.lit) {
          e.lightTimer += dt;
          e.n2 = U.lag(e.n2, C.n2Idle, 7.5, dt);
          e.n1 = U.lag(e.n1, C.n1Idle, 9.0, dt);
          /* Peak EGT a few seconds after light-up, then decay to idle. */
          var peak = 560 * Math.exp(-Math.pow((e.lightTimer - 6) / 5.5, 2));
          e.egt = U.lag(e.egt, env.oat + 40 + peak, 1.2, dt);
          if (e.n2 > C.n2Idle - 1.5) {
            e.running = true; e.starter = false; e.mode = "run";
          }
        } else {
          e.egt = U.lag(e.egt, env.oat + 8, 4, dt);
        }
        e.ff = e.lit ? 0.14 : 0;
        e.thrust = 0;
        e.oilPsi = U.lag(e.oilPsi, e.n2 * 0.9, 2.5, dt);
        continue;
      }

      if (!e.master) {
        /* Shut down, or never started. A windmilling engine keeps some N1 in
           the airstream and none on the ground. */
        e.running = false; e.lit = false;
        var wind = U.clamp((sim.aero.vmag || 0) / 90, 0, 1) * 22;
        e.n1 = U.lag(e.n1, wind, 8, dt);
        e.n2 = U.lag(e.n2, wind * 0.8, 10, dt);
        e.egt = U.lag(e.egt, env.oat, 25, dt);
        e.ff = 0; e.thrust = 0; e.mode = "off";
        e.oilPsi = U.lag(e.oilPsi, e.n2 * 0.2, 4, dt);
        continue;
      }

      /* ---- running ---- */
      var tgt = n1Target(lever, env, mach);
      e.n1Cmd = tgt;

      var up = tgt > e.n1;
      e.n2 = U.lag(e.n2, C.n2Idle + (tgt - C.n1Idle) * 0.52, spoolTau(e.n2, up), dt);
      e.n1 = U.lag(e.n1, tgt, spoolTau(e.n2, up), dt);

      var thrust = thrustOf(e.n1, mach, env.rho);

      /* Reverse. The cowl takes a couple of seconds to translate, and reverse
         thrust is roughly forty percent of forward at the same fan speed and
         only available on the ground. */
      if (e.revCmd && sim.truth.onGround) e.revDeploy = U.lag(e.revDeploy, 1, 1.1, dt);
      else e.revDeploy = U.lag(e.revDeploy, 0, 1.4, dt);
      if (e.revDeploy > 0.02) thrust *= (1 - 1.4 * e.revDeploy);

      e.thrust = thrust;

      /* Fuel flow, and the EGT that goes with it. */
      var frac = U.clamp((e.n1 - C.n1Idle) / (100 - C.n1Idle), 0, 1.1);
      e.ff = (0.11 + 0.68 * Math.pow(frac, 1.25)) * Math.pow(env.rho / RHO0, 0.55);
      var egtTarget = env.oat + 330 + 560 * Math.pow(frac, 1.35) - mach * 30;
      e.egt = U.lag(e.egt, egtTarget, 3.5, dt);
      e.oilPsi = U.lag(e.oilPsi, 60 + e.n2 * 0.4, 3, dt);
      e.oilTemp = U.lag(e.oilTemp, env.oat + 55 + frac * 40, 30, dt);
      e.mode = "run";

      BFS.MassBalance.burn(sim, i, e.ff, dt);
      if (sim.mass.fuel.total < 0.5) { e.master = false; }
    }
  };

  /* Thrust and its moment about the centre of gravity. The engines sit below and
     ahead of it, so adding thrust pitches the nose up — the pitch-power coupling
     that dominates a go-around — and an engine failure yaws the aeroplane. Both
     come from the geometry, not from a special case. */
  Engines.prototype.applyForces = function (sim, body) {
    for (var i = 0; i < 2; i++) {
      var e = sim.sys.eng[i];
      var p = C.engPos[i];
      /* Reversers vent forward and outward rather than straight back. */
      var fwd = e.thrust;
      V.set3(this._f, fwd, 0, 0);
      V.set3(this._r, p[0], p[1], p[2]);
      body.addForceAt(this._f, this._r, sim.mass.cg);
    }
  };

  return { Engines: Engines, DETENT: DETENT, detentName: detentName, thrustOf: thrustOf, n1Target: n1Target };
})();
