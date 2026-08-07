/* sim/massbalance.js
   READS:  sim.sys.fuel, sim.ctl
   WRITES: sim.mass.{m,zfw,gw,cg,cgPctMac,I,fuel}
   TICK:   sys, 30Hz
   DEPS:   core/util, sim/a320_config */

/* Weight, balance and inertia.
 *
 * Fuel is tracked per tank rather than as a single number, because the tanks are
 * in different places: burning the centre tank first moves the centre of gravity
 * aft, and an asymmetric wing burn produces a rolling moment the pilot has to
 * hold off. Both fall out of tracking them separately and cost nothing extra.
 *
 * Inertia scales with load rather than being fixed. It is not a refinement: a
 * fully loaded A320 rolls appreciably more slowly than an empty one, and with a
 * constant tensor the aeroplane feels identically nimble at 78 tonnes and 45.
 */

BFS.MassBalance = (function () {
  "use strict";

  var U = BFS.Util, C = BFS.A320.C;

  /* Tank centroids in body axes, metres from the datum. The wing tanks sit
     outboard and slightly aft of the datum; the centre tank is in the wingbox,
     essentially on it. */
  var TANKS = {
    left:   { pos: [1.20, -6.2, 0.75], cap: C.tankWing },
    right:  { pos: [1.20, 6.2, 0.75], cap: C.tankWing },
    centre: { pos: [1.40, 0, 0.95], cap: C.tankCentre }
  };

  /* Dry aeroplane: empty structure plus payload, as a single lumped mass.
   *
   * The empty CG is placed so that a typical load lands at 27% MAC — but the
   * constraint that actually matters is physical rather than cosmetic. The
   * centre of gravity has to sit about a metre forward of the main gear at
   * x = -0.11, because that is what puts roughly eight percent of the weight on
   * the nosewheel. Put it aft of the mains and the aeroplane tips onto its tail
   * at the stand, which is exactly what it did before these numbers were
   * checked against each other. */
  var OEW_CG = [0.87, 0, 0.15];
  var MAC_LE = 2.03;       // body x of the leading edge of the mean aerodynamic chord

  function init(sim, opts) {
    opts = opts || {};
    var f = sim.mass.fuel;
    var block = opts.fuel !== undefined ? opts.fuel : 5200;   // kg, a short sector
    /* Wings fill first and are used last — the real feed order, and the reason
       the wings are not empty when the centre tank is. */
    f.centre = Math.max(0, Math.min(C.tankCentre, block - 2 * C.tankWing));
    var rest = block - f.centre;
    f.left = f.right = Math.max(0, rest / 2);
    sim.mass.payload = opts.payload !== undefined ? opts.payload : 13500;
    update(sim);
  }

  function update(sim) {
    var m = sim.mass, f = m.fuel;
    f.total = f.left + f.right + f.centre;

    var dry = C.oew + (m.payload || 0);
    m.zfw = dry;
    m.m = dry + f.total;
    m.gw = m.m;

    /* Centre of gravity: the mass-weighted mean of the dry aeroplane and each
       tank. */
    var mx = OEW_CG[0] * dry, my = OEW_CG[1] * dry, mz = OEW_CG[2] * dry;
    for (var k in TANKS) {
      if (!TANKS.hasOwnProperty(k)) continue;
      var q = f[k], p = TANKS[k].pos;
      mx += p[0] * q; my += p[1] * q; mz += p[2] * q;
    }
    var inv = 1 / m.m;
    m.cg[0] = mx * inv; m.cg[1] = my * inv; m.cg[2] = mz * inv;

    /* Percent MAC, the number that actually appears on the loadsheet. Body x
       runs forward, so a more negative x is further aft. */
    m.cgPctMac = ((MAC_LE - m.cg[0]) / C.mac) * 100;

    /* Inertia. Structure scales with the square of the loading ratio in roll,
       where the fuel is far outboard, and closer to linearly in pitch and yaw
       where it is not. Plus the parallel-axis contribution of each tank about
       the current CG, which is what makes an asymmetric fuel state feel wrong in
       roll rather than merely being wrong on a gauge. */
    var ratio = m.m / C.oew;
    var I = m.I;
    I.fill(0);
    I[0] = C.Ixx * (0.55 + 0.45 * ratio);
    I[4] = C.Iyy * (0.60 + 0.40 * ratio);
    I[8] = C.Izz * (0.58 + 0.42 * ratio);
    I[2] = I[6] = C.Ixz * ratio;

    for (var k2 in TANKS) {
      if (!TANKS.hasOwnProperty(k2)) continue;
      var q2 = f[k2];
      if (q2 < 1) continue;
      var p2 = TANKS[k2].pos;
      var dx = p2[0] - m.cg[0], dy = p2[1] - m.cg[1], dz = p2[2] - m.cg[2];
      I[0] += q2 * (dy * dy + dz * dz);
      I[4] += q2 * (dx * dx + dz * dz);
      I[8] += q2 * (dx * dx + dy * dy);
      I[2] -= q2 * dx * dz;
      I[6] = I[2];
    }
  }

  /* Draw fuel for one engine over dt. Wing tanks feed their own side; the centre
     tank, when it has anything in it, feeds both and is used first. */
  function burn(sim, side, kgPerSec, dt) {
    var f = sim.mass.fuel;
    var want = kgPerSec * dt;
    if (want <= 0) return 0;

    var taken = 0;
    if (f.centre > 0.5) {
      var fromCentre = Math.min(f.centre, want);
      f.centre -= fromCentre; taken += fromCentre; want -= fromCentre;
    }
    if (want > 0) {
      var tank = side === 0 ? "left" : "right";
      var fromWing = Math.min(f[tank], want);
      f[tank] -= fromWing; taken += fromWing; want -= fromWing;
      /* Crossfeed is a Phase 3 concern; until then the other wing keeps the
         engine alight rather than flaming out for want of a valve. */
      if (want > 0) {
        var other = side === 0 ? "right" : "left";
        var x = Math.min(f[other], want);
        f[other] -= x; taken += x;
      }
    }
    return taken;
  }

  return { init: init, update: update, burn: burn, TANKS: TANKS, MAC_LE: MAC_LE };
})();
