/* sim/atmos.js
   READS:  sim.truth
   WRITES: sim.env.{rho,T,p,a,wind,turb}
   TICK:   fdm, 120Hz
   DEPS:   core/util, core/vecmat */

/* International Standard Atmosphere, plus wind and turbulence.
 *
 * The ISA part is exact rather than tabulated — it is a handful of closed-form
 * expressions and the aerodynamics leans on all of them, so approximating it
 * would be false economy.
 *
 * The turbulence is a Dryden-flavoured shaping filter rather than the real
 * thing: white noise through a first-order lag whose corner frequency scales
 * with airspeed and whose intensity scales with the wind and with proximity to
 * the ground. It is not spectrally exact, but it produces the right *character*
 * — bumps that get sharper as you speed up and rougher in the boundary layer —
 * for a few dozen lines instead of a few hundred.
 */

BFS.Atmos = (function () {
  "use strict";

  var U = BFS.Util, V = BFS.V;

  var T0 = 288.15, P0 = 101325, RHO0 = 1.225;
  var L = 0.0065;                 // troposphere lapse rate, K/m
  var R = 287.05287, G = 9.80665, GAMMA = 1.4;
  var TROPO = 11000;
  var T_TROPO = T0 - L * TROPO;   // 216.65 K
  var P_TROPO = P0 * Math.pow(T_TROPO / T0, G / (L * R));

  /* Pressure and temperature at a geopotential altitude. */
  function isa(out, h, dISA) {
    var T, p;
    if (h < TROPO) {
      T = T0 - L * h;
      p = P0 * Math.pow(T / T0, G / (L * R));
    } else {
      T = T_TROPO;
      p = P_TROPO * Math.exp(-G * (h - TROPO) / (R * T_TROPO));
    }
    T += (dISA || 0);
    out.T = T;
    out.p = p;
    out.rho = p / (R * T);
    out.a = Math.sqrt(GAMMA * R * T);
    return out;
  }

  /* Pressure altitude for a given QNH — what the altimeter reads. */
  function pressureAltitude(h, qnhHpa) {
    var dP = (qnhHpa - 1013.25) * 27.3;   // metres per hPa near sea level
    return h + dP;
  }

  /* True airspeed to indicated, via impact pressure. Compressible form: at 250
     kt below 10,000 ft the incompressible approximation is already 2 kt out, and
     the speed tape is the most-watched instrument in the aeroplane. */
  function tasToIas(tas, rho, p, a) {
    if (tas <= 0.01) return 0;
    var M = tas / a;
    var qc = p * (Math.pow(1 + 0.2 * M * M, 3.5) - 1);
    var x = qc / P0 + 1;
    var v = 1479.1 * Math.sqrt(Math.pow(x, 1 / 3.5) - 1);   // kt
    return v * 0.514444;                                     // m/s
  }

  function Atmosphere() {
    this.dISA = 0;
    this.qnh = 1013.25;
    this.windDirDeg = 240;      // direction the wind comes FROM
    this.windKt = 8;
    this.turbulence = 0.25;     // 0..1
    this.gustState = new Float64Array(3);
    this.gustTarget = new Float64Array(3);
    this._rng = U.rng(0x5eed1a7e);
    this._t = 0;
    this._scratch = { T: 0, p: 0, rho: 0, a: 0 };
  }

  /* Wind at a height above ground, with a boundary-layer profile.
   *
   * The log profile is why crosswind landings behave: the wind at fifty feet is
   * appreciably weaker and backed relative to the wind at a thousand, so the
   * drift you trim out on approach changes under you in the flare. Getting this
   * for free from one logarithm is the best value in the file. */
  Atmosphere.prototype.windAt = function (out, agl) {
    var ref = 10;                                  // reference height, m
    var z0 = 0.15;                                 // roughness length, open country
    var h = Math.max(1.5, agl);
    var scale = Math.log(h / z0) / Math.log(ref / z0);
    scale = U.clamp(scale, 0.25, 1.9);

    /* Ekman backing: surface wind sits maybe 15 degrees off the gradient wind. */
    var back = 15 * (1 - U.clamp(agl / 600, 0, 1)) * U.DEG;
    var dir = (this.windDirDeg + 180) * U.DEG - back;   // direction it blows TOWARD
    var speed = this.windKt * 0.514444 * scale;

    out[0] = Math.sin(dir) * speed;    // east
    out[1] = Math.cos(dir) * speed;    // north
    out[2] = 0;
    return out;
  };

  Atmosphere.prototype.update = function (sim, dt) {
    var e = sim.env, t = sim.truth;
    var h = t.geo[2];

    isa(this._scratch, h, this.dISA);
    e.T = this._scratch.T;
    e.p = this._scratch.p;
    e.rho = this._scratch.rho;
    e.a = this._scratch.a;
    e.qnh = this.qnh;
    e.oat = e.T - 273.15;

    this.windAt(e.wind, t.agl);

    /* Turbulence. The corner frequency rises with airspeed — the same eddy is
       crossed faster, so the bump is sharper — and intensity falls off above the
       boundary layer unless the wind is strong. */
    var tas = V.len3(t.vBody);
    var sigma = this.turbulence * (0.6 + this.windKt * 0.06) *
                (0.45 + 0.55 * Math.exp(-t.agl / 450));
    var tau = U.clamp(140 / Math.max(20, tas), 0.15, 4);

    this._t += dt;
    var r = this._rng;
    this.gustTarget[0] = (r() * 2 - 1) * sigma;
    this.gustTarget[1] = (r() * 2 - 1) * sigma;
    this.gustTarget[2] = (r() * 2 - 1) * sigma * 1.4;   // vertical bumps read strongest

    for (var i = 0; i < 3; i++)
      this.gustState[i] = U.lag(this.gustState[i], this.gustTarget[i], tau, dt);

    V.copy3(e.turb, this.gustState);
  };

  return {
    Atmosphere: Atmosphere,
    isa: isa, pressureAltitude: pressureAltitude, tasToIas: tasToIas,
    T0: T0, P0: P0, RHO0: RHO0, R: R, G: G, GAMMA: GAMMA
  };
})();
