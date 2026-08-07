/* core/vecmat.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   - */

/* Vector, matrix and quaternion maths.
 *
 * Two rules, both load-bearing:
 *
 *  1. Everything here is Float64. The simulator's positions are metres in an
 *     Earth-sized frame and its attitude is integrated 120 times a second;
 *     float32 loses the argument on both counts. Only the last step before the
 *     GPU downcasts, and that happens in gfx/, not here.
 *
 *  2. Every operation takes an explicit `out` and returns it. Nothing in this
 *     file allocates. The flight model evaluates ~82 strips per step at 120 Hz,
 *     and an allocating vector library turns that into a garbage-collection
 *     stutter you will spend a day misdiagnosing as a physics bug.
 *
 * Convention: body axes are x forward, y right, z down (standard aircraft body
 * frame). World render axes are ENU: x east, y north, z up. geo.js owns the
 * conversion between them.
 */

BFS.V = (function () {
  "use strict";

  function v3(x, y, z) { var a = new Float64Array(3); a[0] = x || 0; a[1] = y || 0; a[2] = z || 0; return a; }
  function set3(o, x, y, z) { o[0] = x; o[1] = y; o[2] = z; return o; }
  function copy3(o, a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; return o; }
  function add3(o, a, b) { o[0] = a[0] + b[0]; o[1] = a[1] + b[1]; o[2] = a[2] + b[2]; return o; }
  function sub3(o, a, b) { o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; }
  function scale3(o, a, s) { o[0] = a[0] * s; o[1] = a[1] * s; o[2] = a[2] * s; return o; }
  function addScaled3(o, a, b, s) { o[0] = a[0] + b[0] * s; o[1] = a[1] + b[1] * s; o[2] = a[2] + b[2] * s; return o; }
  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function len3(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  function len3sq(a) { return a[0] * a[0] + a[1] * a[1] + a[2] * a[2]; }

  function cross3(o, a, b) {
    var x = a[1] * b[2] - a[2] * b[1],
        y = a[2] * b[0] - a[0] * b[2],
        z = a[0] * b[1] - a[1] * b[0];
    o[0] = x; o[1] = y; o[2] = z; return o;
  }
  function norm3(o, a) {
    var l = len3(a);
    if (l < 1e-12) { o[0] = 0; o[1] = 0; o[2] = 0; return o; }
    var s = 1 / l; o[0] = a[0] * s; o[1] = a[1] * s; o[2] = a[2] * s; return o;
  }
  function lerp3(o, a, b, t) {
    o[0] = a[0] + (b[0] - a[0]) * t;
    o[1] = a[1] + (b[1] - a[1]) * t;
    o[2] = a[2] + (b[2] - a[2]) * t;
    return o;
  }

  /* ------------------------------------------------------------ quaternions
     Stored [w, x, y, z]. Rotations take a vector from body frame to parent. */

  function quat() { var q = new Float64Array(4); q[0] = 1; return q; }
  function qset(o, w, x, y, z) { o[0] = w; o[1] = x; o[2] = y; o[3] = z; return o; }
  function qcopy(o, q) { o[0] = q[0]; o[1] = q[1]; o[2] = q[2]; o[3] = q[3]; return o; }

  function qmul(o, a, b) {
    var aw = a[0], ax = a[1], ay = a[2], az = a[3],
        bw = b[0], bx = b[1], by = b[2], bz = b[3];
    o[0] = aw * bw - ax * bx - ay * by - az * bz;
    o[1] = aw * bx + ax * bw + ay * bz - az * by;
    o[2] = aw * by - ax * bz + ay * bw + az * bx;
    o[3] = aw * bz + ax * by - ay * bx + az * bw;
    return o;
  }
  function qnorm(o, q) {
    var l = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    if (l < 1e-12) return qset(o, 1, 0, 0, 0);
    var s = 1 / l; o[0] = q[0] * s; o[1] = q[1] * s; o[2] = q[2] * s; o[3] = q[3] * s; return o;
  }
  function qconj(o, q) { o[0] = q[0]; o[1] = -q[1]; o[2] = -q[2]; o[3] = -q[3]; return o; }

  /* Rotate v by q (body -> parent). */
  function qrot(o, q, v) {
    var w = q[0], x = q[1], y = q[2], z = q[3],
        vx = v[0], vy = v[1], vz = v[2];
    var tx = 2 * (y * vz - z * vy),
        ty = 2 * (z * vx - x * vz),
        tz = 2 * (x * vy - y * vx);
    o[0] = vx + w * tx + (y * tz - z * ty);
    o[1] = vy + w * ty + (z * tx - x * tz);
    o[2] = vz + w * tz + (x * ty - y * tx);
    return o;
  }
  /* Rotate v by the inverse of q (parent -> body). */
  function qrotInv(o, q, v) {
    var w = -q[0], x = q[1], y = q[2], z = q[3],
        vx = v[0], vy = v[1], vz = v[2];
    var tx = 2 * (y * vz - z * vy),
        ty = 2 * (z * vx - x * vz),
        tz = 2 * (x * vy - y * vx);
    o[0] = vx + w * tx + (y * tz - z * ty);
    o[1] = vy + w * ty + (z * tx - x * tz);
    o[2] = vz + w * tz + (x * ty - y * tx);
    return o;
  }

  /* Integrate a body-rate vector into an attitude quaternion. First order is
     ample at 120 Hz; the renormalisation is what actually keeps it honest. */
  function qIntegrate(o, q, omega, dt) {
    var hx = omega[0] * dt * 0.5, hy = omega[1] * dt * 0.5, hz = omega[2] * dt * 0.5;
    var w = q[0], x = q[1], y = q[2], z = q[3];
    o[0] = w + (-x * hx - y * hy - z * hz);
    o[1] = x + (w * hx + y * hz - z * hy);
    o[2] = y + (w * hy - x * hz + z * hx);
    o[3] = z + (w * hz + x * hy - y * hx);
    return qnorm(o, o);
  }

  function qSlerp(o, a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1;
    if (d < 0) { d = -d; s = -1; }
    if (d > 0.9995) {
      for (var i = 0; i < 4; i++) o[i] = a[i] + (b[i] * s - a[i]) * t;
      return qnorm(o, o);
    }
    var th = Math.acos(d), st = Math.sin(th),
        wa = Math.sin((1 - t) * th) / st, wb = Math.sin(t * th) / st * s;
    for (var j = 0; j < 4; j++) o[j] = a[j] * wa + b[j] * wb;
    return o;
  }

  /* Aerospace 3-2-1: yaw about down, then pitch, then roll. */
  function qFromEuler(o, roll, pitch, yaw) {
    var cr = Math.cos(roll * 0.5), sr = Math.sin(roll * 0.5),
        cp = Math.cos(pitch * 0.5), sp = Math.sin(pitch * 0.5),
        cy = Math.cos(yaw * 0.5), sy = Math.sin(yaw * 0.5);
    o[0] = cr * cp * cy + sr * sp * sy;
    o[1] = sr * cp * cy - cr * sp * sy;
    o[2] = cr * sp * cy + sr * cp * sy;
    o[3] = cr * cp * sy - sr * sp * cy;
    return o;
  }
  /* -> [roll, pitch, yaw]; pitch is clamped at the poles rather than producing NaN. */
  function qToEuler(o, q) {
    var w = q[0], x = q[1], y = q[2], z = q[3];
    o[0] = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
    var s = 2 * (w * y - z * x);
    o[1] = Math.asin(s < -1 ? -1 : s > 1 ? 1 : s);
    o[2] = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
    return o;
  }

  /* ---------------------------------------------------------------- mat4
     Column-major, the layout WebGL wants. */

  function mat4() {
    var m = new Float64Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }
  function mIdent(o) {
    o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o;
  }
  function mMul(o, a, b) {
    for (var c = 0; c < 4; c++) {
      var b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  }
  function mTranslate(o, x, y, z) { mIdent(o); o[12] = x; o[13] = y; o[14] = z; return o; }
  function mScale(o, x, y, z) { mIdent(o); o[0] = x; o[5] = y; o[10] = z; return o; }

  function mFromQuat(o, q, tx, ty, tz) {
    var w = q[0], x = q[1], y = q[2], z = q[3];
    var x2 = x + x, y2 = y + y, z2 = z + z;
    var xx = x * x2, xy = x * y2, xz = x * z2,
        yy = y * y2, yz = y * z2, zz = z * z2,
        wx = w * x2, wy = w * y2, wz = w * z2;
    o[0] = 1 - (yy + zz); o[1] = xy + wz;       o[2] = xz - wy;       o[3] = 0;
    o[4] = xy - wz;       o[5] = 1 - (xx + zz); o[6] = yz + wx;       o[7] = 0;
    o[8] = xz + wy;       o[9] = yz - wx;       o[10] = 1 - (xx + yy); o[11] = 0;
    o[12] = tx || 0;      o[13] = ty || 0;      o[14] = tz || 0;       o[15] = 1;
    return o;
  }

  function mPerspective(o, fovY, aspect, near, far) {
    var f = 1 / Math.tan(fovY * 0.5);
    o.fill(0);
    o[0] = f / aspect; o[5] = f; o[11] = -1;
    o[10] = (far + near) / (near - far);
    o[14] = (2 * far * near) / (near - far);
    return o;
  }

  /* Right-handed look-at. `eye`, `target`, `up` are ENU vectors. */
  function mLookAt(o, eye, target, up) {
    var fx = target[0] - eye[0], fy = target[1] - eye[1], fz = target[2] - eye[2];
    var rl = 1 / Math.hypot(fx, fy, fz); fx *= rl; fy *= rl; fz *= rl;
    var sx = fy * up[2] - fz * up[1],
        sy = fz * up[0] - fx * up[2],
        sz = fx * up[1] - fy * up[0];
    var sl = Math.hypot(sx, sy, sz); if (sl < 1e-9) sl = 1;
    sx /= sl; sy /= sl; sz /= sl;
    var ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
    o[0] = sx; o[4] = sy; o[8] = sz;  o[12] = -(sx * eye[0] + sy * eye[1] + sz * eye[2]);
    o[1] = ux; o[5] = uy; o[9] = uz;  o[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
    o[2] = -fx; o[6] = -fy; o[10] = -fz; o[14] = (fx * eye[0] + fy * eye[1] + fz * eye[2]);
    o[3] = 0; o[7] = 0; o[11] = 0; o[15] = 1;
    return o;
  }

  /* Attitude is stored as body(forward-right-down) -> NED, the aerospace
     convention, because that is the frame Euler angles and the whole flight
     dynamics literature are defined in. Rendering wants ENU. The two differ by
     an axis swap and a sign, so converting is cheaper than carrying a second
     attitude representation and keeping them in step. */
  function nedToEnu(o, v) { var n = v[0], e = v[1], d = v[2]; o[0] = e; o[1] = n; o[2] = -d; return o; }
  function enuToNed(o, v) { var e = v[0], n = v[1], u = v[2]; o[0] = n; o[1] = e; o[2] = -u; return o; }

  /* The only sanctioned float64 -> float32 crossing. Matrices are built in
     double precision on the CPU with the camera already subtracted out, and are
     downcast once, here, on the way to the GPU. */
  function toF32(out32, m) { for (var i = 0; i < m.length; i++) out32[i] = m[i]; return out32; }

  return {
    v3: v3, set3: set3, copy3: copy3, add3: add3, sub3: sub3, scale3: scale3,
    addScaled3: addScaled3, dot3: dot3, cross3: cross3, norm3: norm3, lerp3: lerp3,
    len3: len3, len3sq: len3sq,
    quat: quat, qset: qset, qcopy: qcopy, qmul: qmul, qnorm: qnorm, qconj: qconj,
    qrot: qrot, qrotInv: qrotInv, qIntegrate: qIntegrate, qSlerp: qSlerp,
    qFromEuler: qFromEuler, qToEuler: qToEuler,
    mat4: mat4, mIdent: mIdent, mMul: mMul, mTranslate: mTranslate, mScale: mScale,
    mFromQuat: mFromQuat, mPerspective: mPerspective, mLookAt: mLookAt, toF32: toF32,
    nedToEnu: nedToEnu, enuToNed: enuToNed
  };
})();
