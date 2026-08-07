/* av/adirs.js
   READS:  sim.truth, sim.env, sim.aero
   WRITES: sim.adr
   TICK:   sys, 30Hz
   DEPS:   core/util, sim/atmos */

/* Air data and inertial reference.
 *
 * This is the only module in the simulator permitted to read `sim.truth` and
 * write `sim.adr`. Everything downstream — displays, autoflight, fly-by-wire,
 * warnings — reads `adr` and never touches truth.
 *
 * Today that separation buys almost nothing: the sensors are honest, and adr is
 * a lagged copy of reality. The reason to build it now anyway is that it is the
 * one architectural decision here that is expensive to add later. Once the
 * fly-by-wire laws, six display pages and a dozen autopilot modes are all
 * reading truth directly, making the aeroplane capable of being *wrong* means
 * touching every one of them. Built in from the start, an unreliable-airspeed
 * failure is a few lines in this file and the rest of the aeroplane reacts
 * correctly on its own — including degrading its own control laws, because the
 * fly-by-wire is downstream of the same data.
 */

BFS.ADIRS = (function () {
  "use strict";

  var U = BFS.Util, Atmos = BFS.Atmos;

  function ADIRS() {
    this.aligned = true;      // Phase 3 gives this an eight-minute alignment
    this.alignTime = 0;
    this._iasFilt = 0;
    this._vsFilt = 0;
    this._altFilt = 0;
  }

  ADIRS.prototype.update = function (sim, dt) {
    var t = sim.truth, env = sim.env, a = sim.adr;

    /* True airspeed is the speed through the air mass, not over the ground —
       the distinction the wind makes, and the reason a groundspeed readout and
       an airspeed readout disagree. */
    var tas = sim.aero.vmag || 0;

    var ias = Atmos.tasToIas(tas, env.rho, env.p, env.a);
    /* Pitot-static lag. Small, but it is why the speed tape does not snap. */
    this._iasFilt = U.lag(this._iasFilt, ias, 0.30, dt);

    a.tas = tas * 1.94384;
    a.ias = this._iasFilt * 1.94384;
    a.mach = sim.aero.mach || 0;
    a.gs = (t.gs || 0) * 1.94384;

    /* Barometric altitude, referenced to the altimeter setting. Standard
       altitude ignores it, which is what the aeroplane climbs on above the
       transition altitude. */
    var qnhCorrection = (env.qnh - 1013.25) * 8.23;   // metres per hPa
    this._altFilt = U.lag(this._altFilt, t.geo[2], 0.15, dt);
    a.altBaro = (this._altFilt - qnhCorrection + (env.qnh - 1013.25) * 8.23) / 0.3048;
    a.altStd = (this._altFilt) / 0.3048;

    /* Radio altimeter: only meaningful below 2,500 feet, as on the aeroplane. */
    var raltFt = t.agl / 0.3048;
    a.ralt = raltFt < 2500 ? raltFt : -1;

    a.pitch = (t.pitch || 0) * U.RAD;
    a.roll = (t.roll || 0) * U.RAD;
    a.hdgTrue = U.wrap360((t.hdg || 0) * U.RAD);
    a.hdgMag = U.wrap360(a.hdgTrue - BFS.Geo.magVarUK(t.geo[0], t.geo[1]));
    a.trk = U.wrap360((t.trk || 0) * U.RAD);
    a.trkMag = U.wrap360(a.trk - BFS.Geo.magVarUK(t.geo[0], t.geo[1]));

    /* Vertical speed is heavily filtered on a real aeroplane — an unfiltered one
       is unusable in turbulence. */
    this._vsFilt = U.lag(this._vsFilt, (t.vs || 0) * 196.85, 1.1, dt);
    a.vs = this._vsFilt;
    a.fpa = (t.fpa || 0) * U.RAD;

    a.aoa = (sim.aero.alpha || 0) * U.RAD;
    a.slip = (sim.aero.beta || 0) * U.RAD;
    a.load = sim.aero.load || 1;
    a.onGround = t.onGround;

    a.valid.adr1 = a.valid.adr2 = true;
    a.valid.ir1 = a.valid.ir2 = this.aligned;
  };

  /* Characteristic speeds. VLS and the stall speed scale with the square root of
     weight, which is why the approach speed changes with the load — a thing that
     falls out of the physics rather than being tabulated. */
  ADIRS.prototype.speeds = function (sim) {
    var C = BFS.A320.C;
    var w = sim.mass.m;
    var conf = sim.ctl.flapLever;
    /* Reference stall speeds at 60 tonnes, by configuration. */
    var vs1g = [118, 106, 100, 96, 92][conf] || 118;
    var scale = Math.sqrt(w / 60000);
    var vs = vs1g * scale;
    return {
      vs1g: vs,
      vls: vs * 1.13,
      vAlphaProt: vs * 1.10,
      vAlphaMax: vs * 1.03,
      vfeNext: C.vfe[Math.min(4, conf + 1)],
      vmax: sim.truth.onGround ? C.vmo : Math.min(C.vmo, C.vfe[conf] || C.vmo),
      vapp: vs * 1.23,
      green: Math.round(vs * 1.28 + sim.mass.m / 4000)
    };
  };

  return { ADIRS: ADIRS };
})();
