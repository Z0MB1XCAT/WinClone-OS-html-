/* sim/gear.js
   READS:  sim.truth, sim.ctl, sim.mass, sim.env
   WRITES: sim.sys.gear, sim.truth.{agl,onGround,crashed}
   TICK:   fdm, 120Hz
   DEPS:   core/util, core/vecmat, sim/a320_config, terrain/heightfield */

/* Landing gear: oleo struts, tyre friction, brakes and steering.
 *
 * This is the only genuinely stiff part of the simulation. A main gear strut has
 * a spring rate over a million newtons per metre; integrated explicitly at
 * 120 Hz it goes unstable and the aeroplane pogos itself off the runway. The
 * usual fixes are sub-stepping the contact or softening the spring, and both are
 * bad — one is expensive, the other makes every landing feel like a beanbag.
 *
 * Instead the damping is applied implicitly:
 *
 *     v' = (v + (F_spring/m) dt) / (1 + (c/m) dt)
 *
 * That form is unconditionally stable for any damping coefficient at any step
 * size, which means the strut can carry its real rate, the aeroplane sits at the
 * right height, and a firm landing compresses the oleo visibly without any of it
 * being tuned for the integrator's benefit.
 */

BFS.Gear = (function () {
  "use strict";

  var U = BFS.Util, V = BFS.V, C = BFS.A320.C;

  function Gear() {
    this.units = [];
    for (var i = 0; i < C.gear.length; i++) {
      var g = C.gear[i];
      this.units.push({
        cfg: g, stroke: 0, vel: 0, load: 0, wow: false,
        slipRatio: 0, slipAngle: 0, brakeTorque: 0, temp: 40,
        contact: new Float64Array(3)
      });
    }
    this._wp = new Float64Array(3);
    this._f = new Float64Array(3);
    this._r = new Float64Array(3);
    this._up = new Float64Array(3);
    this._vel = new Float64Array(3);
    this._ned = new Float64Array(3);
    this._tmp = new Float64Array(3);
    this.steerAngle = 0;
  }

  /* Height of a body-frame point above the ground, and the ground height under
     it. Terrain is sampled per strut, so a slope tilts the aeroplane correctly
     instead of the whole thing floating at one height. */
  Gear.prototype.groundUnder = function (sim, bodyPos, out) {
    var t = sim.truth;
    V.sub3(this._tmp, bodyPos, sim.mass.cg);
    V.qrot(this._ned, t.quat, this._tmp);          // body offset -> NED
    V.nedToEnu(this._wp, this._ned);                // -> ENU offset

    /* Convert the horizontal offset to a geodetic delta. Small angles: at these
       distances the flat-earth approximation is exact to well under a
       millimetre. */
    var dLat = this._wp[1] / 111320;
    var dLon = this._wp[0] / (111320 * Math.cos(t.geo[0] * U.DEG));
    var lat = t.geo[0] + dLat, lon = t.geo[1] + dLon;
    var ground = BFS.Height.at(lat, lon);
    out[0] = lat; out[1] = lon; out[2] = ground;
    return t.geo[2] + this._wp[2] - ground;        // height of the point above ground
  };

  Gear.prototype.update = function (sim, body, dt) {
    var t = sim.truth, gs = sim.sys.gear;
    var m = sim.mass.m;

    /* Gear position: eight seconds down, twelve up, and nothing moves without
       hydraulic pressure — which in Phase 1 is always available. */
    var want = sim.ctl.gearLever;
    for (var k = 0; k < 3; k++) {
      var rate = want > gs.pos[k] ? 1 / 8 : -1 / 12;
      gs.pos[k] = U.clamp(gs.pos[k] + rate * dt, 0, 1);
    }

    /* Nosewheel steering: the tiller has full authority, the rudder pedals a
       few degrees for runway alignment. Both wash out with speed. */
    var speedKt = (sim.aero.vmag || 0) * 1.94384;
    var pedalAuth = U.lerp(6, 0, U.clamp((speedKt - 20) / 60, 0, 1));
    var steerCmd = sim.ctl.tiller * C.gear[0].steer + sim.ctl.pedals * pedalAuth;
    this.steerAngle = U.rateLimit(this.steerAngle, steerCmd * U.DEG, 25 * U.DEG, dt);

    var anyWow = false, minAgl = 1e9;
    var vBody = t.vBody, om = t.omega, cg = sim.mass.cg;

    for (var i = 0; i < this.units.length; i++) {
      var u = this.units[i], cfg = u.cfg;

      /* A retracted strut is not in contact with anything. */
      if (gs.pos[i] < 0.98) {
        u.wow = false; u.load = 0; u.stroke = U.lag(u.stroke, 0, 0.4, dt);
        gs.wow[i] = false; gs.stroke[i] = u.stroke;
        continue;
      }

      var h = this.groundUnder(sim, cfg.pos, u.contact) - cfg.radius;
      if (h < minAgl) minAgl = h;

      var compression = -h;
      if (compression <= 0) {
        u.wow = false; u.load = 0;
        u.stroke = U.lag(u.stroke, 0, 0.25, dt);
        gs.wow[i] = false; gs.stroke[i] = u.stroke;
        continue;
      }

      u.wow = true; anyWow = true;
      u.stroke = Math.min(compression, cfg.travel);

      /* Velocity of this contact point, body axes, then the component along the
         strut. */
      var rx = cfg.pos[0] - cg[0], ry = cfg.pos[1] - cg[1], rz = cfg.pos[2] - cg[2];
      var pvx = vBody[0] + (om[1] * rz - om[2] * ry);
      var pvy = vBody[1] + (om[2] * rx - om[0] * rz);
      var pvz = vBody[2] + (om[0] * ry - om[1] * rx);

      /* Strut axis is body -z (up). Compression rate is +pvz. */
      var vComp = pvz;

      /* Spring: progressive past 80% travel, so a heavy arrival meets a rising
         rate instead of a hard stop. */
      var x = u.stroke;
      var over = Math.max(0, x - cfg.travel * 0.8);
      var Fspring = cfg.k * x + cfg.k * 12 * over * over;

      /* Implicit damping, as described above. */
      var Fdamp = cfg.c * vComp;
      var Fn = Fspring + Fdamp / (1 + (cfg.c / m) * dt);
      Fn = Math.max(0, Fn);

      if (Fn > cfg.maxLoad * 2.4) t.crashed = true;
      u.load = Fn;

      /* Tyre friction. Longitudinal force follows a slip curve peaking near
         twelve percent slip; beyond that it falls away, which is what antiskid
         exists to prevent and why locked wheels stop you less well. */
      var rollDir = 1, lateral;
      var steer = (cfg.steer ? this.steerAngle : 0);
      var cs = Math.cos(steer), sn = Math.sin(steer);
      var vRoll = pvx * cs + pvy * sn;         // along the wheel
      lateral = -pvx * sn + pvy * cs;          // across it

      var brakeCmd = 0;
      if (cfg.brake) {
        brakeCmd = i === 1 ? sim.ctl.brakeL : sim.ctl.brakeR;
        if (sim.ctl.parkBrake) brakeCmd = 1;
        if (gs.autobrake > 0 && sim.truth.onGround && !sim.ctl.parkBrake)
          brakeCmd = Math.max(brakeCmd, [0, 0.35, 0.6, 1][gs.autobrake]);
      }

      var speed = Math.max(0.4, Math.abs(vRoll));
      var slip = U.clamp(brakeCmd * 1.4, 0, 1);
      /* Antiskid: hold the slip at the peak of the curve rather than letting it
         run away to a locked wheel. */
      var slipEff = Math.min(slip, C.slipPeak * 3.2);
      u.slipRatio = slipEff;
      var muLong = C.muBrake * Math.sin(Math.min(Math.PI / 2, (slipEff / C.slipPeak) * 1.15));
      var Fbrake = -Math.sign(vRoll) * muLong * Fn * (brakeCmd > 0.01 ? 1 : 0);

      /* Rolling resistance, and the free-rolling case. */
      var Froll = -Math.sign(vRoll) * Math.min(Math.abs(vRoll) * 400, 0.018 * Fn);

      /* Lateral: a cornering-stiffness model, saturating at the friction
         circle. This is what stops the aeroplane sliding sideways on the
         runway and what makes a crosswind landing track. */
      var slipAngle = Math.atan2(lateral, speed);
      u.slipAngle = slipAngle;
      var Flat = -U.clamp(C.corneringStiffness * slipAngle, -C.muDry * Fn, C.muDry * Fn);
      if (Math.abs(vRoll) < 0.3 && Math.abs(lateral) < 0.3) Flat = -lateral * m * 0.6;

      var fLong = Fbrake + Froll;

      /* Rotate the wheel-frame forces back into body axes. */
      var fx = fLong * cs - Flat * sn;
      var fy = fLong * sn + Flat * cs;

      V.set3(this._f, fx, fy, -Fn);
      V.set3(this._r, cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      body.addForceAt(this._f, this._r, cg);

      if (cfg.brake) {
        var work = Math.abs(Fbrake * vRoll);
        u.temp = U.lag(u.temp + work * 4e-6, sim.env.oat + 25, 240, dt);
        gs.brakeTemp[i - 1] = u.temp;
      }

      gs.wow[i] = true;
      gs.stroke[i] = u.stroke;
    }

    t.onGround = anyWow;
    t.agl = Math.max(0, minAgl === 1e9 ? this.groundUnder(sim, C.gear[1].pos, this._tmp) : minAgl);
  };

  return { Gear: Gear };
})();
