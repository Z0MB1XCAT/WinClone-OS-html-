/* sim/rigidbody.js
   READS:  sim.env, sim.mass, sim.aero, sim.sys.eng
   WRITES: sim.truth.{geo,vBody,vEnu,quat,omega,accel,roll,pitch,hdg,gs,vs,trk,fpa}
   TICK:   fdm, 120Hz
   DEPS:   core/util, core/vecmat, sim/a320_config, sim/atmos

   Six-degree-of-freedom integration. Attitude is body(forward-right-down) to
   NED; position is geodetic and stays in float64 throughout. */

BFS.Body = (function () {
  "use strict";

  var U = BFS.Util, V = BFS.V, C = BFS.A320.C;
  var G = 9.80665, A_E = 6378137.0, E2 = 0.00669437999014;

  function RigidBody() {
    this.force = new Float64Array(3);     // body axes, N
    this.moment = new Float64Array(3);    // body axes, N m
    this._g = new Float64Array(3);
    this._acc = new Float64Array(3);
    this._ned = new Float64Array(3);
    this._tmp = new Float64Array(3);
    this._Iinv = new Float64Array(9);
    this._lastMass = -1;
    this._lastIxx = -1;
  }

  RigidBody.prototype.reset = function () {
    V.set3(this.force, 0, 0, 0);
    V.set3(this.moment, 0, 0, 0);
  };

  RigidBody.prototype.addForce = function (f) {
    this.force[0] += f[0]; this.force[1] += f[1]; this.force[2] += f[2];
  };
  RigidBody.prototype.addMoment = function (m) {
    this.moment[0] += m[0]; this.moment[1] += m[1]; this.moment[2] += m[2];
  };

  /* Force applied at a point, relative to the centre of gravity. */
  RigidBody.prototype.addForceAt = function (f, r, cg) {
    this.force[0] += f[0]; this.force[1] += f[1]; this.force[2] += f[2];
    var rx = r[0] - cg[0], ry = r[1] - cg[1], rz = r[2] - cg[2];
    this.moment[0] += ry * f[2] - rz * f[1];
    this.moment[1] += rz * f[0] - rx * f[2];
    this.moment[2] += rx * f[1] - ry * f[0];
  };

  /* Invert the inertia tensor. Only Ixx, Iyy, Izz and the Ixz cross term are
     non-zero on a symmetric aeroplane, so this is a 2x2 inverse in the x-z plane
     and a scalar in y. Recomputed only when the mass properties actually move. */
  function inverseInertia(out, I) {
    var Ixx = I[0], Iyy = I[4], Izz = I[8], Ixz = I[2];
    var det = Ixx * Izz - Ixz * Ixz;
    out.fill(0);
    out[0] = Izz / det;
    out[2] = Ixz / det;
    out[4] = 1 / Iyy;
    out[6] = Ixz / det;
    out[8] = Ixx / det;
    return out;
  }

  /* Semi-implicit Euler. Not Runge-Kutta: the only genuinely stiff thing in the
     simulation is the landing gear, and gear.js handles that with implicit
     damping instead. Spending four aerodynamic evaluations per step to fix a
     problem that is not in the aerodynamics would be a poor trade. */
  RigidBody.prototype.integrate = function (sim, dt) {
    var t = sim.truth, m = sim.mass;

    if (m.m !== this._lastMass || m.I[0] !== this._lastIxx) {
      inverseInertia(this._Iinv, m.I);
      this._lastMass = m.m; this._lastIxx = m.I[0];
    }

    /* Gravity, rotated into body axes. */
    V.set3(this._tmp, 0, 0, G);
    V.qrotInv(this._g, t.quat, this._tmp);

    var invM = 1 / m.m;
    var ax = this.force[0] * invM, ay = this.force[1] * invM, az = this.force[2] * invM;

    /* Specific force — what an accelerometer reads, and therefore what the load
       factor on the display comes from. Gravity is deliberately excluded. */
    V.set3(t.accel, ax, ay, az);
    sim.aero.load = -az / G;

    ax += this._g[0]; ay += this._g[1]; az += this._g[2];

    var vb = t.vBody, om = t.omega;

    /* Coriolis from working in a rotating body frame: a = F/m - omega x v. */
    var cx = om[1] * vb[2] - om[2] * vb[1];
    var cy = om[2] * vb[0] - om[0] * vb[2];
    var cz = om[0] * vb[1] - om[1] * vb[0];

    vb[0] += (ax - cx) * dt;
    vb[1] += (ay - cy) * dt;
    vb[2] += (az - cz) * dt;

    /* Angular acceleration, with the gyroscopic term. omega x (I omega) is what
       couples roll rate into pitch on a body whose inertias differ — small in
       normal flight, and the difference between a plausible and an implausible
       departure when they are not. */
    var I = m.I;
    var Ix = I[0] * om[0] + I[2] * om[2];
    var Iy = I[4] * om[1];
    var Iz = I[8] * om[2] + I[2] * om[0];

    var gx = om[1] * Iz - om[2] * Iy;
    var gy = om[2] * Ix - om[0] * Iz;
    var gz = om[0] * Iy - om[1] * Ix;

    var mx = this.moment[0] - gx, my = this.moment[1] - gy, mz = this.moment[2] - gz;
    var Ii = this._Iinv;

    om[0] += (Ii[0] * mx + Ii[2] * mz) * dt;
    om[1] += (Ii[4] * my) * dt;
    om[2] += (Ii[6] * mx + Ii[8] * mz) * dt;

    /* Attitude. */
    V.qIntegrate(t.quat, t.quat, om, dt);

    /* Position. Body velocity to NED, then geodetic rates using the meridional
       and prime-vertical radii of curvature — exact rather than a spherical
       approximation, which matters over a long cruise leg. */
    V.qrot(this._ned, t.quat, vb);
    var lat = t.geo[0] * U.DEG;
    var sLat = Math.sin(lat), cLat = Math.cos(lat);
    var w = 1 - E2 * sLat * sLat;
    var M = A_E * (1 - E2) / Math.pow(w, 1.5);
    var N = A_E / Math.sqrt(w);
    var h = t.geo[2];

    t.geo[0] += (this._ned[0] / (M + h)) * U.RAD * dt;
    t.geo[1] += (this._ned[1] / ((N + h) * Math.max(1e-6, cLat))) * U.RAD * dt;
    t.geo[2] += -this._ned[2] * dt;

    if (t.geo[1] > 180) t.geo[1] -= 360;
    if (t.geo[1] < -180) t.geo[1] += 360;

    V.nedToEnu(t.vEnu, this._ned);
  };

  /* Euler angles and derived flight-path quantities, in physical truth. What the
     aeroplane *believes* about these is adirs.js's business, not ours. */
  var _eul = new Float64Array(3);
  RigidBody.prototype.derive = function (sim) {
    var t = sim.truth;
    V.qToEuler(_eul, t.quat);
    t.roll = _eul[0];
    t.pitch = _eul[1];
    t.hdg = U.wrap2Pi(_eul[2]);
    t.gs = Math.hypot(t.vEnu[0], t.vEnu[1]);
    t.vs = t.vEnu[2];
    t.trk = U.wrap2Pi(Math.atan2(t.vEnu[0], t.vEnu[1]));
    t.fpa = t.gs > 1 ? Math.atan2(t.vEnu[2], t.gs) : 0;
  };

  return { RigidBody: RigidBody, G: G, inverseInertia: inverseInertia };
})();
