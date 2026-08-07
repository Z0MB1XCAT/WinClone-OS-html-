/* sim/aero_strips.js
   READS:  sim.truth, sim.env, sim.surf, sim.mass
   WRITES: sim.aero.{F,M,alpha,beta,q,load,strips}
   TICK:   fdm, 120Hz
   DEPS:   core/util, core/vecmat, sim/a320_config

   The blade-element core. This file decides whether the aeroplane feels right.
*/

/* Forces are computed per surface element from the airflow local to that
 * element, not from whole-aircraft coefficients. The consequence worth stating
 * plainly: there is no roll damping term, no adverse yaw term, no dihedral
 * effect term, and no stall model bolted on top. Each of those is a *result* of
 * evaluating eighty-odd strips that each see a slightly different wind, and each
 * changes correctly and automatically when the configuration does.
 *
 * The single line that makes it work is the local velocity:
 *
 *     v_i = v_body + omega x r_i - wind - turbulence
 *
 * The omega-cross-r term means a rolling aeroplane presents a higher angle of
 * attack to the down-going wing than the up-going one, so it resists the roll.
 * That is roll damping, and it was never written down. The same term produces
 * pitch and yaw damping, the yaw-roll coupling of a dutch roll, and the correct
 * behaviour of a wing that has dropped at the stall.
 *
 * Passes, in order:
 *   1  local velocity and geometric angle of attack per strip
 *   2  lifting-line solve for the induced angle across the wing
 *   3  section aerodynamics with separation lag and compressibility
 *   4  accumulate force and moment about the centre of gravity
 */

BFS.Aero = (function () {
  "use strict";

  var U = BFS.Util, V = BFS.V, A = BFS.A320, C = BFS.A320.C;

  var CL_ALPHA = 5.7;          // per radian, two-dimensional
  var ALPHA_SEP = 15.5 * U.DEG;
  var SEP_BLEND = 1.9 * U.DEG; // sigmoid width of the stall break
  var M_CRIT0 = 0.76;

  function Aero() {
    this.strips = A.buildStrips();
    this.wingL = [];
    this.wingR = [];
    for (var i = 0; i < this.strips.length; i++) {
      var s = this.strips[i];
      if (s.kind === "wing") (s.side < 0 ? this.wingL : this.wingR).push(s);
    }
    this.nWing = this.wingL.length;

    this._v = new Float64Array(3);
    this._wr = new Float64Array(3);
    this._f = new Float64Array(3);
    this._m = new Float64Array(3);
    this._windBody = new Float64Array(3);
    this._liftDir = new Float64Array(3);
    this._dragDir = new Float64Array(3);
    this._tmp = new Float64Array(3);
    this.downwash = 0;
    this.wingSep = 0;
  }

  /* --------------------------------------------------------- lifting line
   *
   * Induced angle at strip i is the downwash from every other strip's trailing
   * vorticity. Precomputing the influence matrix once makes the per-tick cost a
   * couple of matrix-vector products, which is nothing.
   *
   * It gives induced drag as the actual backward tilt of each strip's lift
   * vector rather than a CL^2/(pi e AR) fudge, and it makes the wing drop at the
   * stall because the strip that separates first sheds its share of the load
   * onto its neighbours. That is the Phase 2 model, and it is not what runs
   * here yet.
   *
   * A first attempt at it summed the influence of each strip's circulation
   * directly. That is not lifting-line theory — the downwash integral is over
   * the SPANWISE DERIVATIVE of circulation, not circulation itself — and the
   * error is not subtle once measured: feeding the matrix a perfectly symmetric
   * elliptic loading came back with a mean induced angle of -0.05 on one wing
   * and -2.89 on the other. A symmetric wing was being told it had a sixty-fold
   * asymmetry in downwash, which the aeroplane faithfully turned into a steady
   * roll and yaw in dead calm air.
   *
   * So Phase 1 uses the elliptic result instead: a_ind = cl / (pi * AR). It is
   * symmetric by construction, unconditionally stable, gives induced drag of the
   * right magnitude, and still redistributes when a flap or an aileron moves —
   * because it is driven by each strip's own local lift. What it does not give
   * is the spanwise coupling between strips, which is what makes a wing drop at
   * the stall. That arrives with the proper vortex solve in Phase 2, and this
   * function is the seam it drops into. */
  function inducedAngle(s) {
    return U.clamp(s.cl / (Math.PI * C.aspect), -0.30, 0.30);
  }

  /* Deflection of a control channel for one strip, in radians. */
  function channelDeflection(surf, s) {
    if (!s.ctl) return 0;
    if (s.ctl === "elev") return surf.elev;
    if (s.ctl === "rud") return surf.rud;
    if (s.ctl === "ail") return s.side < 0 ? surf.ailL : surf.ailR;
    return 0;
  }

  /* Thin-airfoil flap effectiveness: the fraction of a full angle-of-attack
     change that deflecting a trailing-edge surface of chord fraction E buys. */
  function tau(E) {
    if (E <= 0) return 0;
    var th = Math.acos(2 * U.clamp(E, 0, 1) - 1);
    return 1 - (th - Math.sin(th)) / Math.PI;
  }
  var TAU_CACHE = {};
  function tauC(E) {
    var k = (E * 1000) | 0;
    return TAU_CACHE[k] !== undefined ? TAU_CACHE[k] : (TAU_CACHE[k] = tau(E));
  }

  /* Section lift and drag.
   *
   * Linear thin-airfoil theory blended into flat-plate behaviour by a sigmoid on
   * the separation state. Flat plate is used past the stall because it is exact
   * at ninety degrees and correct in reverse flow, so the model stays sane when
   * the aeroplane is somewhere it should not be — a tail slide, a spin entry,
   * backwards through a windshear — instead of returning nonsense off the end of
   * a table. */
  function section(alpha, sep, tc, mach) {
    var clLin = CL_ALPHA * alpha;

    var sa = Math.sin(alpha), ca = Math.cos(alpha);
    var clPlate = 2 * sa * ca;
    var cdPlate = 2 * sa * sa;

    var cl = sep * clLin + (1 - sep) * clPlate;
    var cd0 = 0.0062 + 0.012 * tc + (1 - sep) * cdPlate * 0.9;

    /* Compressibility. Prandtl-Glauert below the critical Mach number, then a
       wave-drag rise and a lift roll-off above it. */
    if (mach > 0.35) {
      var m2 = Math.min(mach * mach, 0.985);
      cl /= Math.sqrt(1 - m2);
      var mcrit = M_CRIT0 - 0.10 * Math.abs(cl) - 0.9 * (tc - 0.10);
      if (mach > mcrit) {
        var dm = mach - mcrit;
        cd0 += 22 * dm * dm * dm;
        cl *= 1 / (1 + 9 * dm * dm);
      }
    }
    return { cl: cl, cd: cd0 };
  }

  /* ------------------------------------------------------------------ update */

  Aero.prototype.update = function (sim, dt) {
    var t = sim.truth, env = sim.env, surf = sim.surf, aero = sim.aero;
    var strips = this.strips, n = strips.length;
    var rho = env.rho, a = env.a;

    /* Wind and turbulence are given in world axes; the strips work in body
       axes, so rotate once here rather than eighty times below. */
    V.set3(this._tmp, env.wind[0] + env.turb[0], env.wind[1] + env.turb[1],
                      env.wind[2] + env.turb[2]);
    V.qrotInv(this._windBody, t.quat, this._tmp);
    /* World up is +z; body down is +z. Flip the vertical component into body
       convention. */
    var wbx = this._windBody[0], wby = this._windBody[1], wbz = this._windBody[2];

    var cg = sim.mass.cg;
    var om = t.omega;
    var vb = t.vBody;

    V.set3(aero.F, 0, 0, 0);
    V.set3(aero.M, 0, 0, 0);

    /* Whole-aircraft reference values, for the displays and for the tail. */
    var vax = vb[0] - wbx, vay = vb[1] - wby, vaz = vb[2] - wbz;
    var vmag = Math.hypot(vax, vay, vaz);
    /* Gate on FORWARD airspeed, not on the magnitude. Parked into an eight-knot
       breeze the magnitude is several metres per second while the forward
       component is nothing, and the arctangent of two numerical residues comes
       out at 178 degrees. A stationary aeroplane has no angle of attack. The
       strips themselves are unaffected either way — this is the reported value
       the displays and, later, the stall warning read. */
    var flowValid = vax > 8;
    aero.alpha = flowValid ? Math.atan2(vaz, vax) : 0;
    aero.beta = flowValid ? Math.asin(U.clamp(vay / vmag, -1, 1)) : 0;
    aero.q = 0.5 * rho * vmag * vmag;
    var mach = vmag / a;

    /* Ground effect: computed per strip from that strip's own height, so a
       banked flare correctly loses it on the high wing first. */
    var geBase = t.agl;

    /* ---- pass 1: local flow ---- */
    var i, s;
    for (i = 0; i < n; i++) {
      s = strips[i];
      var rx = s.r[0] - cg[0], ry = s.r[1] - cg[1], rz = s.r[2] - cg[2];

      /* v = v_body + omega x r - wind. This is the whole model. */
      var vx = vb[0] + (om[1] * rz - om[2] * ry) - wbx;
      var vy = vb[1] + (om[2] * rx - om[0] * rz) - wby;
      var vz = vb[2] + (om[0] * ry - om[1] * rx) - wbz;

      /* Project onto the strip's own axes. The spanwise component is discarded:
         on a swept surface only the flow normal to the quarter-chord line does
         aerodynamic work, which is exactly why sweep delays the stall.
       *
       * The sign convention, stated once and obeyed everywhere below:
       *
       *   u = v . t          forward component of the body's velocity
       *   w = -(v . n)       component AGAINST the lift normal
       *   alpha = atan2(w, u)
       *
       * The negation is the part worth pausing on. `n` points the way positive
       * lift acts, and a wing meeting the air nose-high is moving *down*
       * relative to its own normal — so a positive angle of attack corresponds
       * to a negative v.n. Take the dot product at face value and every surface
       * on the aeroplane reports the negative of its true incidence, which is
       * self-consistent enough to look like it works right up until a control
       * surface moves. */
      var un = vx * s.t[0] + vy * s.t[1] + vz * s.t[2];
      var wn = -(vx * s.n[0] + vy * s.n[1] + vz * s.n[2]);

      s._u = un; s._w = wn;
      s._vx = vx; s._vy = vy; s._vz = vz;
      s._q = 0.5 * rho * (un * un + wn * wn);
      s.alphaGeo = Math.atan2(wn, un);
    }

    /* ---- pass 2: induced angle ----
       Seeded from the previous tick's section lift. At 120 Hz the state barely
       moves between ticks, so a single fixed-point step is fully converged. */
    for (i = 0; i < n; i++) {
      s = strips[i];
      if (s.kind === "wing") s.alphaInd = inducedAngle(s);
      else s.alphaInd = 0;
    }

    /* ---- pass 3 and 4: section forces, accumulate ---- */
    var Fx = 0, Fy = 0, Fz = 0, Mx = 0, My = 0, Mz = 0;
    var sepSum = 0, sepCount = 0;
    var wingAlphaSum = 0, wingAlphaCount = 0;

    for (i = 0; i < n; i++) {
      s = strips[i];
      var speed2 = Math.hypot(s._u, s._w);
      if (speed2 < 0.05 || s._q < 1e-4) { s.lift = 0; s.cl = 0; s.cd = 0; continue; }

      var alpha = s.alphaGeo;

      if (s.kind === "wing") {
        alpha -= (s.alphaInd || 0);

        /* Flaps and slats change the effective camber, chord and stall angle of
           the strips they sit on — nothing else. The nose-down pitch change on
           flap extension is then a consequence of the load moving aft on the
           inboard wing, not a scripted trim shift. */
        if (s.flapFrac > 0 && surf.flap > 0.01)
          alpha += tauC(s.flapFrac) * surf.flap * U.DEG * 0.72;
        if (s.slatFrac > 0 && surf.slat > 0.01)
          alpha += tauC(s.slatFrac) * surf.slat * U.DEG * 0.28;
      } else if (s.kind === "ht") {
        /* Downwash from the wing, lagged by the time the air takes to get
           there, plus the tailplane's own incidence from the trimmable
           stabiliser. */
        alpha -= this.downwash;
        alpha += surf.ths;
      }

      var defl = channelDeflection(surf, s);
      if (defl) alpha += tauC(s.ctlFrac) * defl * s.ctlSign;

      /* Separation state, lagged. A wing does not stall instantly: the
         separation point creeps forward over a few chord lengths of travel.
         Modelling that as a first-order lag with hysteresis is what produces
         buffet before the break and a stall that stays stalled until you
         genuinely unload it. */
      var alphaStall = ALPHA_SEP;
      if (s.slatFrac > 0 && surf.slat > 0.01) alphaStall += surf.slat * U.DEG * 0.30;
      if (s.kind === "fuse" || s.kind === "nacelle") alphaStall = 8 * U.DEG;

      var reattach = s.sep > 0.5 ? 0 : 2 * U.DEG;     // hysteresis
      var sepTarget = 1 / (1 + Math.exp((Math.abs(alpha) - alphaStall + reattach) / SEP_BLEND));
      var tauSep = U.clamp(4 * s.c / Math.max(8, speed2), 0.02, 1.2);
      s.sep = U.lag(s.sep, sepTarget, tauSep, dt);

      var sec = section(alpha, s.sep, s.tc, mach);
      var cl = sec.cl, cd = sec.cd;

      /* Slender bodies — the fuselage and the nacelles — are not little wings.
       *
       * Their strip area is the SIDE area, which is what the crossflow acts on,
       * so a blunt-body drag coefficient applied to it is enormous: 120 square
       * metres of fuselage at cd 0.5 is sixty square metres of equivalent flat
       * plate, against about one point eight for the whole real aeroplane. The
       * symptom is unmistakable once you know it — full thrust and the speed
       * simply stops rising, in this case at 93 knots.
       *
       * The right model is slender-body: axially it is skin friction only, and
       * the normal force grows with the square of the crossflow angle. That
       * keeps the destabilising pitch and yaw moment the fuselage genuinely
       * contributes while costing almost nothing in level flight. */
      if (s.kind === "fuse" || s.kind === "nacelle") {
        var sa = Math.sin(alpha), sa2 = sa * sa;
        cl = 1.1 * sa2 * (alpha < 0 ? -1 : 1);
        cd = 0.008 + 1.1 * sa2 * Math.abs(sa);
      }

      /* Ground effect, per strip. Wieselsberger: the induced drag of a wing near
         the ground is reduced because the image vortex cancels part of the
         downwash. Computing it per strip rather than per aircraft is what makes
         a crosswind flare behave. */
      if (s.kind === "wing" && geBase < C.span) {
        var hb = Math.max(0.02, (geBase - (s.r[2] - cg[2])) / C.span);
        var ge = (1 - 1.32 * hb) / (1.05 + 7.4 * hb);
        if (ge > 0) s.alphaInd = (s.alphaInd || 0) * (1 - U.clamp(ge, 0, 0.75));
      }

      /* Spoilers destroy lift and add drag on their own strips. Roll spoilers,
         ground spoilers and speedbrake are all the same mechanism. */
      if (s.spoiler >= 0) {
        var sd = surf.spoiler[s.spoiler] || 0;
        if (sd > 0.01) {
          var f = U.clamp(sd / C.spoilerMax, 0, 1);
          cl *= (1 - 0.85 * f);
          cd += 1.1 * f * f;
        }
      }

      /* Induced drag as the backward tilt of the lift vector — the physically
         honest form, and the reason no efficiency factor appears anywhere. */
      var cdi = (s.kind === "wing") ? cl * (s.alphaInd || 0) : 0;

      var q = s._q, S = s.S;
      var lift = q * S * cl;
      var drag = q * S * (cd + Math.abs(cdi));

      /* Resolve lift and drag into the strip's own plane.
       *
       * With the convention above, the velocity through the air expressed in
       * (chordwise, normal) components is (cos a, -sin a) — negative on the
       * normal axis, because positive angle of attack means moving down
       * relative to the lift direction. Drag opposes that; lift is
       * perpendicular to it with a positive normal component. So:
       *
       *   drag = -D * ( cos a, -sin a)
       *   lift =  L * ( sin a,  cos a)
       *
       * which is where the apparently mismatched signs below come from. They
       * are not a mistake: fN gains from drag because drag acting along a
       * downward-slanting flow has an upward component once resolved onto the
       * normal. */
      var inv = 1 / speed2;
      var dx = s._u * inv, dz = s._w * inv;       // cos alpha, sin alpha

      var fT = -drag * dx + lift * dz;            // along the chordwise axis
      var fN = drag * dz + lift * dx;             // along the lift normal

      var fx = fT * s.t[0] + fN * s.n[0];
      var fy = fT * s.t[1] + fN * s.n[1];
      var fz = fT * s.t[2] + fN * s.n[2];

      Fx += fx; Fy += fy; Fz += fz;

      var rx2 = s.r[0] - cg[0], ry2 = s.r[1] - cg[1], rz2 = s.r[2] - cg[2];
      Mx += ry2 * fz - rz2 * fy;
      My += rz2 * fx - rx2 * fz;
      Mz += rx2 * fy - ry2 * fx;

      s.alpha = alpha; s.cl = cl; s.cd = cd; s.lift = lift;

      if (s.kind === "wing") {
        sepSum += 1 - s.sep; sepCount++;
        wingAlphaSum += alpha; wingAlphaCount++;
      }
    }

    /* Downwash for the next tick, lagged by the transport delay from wing to
       tail. Feeding it forward one step avoids an implicit solve and is
       indistinguishable at 120 Hz. */
    var meanWingAlpha = wingAlphaCount ? wingAlphaSum / wingAlphaCount : 0;
    var epsTarget = 0.35 * meanWingAlpha;
    var lt = Math.abs(C.htPos[0] - C.wingApex[0]);
    this.downwash = U.lag(this.downwash, epsTarget,
                          U.clamp(lt / Math.max(15, vmag), 0.02, 1.0), dt);
    this.wingSep = sepCount ? sepSum / sepCount : 0;

    V.set3(aero.F, Fx, Fy, Fz);
    V.set3(aero.M, Mx, My, Mz);
    aero.mach = mach;
    aero.vmag = vmag;
    aero.strips = strips;
    /* Buffet is only meaningful once there is enough forward speed for the wing
       to be doing something. Taxiing, the strips see a large apparent sideslip
       at almost no forward speed and correctly report themselves separated —
       true, but not what a buffet indication means. */
    aero.buffet = flowValid ? this.wingSep : 0;
  };

  return { Aero: Aero, section: section, tau: tau, CL_ALPHA: CL_ALPHA };
})();
