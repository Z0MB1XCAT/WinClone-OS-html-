/* sys/flightcontrols.js
   READS:  sim.ctl, sim.cmd, sim.adr, sim.truth
   WRITES: sim.surf
   TICK:   fdm, 120Hz
   DEPS:   core/util, sim/a320_config

   The only path from the systems into the flight model.
 *
 * Every actuator in the aeroplane arrives at the aerodynamics through this file
 * and nowhere else. That is a deliberate choke point: when hydraulics exist,
 * losing a system reduces the rate limits here, losing two freezes a surface
 * here, and aero_strips.js neither knows nor needs to. Nothing downstream of
 * this file has a concept of a hydraulic system at all.
 *
 * Phase 1 flies in direct law: the sidestick commands surface deflection. The
 * fly-by-wire normal law sits between sim.ctl and sim.cmd in Phase 4, and this
 * file does not change when it arrives.
 */

BFS.FlightControls = (function () {
  "use strict";

  var U = BFS.Util, C = BFS.A320.C, A = BFS.A320;

  function FlightControls() {
    this.thsTrim = 0;
    this._flapTarget = 0;
    this._slatTarget = 0;
  }

  /* Hydraulic authority per surface. Phase 3 replaces the constant with the
     actual pressure available to each actuator; the shape of the calculation is
     already right. */
  function authority(sim, surface) {
    return 1;
  }

  FlightControls.prototype.update = function (sim, dt) {
    var s = sim.surf, ctl = sim.ctl, cmd = sim.cmd;

    /* ---- primary surfaces ---- */
    var pitchCmd = U.clamp(cmd.surfaces.elev, -1, 1);
    var rollCmd = U.clamp(cmd.surfaces.ail, -1, 1);
    var yawCmd = U.clamp(cmd.surfaces.rud, -1, 1);

    var elevTarget = pitchCmd > 0 ? pitchCmd * C.elevMax : pitchCmd * -C.elevMin;
    s.elev = U.rateLimit(s.elev, elevTarget, C.elevRate * authority(sim), dt);

    /* Ailerons deflect antisymmetrically, and this is the only place that
       antisymmetry lives — the strips apply both surfaces with the same sign.
       Positive roll command is roll right, so the right aileron goes trailing
       edge up (negative, less lift, wing drops) and the left goes down.

       The adverse yaw that produces is not added anywhere: it comes out of the
       strips on its own, because the down-going aileron adds more drag than the
       up-going one. */
    var ailTarget = rollCmd * C.ailMax;
    s.ailL = U.rateLimit(s.ailL, ailTarget, C.ailRate, dt);
    s.ailR = U.rateLimit(s.ailR, -ailTarget, C.ailRate, dt);

    s.rud = U.rateLimit(s.rud, yawCmd * C.rudMax, C.rudRate, dt);

    /* Trimmable horizontal stabiliser. In direct law it follows the trim wheel;
       in normal law the fly-by-wire drives it to unload the elevator. */
    s.ths = U.rateLimit(s.ths, U.clamp(cmd.surfaces.ths, C.thsMin, C.thsMax),
                        C.thsRate, dt);

    /* ---- roll spoilers and speedbrake ----
       Roll spoilers rise on the down-going wing only, above a deadband. Ground
       spoilers deploy everything. Both are the same ten panels. */
    var groundSpoiler = sim.truth.onGround && ctl.groundSpoilers &&
                        (sim.sys.eng[0].revDeploy > 0.1 || ctl.speedbrake > 0.5 ||
                         sim.adr.gs > 40);
    for (var i = 0; i < 10; i++) {
      var left = i < 5;
      var target = 0;
      if (groundSpoiler) target = C.spoilerMax;
      else {
        var sb = ctl.speedbrake * C.spoilerMax * 0.65;
        /* Roll spoilers rise on the wing that is going DOWN, killing its lift to
           help the aileron. Rolling right means the right wing drops, so a
           positive roll command deploys the right-hand panels. */
        var roll = 0;
        if (!left && rollCmd > 0.06) roll = (rollCmd - 0.06) * C.spoilerMax;
        if (left && rollCmd < -0.06) roll = (-rollCmd - 0.06) * C.spoilerMax;
        /* The two innermost panels are speedbrake-only. */
        target = Math.min(C.spoilerMax, sb + (i % 5 >= 1 ? roll : 0));
      }
      s.spoiler[i] = U.rateLimit(s.spoiler[i], target, C.spoilerRate, dt);
    }

    /* ---- flaps and slats ----
       The surfaces travel at a fixed rate, so selecting flap 3 takes about
       eighteen seconds of real time. That delay is a large part of why an
       approach has to be planned rather than flown reactively. */
    var hl = A.highLiftTarget(ctl.flapLever, sim.truth.onGround, sim.adr.ias);
    s.flapTarget = hl.flap; s.slatTarget = hl.slat;
    s.flap = U.rateLimit(s.flap, hl.flap, C.flapRate, dt);
    s.slat = U.rateLimit(s.slat, hl.slat, C.slatRate, dt);
  };

  /* Direct law: stick to surface, with no protection and no auto-trim. What a
     pilot would call "what you ask for is what you get", and the right baseline
     to build the fly-by-wire on top of, because it is the mode the aeroplane
     falls back to when everything else has failed. */
  FlightControls.prototype.directLaw = function (sim, dt) {
    var cmd = sim.cmd, ctl = sim.ctl;
    cmd.law = "direct";
    cmd.surfaces.elev = ctl.stick[0];
    cmd.surfaces.ail = ctl.stick[1];
    cmd.surfaces.rud = ctl.pedals;
    cmd.surfaces.ths = this.thsTrim;
  };

  FlightControls.prototype.trim = function (delta) {
    this.thsTrim = U.clamp(this.thsTrim + delta, BFS.A320.C.thsMin, BFS.A320.C.thsMax);
  };

  return { FlightControls: FlightControls };
})();
