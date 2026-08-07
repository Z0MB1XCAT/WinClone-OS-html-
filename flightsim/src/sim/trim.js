/* sim/trim.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util, core/vecmat, sim/a320_config, sim/aero_strips,
           sim/atmos, sim/engine_cfm56, sim/massbalance

   Finds the attitude, stabiliser setting and thrust that hold a steady flight
   condition. */

/* Two jobs, and they are the same job.
 *
 * A preset has to start the aeroplane in trim, or it pitches and sinks the
 * moment you take the controls — which is exactly what the Phase 1 approach
 * preset did, arriving on short final descending at five thousand feet a
 * minute. Guessing a stabiliser angle by hand does not work, because the answer
 * depends on weight, speed, flap setting, thrust and centre of gravity all at
 * once.
 *
 * The performance validation has the same problem from the other side: you
 * cannot ask "what is the stalling speed at sixty tonnes" without first putting
 * the aeroplane in level flight at sixty tonnes.
 *
 * So: a Newton solve on three unknowns — incidence, stabiliser, thrust — driven
 * to zero three residuals: vertical force, longitudinal force, pitching moment.
 * The Jacobian is estimated by finite differences on the real strip model, so
 * there is no separate simplified aerodynamic model to drift out of step with
 * the one that actually flies.
 */

BFS.Trim = (function () {
  "use strict";

  var U = BFS.Util, V = BFS.V, C = BFS.A320.C;

  /* Evaluate the aerodynamic and propulsive state for a candidate solution,
     without integrating anything. */
  function residuals(ctx, x) {
    var alpha = x[0], ths = x[1], thrustFrac = x[2];
    var sim = ctx.sim, aero = ctx.aero;

    /* Flight path is fixed by the caller; incidence sets the body attitude. */
    var V0 = ctx.speed;
    sim.truth.vBody[0] = V0 * Math.cos(alpha);
    sim.truth.vBody[1] = 0;
    sim.truth.vBody[2] = V0 * Math.sin(alpha);
    sim.surf.ths = U.clamp(ths, C.thsMin, C.thsMax);
    sim.surf.elev = 0;

    /* Let the strip model settle: the separation state and the relaxed
       lifting-line iteration both need a few passes to converge. */
    for (var i = 0; i < ctx.settle; i++) aero.update(sim, 1 / 120);

    var thrust = 2 * BFS.Engine.thrustOf(
      C.n1Idle + U.clamp(thrustFrac, 0, 1.2) * (100 - C.n1Idle),
      V0 / sim.env.a, sim.env.rho);

    /* Weight resolved into body axes. The flight path angle is gamma, so the
       body pitch is alpha + gamma. */
    var pitch = alpha + ctx.gamma;
    var W = sim.mass.m * 9.80665;
    var Wx = -W * Math.sin(pitch);
    var Wz = W * Math.cos(pitch);

    /* Thrust acts along the body x axis, below the centre of gravity. */
    var Mthrust = (C.engPos[0][2] - sim.mass.cg[2]) * thrust;

    return [
      sim.aero.F[2] + Wz,                    // vertical: lift balances weight
      sim.aero.F[0] + Wx + thrust,           // longitudinal: thrust balances drag
      sim.aero.M[1] + Mthrust                // pitching moment about the CG
    ];
  }

  /* Solve for a steady condition.
   *
   *   speed  true airspeed, m/s
   *   alt    altitude, m
   *   gamma  flight path angle, radians (negative descending)
   *   mass   kg
   *   flap / slat  degrees of actual surface travel
   *   gear   0 or 1
   */
  function solve(opts) {
    var sim = BFS.State.create();
    sim.mass.payload = U.clamp((opts.mass || 60000) - C.oew - 4000, 0, 25000);
    sim.mass.fuel.left = sim.mass.fuel.right = 2000;
    BFS.MassBalance.update(sim);
    sim.mass.m = opts.mass || 60000;

    var atm = { T: 0, p: 0, rho: 0, a: 0 };
    BFS.Atmos.isa(atm, opts.alt || 0, 0);
    sim.env.rho = atm.rho; sim.env.p = atm.p; sim.env.T = atm.T; sim.env.a = atm.a;
    sim.truth.geo[2] = opts.alt || 0;
    sim.truth.agl = opts.agl !== undefined ? opts.agl : 5000;
    sim.surf.flap = opts.flap || 0;
    sim.surf.slat = opts.slat || 0;
    sim.ctl.gearLever = opts.gear || 0;
    for (var g = 0; g < 3; g++) sim.sys.gear.pos[g] = opts.gear || 0;

    var ctx = {
      sim: sim, aero: new BFS.Aero.Aero(),
      speed: opts.speed, gamma: opts.gamma || 0,
      settle: opts.settle || 90
    };

    /* Start from a sensible guess so the first Jacobian is meaningful. */
    var x = [opts.alpha0 !== undefined ? opts.alpha0 : 3 * U.DEG,
             opts.ths0 !== undefined ? opts.ths0 : -2 * U.DEG,
             0.5];

    var r = residuals(ctx, x);
    var W = sim.mass.m * 9.80665;
    var scale = [W, W, W * C.mac];       // non-dimensionalise the residuals

    for (var iter = 0; iter < opts.iterations || iter < 24; iter++) {
      /* Finite-difference Jacobian. Three extra strip evaluations per step is
         cheap enough that there is no reason to approximate the aerodynamics. */
      var J = [];
      var h = [0.4 * U.DEG, 0.4 * U.DEG, 0.02];
      for (var k = 0; k < 3; k++) {
        var xk = x.slice();
        xk[k] += h[k];
        var rk = residuals(ctx, xk);
        J.push([(rk[0] - r[0]) / h[k], (rk[1] - r[1]) / h[k], (rk[2] - r[2]) / h[k]]);
      }

      /* Solve J^T dx = -r. J is stored column-wise above, so transpose as we go. */
      var A = [
        [J[0][0], J[1][0], J[2][0]],
        [J[0][1], J[1][1], J[2][1]],
        [J[0][2], J[1][2], J[2][2]]
      ];
      var dx = solve3(A, [-r[0], -r[1], -r[2]]);
      if (!dx) break;

      /* Damped step: the strip model is non-linear near the stall and an
         undamped Newton step will happily leap past it. */
      var damp = iter < 3 ? 0.55 : 0.9;
      x[0] = U.clamp(x[0] + dx[0] * damp, -12 * U.DEG, 24 * U.DEG);
      x[1] = U.clamp(x[1] + dx[1] * damp, C.thsMin, C.thsMax);
      x[2] = U.clamp(x[2] + dx[2] * damp, 0, 1.15);

      r = residuals(ctx, x);
      var err = Math.abs(r[0] / scale[0]) + Math.abs(r[1] / scale[1]) +
                Math.abs(r[2] / scale[2]);
      if (err < 1e-4) break;
    }

    var errFinal = Math.abs(r[0] / scale[0]) + Math.abs(r[1] / scale[1]) +
                   Math.abs(r[2] / scale[2]);

    var thrust = 2 * BFS.Engine.thrustOf(
      C.n1Idle + U.clamp(x[2], 0, 1.2) * (100 - C.n1Idle),
      opts.speed / sim.env.a, sim.env.rho);

    return {
      alpha: x[0], ths: x[1], thrustFrac: x[2],
      pitch: x[0] + (opts.gamma || 0),
      thrust: thrust, thrustPerEngine: thrust / 2,
      converged: errFinal < 5e-3,
      residual: errFinal,
      CL: -sim.aero.F[2] / (0.5 * sim.env.rho * opts.speed * opts.speed * C.wingArea),
      sim: sim, aero: ctx.aero
    };
  }

  /* 3x3 solve by Gaussian elimination with partial pivoting. */
  function solve3(A, b) {
    var M = [A[0].concat(b[0]), A[1].concat(b[1]), A[2].concat(b[2])];
    for (var col = 0; col < 3; col++) {
      var piv = col;
      for (var r2 = col + 1; r2 < 3; r2++)
        if (Math.abs(M[r2][col]) > Math.abs(M[piv][col])) piv = r2;
      if (Math.abs(M[piv][col]) < 1e-12) return null;
      var tmp = M[col]; M[col] = M[piv]; M[piv] = tmp;
      for (var r3 = 0; r3 < 3; r3++) {
        if (r3 === col) continue;
        var f = M[r3][col] / M[col][col];
        for (var c2 = col; c2 < 4; c2++) M[r3][c2] -= f * M[col][c2];
      }
    }
    return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
  }

  /* The 1g stalling speed, from the definition rather than by search.
   *
   * An earlier version bisected on whether the trim solver converged, on the
   * assumption that "can it hold level flight" is monotonic in speed. It is
   * not: with full flap the aeroplane also fails to trim at HIGH speed, because
   * the camber forces more lift than the weight needs and no attitude inside
   * the stabiliser's travel will hold it level. The bisection read that as "too
   * slow", walked upward, and reported a landing configuration stalling at 311
   * knots.
   *
   * So instead: sweep the incidence to find the maximum lift the configuration
   * can actually produce, then VS = sqrt(2W / (rho S CLmax)). That is what the
   * number means, and it cannot be confused by the trim limits. */
  function maxLift(opts) {
    var sim = BFS.State.create();
    sim.mass.payload = U.clamp((opts.mass || 60000) - C.oew - 4000, 0, 25000);
    sim.mass.fuel.left = sim.mass.fuel.right = 2000;
    BFS.MassBalance.update(sim);
    sim.mass.m = opts.mass || 60000;

    var atm = { T: 0, p: 0, rho: 0, a: 0 };
    BFS.Atmos.isa(atm, opts.alt || 0, 0);
    sim.env.rho = atm.rho; sim.env.p = atm.p; sim.env.T = atm.T; sim.env.a = atm.a;
    sim.truth.agl = opts.agl !== undefined ? opts.agl : 3000;
    sim.surf.flap = opts.flap || 0;
    sim.surf.slat = opts.slat || 0;

    var aero = new BFS.Aero.Aero();
    var speed = opts.probeSpeed || 70;
    var best = 0, bestAlpha = 0;
    for (var deg = -2; deg <= 24; deg += 0.5) {
      var a = deg * U.DEG;
      sim.truth.vBody[0] = speed * Math.cos(a);
      sim.truth.vBody[1] = 0;
      sim.truth.vBody[2] = speed * Math.sin(a);
      for (var k = 0; k < 110; k++) aero.update(sim, 1 / 120);
      var q = 0.5 * atm.rho * speed * speed;
      var CL = (sim.aero.F[0] * Math.sin(a) - sim.aero.F[2] * Math.cos(a)) /
               (q * C.wingArea);
      if (CL > best) { best = CL; bestAlpha = a; }
    }
    return { CLmax: best, alphaMax: bestAlpha, rho: atm.rho };
  }

  function stallSpeed(opts) {
    var m = opts.mass || 60000;
    var r = maxLift(opts);
    if (r.CLmax <= 0.05) return NaN;
    /* One refinement pass at the speed just found, since lift varies a little
       with Reynolds and Mach even down here. */
    var v = Math.sqrt(2 * m * 9.80665 / (r.rho * C.wingArea * r.CLmax));
    var r2 = maxLift(Object.assign({}, opts, { probeSpeed: v }));
    return Math.sqrt(2 * m * 9.80665 / (r2.rho * C.wingArea * r2.CLmax));
  }

  return { solve: solve, stallSpeed: stallSpeed, maxLift: maxLift, residuals: residuals };
})();
