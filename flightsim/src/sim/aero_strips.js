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
  /* Relaxation factor for the lifting-line iteration. Chosen so the error
     multiplier stays well inside unity for every chord on this wing, from the
     six-metre root to the 1.7-metre tip. See the solve in update(). */
  var RELAX = 0.18;

  /* How far aft of the quarter chord a deflected flap carries the lift it adds,
   * as a fraction of chord. This single number decides whether the aeroplane
   * pitches nose-up or nose-down when the flaps run out, and the balance is
   * genuinely fine: the nose-down couple it produces is opposed by the tail
   * losing lift to the increased downwash, and by the flap lift itself acting
   * slightly forward of the centre of gravity on a swept wing. At 0.38 those
   * three terms cancelled to within a few kN·m and the aeroplane came out
   * pitching the wrong way.
   *
   * Half a chord is where a fully extended Fowler actually carries it — the
   * flap translates aft on its track before it rotates, so its own quarter
   * chord ends up around there. */
  var FOWLER_ARM = 0.50;

  function Aero() {
    this.strips = A.buildStrips();
    this.wingL = [];
    this.wingR = [];
    for (var i = 0; i < this.strips.length; i++) {
      var s = this.strips[i];
      if (s.kind === "wing") (s.side < 0 ? this.wingL : this.wingR).push(s);
    }
    this.nWing = this.wingL.length;
    /* One list of every wing strip, ordered across the span from the left tip
       to the right, which is the ordering the influence matrix assumes. */
    this.wing = this.strips.filter(function (s) { return s.kind === "wing"; })
                           .sort(function (a, b) { return a.r[1] - b.r[1]; });
    this._K = buildInfluence(this.wing);

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
   * Each wing strip carries a bound vortex of strength Gamma at its quarter
   * chord, shedding a pair of semi-infinite trailing vortices from its two
   * EDGES — one of strength +Gamma, one of -Gamma. The downwash at strip i is
   * the sum over every strip's pair:
   *
   *     w_i = (1/4pi) * SUM_j Gamma_j * [ 1/(y_i - yL_j) - 1/(y_i - yR_j) ]
   *
   * The edges are the whole point, and getting that wrong was the Phase 1 bug:
   * an earlier version put a single vortex at each strip's CENTRE, which is not
   * lifting-line theory at all — the downwash integral is over the spanwise
   * derivative of circulation, and a horseshoe's trailing pair is precisely the
   * discrete form of that derivative. The single-vortex version returned a
   * sixty-fold asymmetry when fed a perfectly symmetric elliptic loading, and
   * the aeroplane rolled and yawed in still air. The formulation below is
   * symmetric for symmetric loading by construction, which tools/aero_test.mjs
   * checks numerically rather than taking on trust.
   *
   * What this buys, beyond not being wrong: induced drag as the genuine backward
   * tilt of each strip's lift vector rather than a CL^2/(pi e AR) fudge; the
   * spanwise loading redistributing correctly when a flap or an aileron moves,
   * which is where adverse yaw comes from; and a wing that drops at the stall,
   * because the strip that separates first sheds its share of the load onto its
   * neighbours and pushes them over too. */
  function buildInfluence(wing) {
    var n = wing.length;
    var K = new Float64Array(n * n);
    for (var i = 0; i < n; i++) {
      var yi = wing[i].r[1];
      for (var j = 0; j < n; j++) {
        var yl = wing[j]._yL, yr = wing[j]._yR;
        var dL = yi - yl, dR = yi - yr;
        /* The control point sits at its own strip's centre, so neither
           denominator can vanish; a floor guards the neighbours' edges against
           a near-singular kernel when strips are unevenly spaced. */
        if (Math.abs(dL) < 1e-4) dL = dL < 0 ? -1e-4 : 1e-4;
        if (Math.abs(dR) < 1e-4) dR = dR < 0 ? -1e-4 : 1e-4;
        K[i * n + j] = (1 / (4 * Math.PI)) * (1 / dL - 1 / dR);
      }
    }
    return K;
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

      /* Everything the configuration adds to this strip's incidence, resolved
         here rather than in the force pass so the lifting-line solve can see it.
         Flaps and slats change the effective camber of the strips they sit on
         and nothing else — the nose-down pitch change on flap extension is then
         a consequence of the load moving on the inboard wing, not a scripted
         trim shift. */
      var cfg = 0, camber = 0;
      if (s.kind === "wing") {
        if (s.flapFrac > 0 && surf.flap > 0.01)
          camber += tauC(s.flapFrac) * surf.flap * U.DEG * 0.72;
        if (s.slatFrac > 0 && surf.slat > 0.01)
          camber += tauC(s.slatFrac) * surf.slat * U.DEG * 0.28;
        cfg += camber;
      } else if (s.kind === "ht") {
        /* Wing downwash, lagged by the time the air takes to reach the tail,
           plus the trimmable stabiliser's own incidence. */
        cfg += surf.ths - this.downwash;
      }
      var defl = channelDeflection(surf, s);
      if (defl) cfg += tauC(s.ctlFrac) * defl * s.ctlSign;
      s._defl = defl;
      s._camber = camber;
      s.alphaCfg = s.alphaGeo + cfg;
    }

    /* ---- pass 2: the lifting-line solve ----
     *
     * Prandtl's equation is implicit — the circulation depends on the downwash
     * which depends on the circulation — and it CANNOT be iterated naively.
     * The loop gain is the self-influence times the section slope times the
     * chord, which for this wing is between two and six: substituting
     * repeatedly does not converge on the answer, it runs away from it. Left
     * unrelaxed the wing settled at minus three and a half degrees of incidence
     * in level flight and reported itself stalled, with a drag coefficient of
     * 0.42.
     *
     * Under-relaxation fixes it: step only part of the way each time, so the
     * error multiplier |1 - w(1 + gain)| stays under one across the whole range
     * of chords on the wing. Two relaxed passes per tick, carried across ticks,
     * converges within a fraction of a second of real time — and since the
     * state barely moves at 120 Hz, it is effectively always converged. */
    var wing = this.wing, nw = wing.length, K = this._K;
    for (var iter = 0; iter < 2; iter++) {
      for (i = 0; i < nw; i++) {
        s = wing[i];
        var dw = 0, row = i * nw;
        for (var j = 0; j < nw; j++) dw += K[row + j] * wing[j].gamma;
        var Vs = Math.hypot(s._u, s._w);
        var target = Vs > 2 ? U.clamp(dw / Vs, -0.35, 0.35) : 0;

        /* Ground effect, applied HERE — because that is what ground effect is.
         *
         * The ground's image vortex cancels part of the downwash, so the induced
         * angle falls and with it the induced drag. Applying it anywhere else is
         * decoration; an earlier version scaled alphaInd after the forces had
         * already been computed from it, so it did precisely nothing.
         *
         * Per strip rather than per aeroplane, using each strip's own height, so
         * a banked flare correctly loses the effect on the high wing first. */
        if (geBase < C.span) {
          var h = Math.max(0.05, geBase - (s.r[2] - cg[2]));
          var hb = h / C.span;
          var sigma = (1 - 1.32 * hb) / (1.05 + 7.4 * hb);
          target *= (1 - U.clamp(sigma, 0, 0.80));
        }

        s.alphaInd = s.alphaInd + (target - s.alphaInd) * RELAX;
        /* Circulation from the effective incidence. Carrying the separated
           state matters at the stall: a strip that has let go sheds its
           circulation, and its neighbours pick up the downwash change on the
           next pass. That is the mechanism behind a wing dropping. */
        s.gamma = 0.5 * Vs * s.c * CL_ALPHA * (s.alphaCfg - s.alphaInd) * s.sep;
      }
    }
    for (i = 0; i < n; i++) if (strips[i].kind !== "wing") strips[i].alphaInd = 0;

    /* ---- pass 3 and 4: section forces, accumulate ---- */
    var Fx = 0, Fy = 0, Fz = 0, Mx = 0, My = 0, Mz = 0;
    var sepSum = 0, sepCount = 0;
    var wingAlphaSum = 0, wingAlphaCount = 0;

    for (i = 0; i < n; i++) {
      s = strips[i];
      var speed2 = Math.hypot(s._u, s._w);
      if (speed2 < 0.05 || s._q < 1e-4) { s.lift = 0; s.cl = 0; s.cd = 0; continue; }

      /* The incidence the section actually sees: geometry plus configuration,
         less the downwash the rest of the wing induces on it. */
      var alpha = s.alphaCfg - s.alphaInd;

      /* Separation state, lagged. A wing does not stall instantly: the
         separation point creeps forward over a few chord lengths of travel.
         Modelling that as a first-order lag with hysteresis is what produces
         buffet before the break and a stall that stays stalled until you
         genuinely unload it. */
      /* The stalling incidence has to move with the camber the flaps add.
       *
       * A deflected flap is modelled here as extra effective incidence, which is
       * right for lift — but if the stall angle stays put, a flapped section
       * reads sixteen degrees of camber as sixteen degrees of incidence and
       * declares itself separated while the aeroplane is sitting at three
       * degrees on final approach. A flapped wing does stall earlier in
       * geometric terms, just nowhere near that much, so most of the camber is
       * credited back. */
      var alphaStall = ALPHA_SEP + (s._camber || 0) * 0.75;
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
      var cdi = (s.kind === "wing") ? cl * s.alphaInd : 0;

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

      /* The section's own pitching moment about its quarter chord.
       *
       * A plain section has essentially none there — that is what the quarter
       * chord is for. A DEFLECTED one does: pushing a flap down is a large
       * increase in camber, and camber produces a strong nose-down couple that
       * no amount of lift bookkeeping will reproduce, because it does not come
       * from where the lift acts but from how the pressure is distributed along
       * the chord.
       *
       * Without this the aeroplane pitches the wrong way when the flaps run
       * out, and needs the wrong stabiliser setting to trim in the approach
       * configuration. */
      var cm = 0;
      /* Scaled by the lift the camber ADDS, not by the deflection, because the
         mechanism is where that extra lift acts: a Fowler flap carries its
         increment roughly a third of a chord aft of the quarter chord, and the
         resulting couple is what a pilot feels as the nose dropping when the
         flaps run out. */
      if (s._camber > 0) cm -= FOWLER_ARM * CL_ALPHA * s._camber;
      if (s._defl && s.ctlFrac > 0)
        cm -= 0.42 * tauC(s.ctlFrac) * s._defl * s.ctlSign;
      if (cm !== 0) {
        var mm = q * S * s.c * cm * s.sep;
        Mx += mm * s.mAxis[0];
        My += mm * s.mAxis[1];
        Mz += mm * s.mAxis[2];
      }

      s.alpha = alpha; s.cl = cl; s.cd = cd; s.lift = lift;
      s._fx = fx; s._fy = fy; s._fz = fz;

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
