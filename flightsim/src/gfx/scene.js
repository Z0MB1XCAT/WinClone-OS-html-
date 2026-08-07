/* gfx/scene.js
   READS:  sim
   WRITES: -
   TICK:   render
   DEPS:   core/util, core/vecmat, core/geo, gfx/gl, gfx/shaders, gfx/terrain,
           gfx/airport, gfx/a320_ext, gfx/a320_cockpit, disp/gfx2d, disp/pfd, disp/nd */

/* Assembles and draws the world.
 *
 * The depth arrangement is the part worth reading. The view has to cover three
 * metres to two hundred kilometres, which no single depth buffer resolves: put
 * the near plane close enough to see the pedestal and the runway markings
 * z-fight with the runway.
 *
 * So there are two passes with a depth clear between them. The world pass runs
 * from three metres to two hundred kilometres with logarithmic depth, which
 * distributes precision by distance rather than by one-over-z. The cockpit pass
 * then runs from two centimetres to thirty metres on a conventional buffer, in
 * its own depth range entirely. The cost is one clear, and it makes it
 * impossible to ever see terrain through the glareshield.
 */

BFS.Scene = (function () {
  "use strict";

  var U = BFS.Util, V = BFS.V, Geo = BFS.Geo;

  function Scene(gl, canvas) {
    this.canvas = canvas;
    this.ctx = new BFS.GL.Ctx(gl);
    this.gl = gl;

    var S = BFS.Shaders;
    this.pSky = this.ctx.compile("sky", S.sky.vs, S.sky.fs);
    this.pTerrain = this.ctx.compile("terrain", S.terrain.vs, S.terrain.fs);
    this.pMesh = this.ctx.compile("mesh", S.mesh.vs, S.mesh.fs);
    this.pScreen = this.ctx.compile("screen", S.screen.vs, S.screen.fs);
    this.pSprite = this.ctx.compile("sprite", S.sprite.vs, S.sprite.fs);

    this.fullscreen = this.ctx.mesh(this.pSky, [{ name: "aPos", size: 2 }],
      new Float32Array([-1, -1, 3, -1, -1, 3]), null);

    this.terrain = new BFS.TerrainView.TerrainView(this.ctx, this.pTerrain);
    this.airport = BFS.AirportView.build(this.ctx, this.pMesh, this.pSprite);
    this.aircraft = BFS.A320Ext.build(this.ctx, this.pMesh);
    this.cockpit = BFS.Cockpit.build(this.ctx, this.pMesh, this.pScreen);

    this.displays = this._buildDisplays();

    /* Matrices. Built in float64 with the camera already at the origin, and
       downcast only on the way to the uniform. */
    this.view = V.mat4();
    this.proj = V.mat4();
    this.viewProj = V.mat4();
    this.model = V.mat4();
    this.acModel = V.mat4();
    this._local = V.mat4();
    this.mvp32 = new Float32Array(16);
    this.model32 = new Float32Array(16);
    this.normal32 = new Float32Array(9);
    this.invVP = V.mat4();

    this.camEnu = new Float64Array(3);
    this.camDir = new Float64Array(3);
    this.camUp = new Float64Array(3);
    this.sun = new Float64Array([0.42, 0.30, 0.86]);
    this._tmp = new Float64Array(3);
    this._tmp2 = new Float64Array(3);
    this._q = V.quat();
    this._off = new Float64Array(3);

    this.fcoef = 2.0 / Math.log2(200000 + 1.0);

    gl.enable(gl.DEPTH_TEST);
    /* Culling is set per pass rather than once, because the two passes want
       opposite things: the world pass must cull so the camera can see out
       through the aeroplane's own skin, and the cockpit pass must not, because
       the camera sits inside a box and every one of its walls faces away. */
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
  }

  /* --------------------------------------------------------------- displays
     A round-robin scheduler picks the single most overdue surface each frame.
     Whatever else is added later — the ECAM pages, the standby instrument, two
     control display units — the per-frame cost stays exactly one redraw. */
  Scene.prototype._buildDisplays = function () {
    var G2 = BFS.G2;
    var list = [
      new G2.Surface("pfd1", 512, 512, 15, BFS.PFD.draw),
      new G2.Surface("nd1", 512, 512, 10, BFS.ND.draw),
      new G2.Surface("pfd2", 512, 512, 6, BFS.PFD.draw),
      new G2.Surface("nd2", 512, 512, 5, BFS.ND.draw)
    ];
    for (var i = 0; i < list.length; i++) {
      /* Fill rather than draw: the first real render happens on the first frame,
         once there is a simulation state to draw from. */
      list[i].ctx.fillStyle = G2.COL.bg;
      list[i].ctx.fillRect(0, 0, list[i].w, list[i].h);
      list[i].tex = this.ctx.canvasTexture(list[i].canvas);
    }
    var byName = {};
    for (var j = 0; j < list.length; j++) byName[list[j].name] = list[j];
    return { list: list, byName: byName };
  };

  Scene.prototype.updateDisplays = function (sim, t) {
    var list = this.displays.list, best = null, bestOverdue = 0;
    for (var i = 0; i < list.length; i++) {
      var o = list[i].overdue(t);
      if (o > bestOverdue) { bestOverdue = o; best = list[i]; }
    }
    if (!best) return;
    try { best.render(t, sim); } catch (e) { best.last = t + 5; throw e; }
    this.ctx.updateCanvasTexture(best.tex);
  };

  /* ------------------------------------------------------------------ camera
     The eye sits at the design eye position in the cockpit, so what you see out
     of the windows is what a pilot in that seat would see. */
  Scene.prototype.camera = function (sim, input, frame, aspect) {
    var t = sim.truth;

    /* Body-frame eye offset, rotated into the world. */
    var eye = BFS.Cockpit.EYE;
    V.set3(this._tmp, eye[0], eye[1], eye[2]);
    V.qrot(this._tmp2, t.quat, this._tmp);
    V.nedToEnu(this._off, this._tmp2);

    frame.geodeticToEnu(this.camEnu, t.geo[0], t.geo[1], t.geo[2]);
    this.camEnu[0] += this._off[0];
    this.camEnu[1] += this._off[1];
    this.camEnu[2] += this._off[2];

    /* Look direction: the aircraft's attitude, then the head turn. */
    V.qFromEuler(this._q, 0, input.pitch, input.yaw);
    V.qmul(this._q, t.quat, this._q);

    V.set3(this._tmp, 1, 0, 0);
    V.qrot(this._tmp2, this._q, this._tmp);
    V.nedToEnu(this.camDir, this._tmp2);

    V.set3(this._tmp, 0, 0, -1);
    V.qrot(this._tmp2, this._q, this._tmp);
    V.nedToEnu(this.camUp, this._tmp2);

    /* Everything is drawn camera-relative, so the view matrix looks from the
       origin. This is the step that keeps float32 honest. */
    V.set3(this._tmp, 0, 0, 0);
    V.set3(this._tmp2, this.camDir[0], this.camDir[1], this.camDir[2]);
    V.mLookAt(this.view, this._tmp, this._tmp2, this.camUp);
    V.mPerspective(this.proj, input.fov, aspect, 3, 200000);
    V.mMul(this.viewProj, this.proj, this.view);
  };

  /* ------------------------------------------------------------------- draw */

  Scene.prototype.setSky = function (prog) {
    var gl = this.gl;
    gl.uniform3f(prog.u.uSun, this.sun[0], this.sun[1], this.sun[2]);
    gl.uniform3f(prog.u.uZenith, 0.115, 0.235, 0.470);
    gl.uniform3f(prog.u.uHorizon, 0.560, 0.660, 0.780);
    gl.uniform3f(prog.u.uGround, 0.230, 0.235, 0.225);
    if (prog.u.uFogDensity) gl.uniform1f(prog.u.uFogDensity, 1 / 46000);
    if (prog.u.uFcoef) gl.uniform1f(prog.u.uFcoef, this.fcoef);
    if (prog.u.uFcoefHalf) gl.uniform1f(prog.u.uFcoefHalf, this.fcoef * 0.5);
  };

  Scene.prototype.render = function (sim, input, frame, w, h, t) {
    var gl = this.gl, ctx = this.ctx;
    ctx.beginFrame();

    this.camera(sim, input, frame, w / h);

    gl.viewport(0, 0, w, h);
    gl.clearColor(0.35, 0.45, 0.60, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* ---- sky ----
       Culling on for everything outside: without it the camera, which sits
       inside both the fuselage and the flight deck, sees the inside of the
       aeroplane's skin and the world disappears behind a flat grey wall. */
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    var ps = ctx.use(this.pSky);
    V.cross3(this._tmp, this.camDir, this.camUp);
    V.norm3(this._tmp, this._tmp);
    var tanHalf = Math.tan(input.fov * 0.5);
    gl.uniform3f(ps.u.uCamFwd, this.camDir[0], this.camDir[1], this.camDir[2]);
    gl.uniform3f(ps.u.uCamRight, this._tmp[0], this._tmp[1], this._tmp[2]);
    gl.uniform3f(ps.u.uCamUp, this.camUp[0], this.camUp[1], this.camUp[2]);
    gl.uniform2f(ps.u.uTanFov, tanHalf * (w / h), tanHalf);
    this.setSky(ps);
    ctx.draw(this.fullscreen);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);

    /* ---- world pass: terrain, aerodrome, the aeroplane's own structure ---- */
    var pt = ctx.use(this.pTerrain);
    gl.uniformMatrix4fv(pt.u.uViewProj, false, V.toF32(this.mvp32, this.viewProj));
    this.setSky(pt);
    if (pt.u.uTime) gl.uniform1f(pt.u.uTime, t);
    this.terrain.draw(frame, this.camEnu);

    var pm = ctx.use(this.pMesh);
    gl.uniformMatrix4fv(pm.u.uViewProj, false, V.toF32(this.mvp32, this.viewProj));
    this.setSky(pm);
    gl.uniform1f(pm.u.uEmissive, 0);

    /* The aerodrome lives in its own frame; only its offset from the camera
       changes, so the mesh itself never has to be rebuilt. */
    frame.offsetOf(this._off, this.airport.frame);
    V.mTranslate(this.model, this._off[0] - this.camEnu[0],
                            this._off[1] - this.camEnu[1],
                            this._off[2] - this.camEnu[2]);
    this._setModel(pm, this.model);
    ctx.draw(this.airport.mesh);

    /* The aeroplane. Cockpit view still draws the exterior: from the seat you
       see the nose, the wings and the engines, and those are the cues that make
       a turn read as a turn. */
    this._aircraftModel(sim, frame);
    for (var mi = 0; mi < 16; mi++) this.acModel[mi] = this.model[mi];
    this._setModel(pm, this.acModel);
    if (this.aircraft.hull) ctx.draw(this.aircraft.hull);

    /* Moving surfaces get their own transform composed onto the aircraft's.
       Watching the flaps run out over the wing is a large part of why the
       aeroplane reads as real from the flight deck — and it is the fastest way
       to see a control law misbehaving, because a wrong surface position is
       obvious on the wing and invisible in a number. */
    var surf = sim.surf, C = BFS.A320.C;

    if (this.aircraft.flap && surf.flap > 0.05) {
      /* Fowler motion: the flap translates aft and down as it rotates. */
      var fr = surf.flap * U.DEG;
      hinge(this._local, C.wingApex[0] - 4.2, C.wingApex[2], fr,
            -0.030 * surf.flap, 0.010 * surf.flap);
      V.mMul(this.model, this.acModel, this._local);
      this._setModel(pm, this.model);
      ctx.draw(this.aircraft.flap);
    } else if (this.aircraft.flap) {
      this._setModel(pm, this.acModel);
      ctx.draw(this.aircraft.flap);
    }

    if (this.aircraft.slat) {
      /* Slats translate forward and down off the leading edge, with a little
         droop. */
      hinge(this._local, C.wingApex[0], C.wingApex[2], surf.slat * U.DEG * 0.35,
            0.022 * surf.slat, 0.013 * surf.slat);
      V.mMul(this.model, this.acModel, this._local);
      this._setModel(pm, this.model);
      ctx.draw(this.aircraft.slat);
    }

    for (var g = 0; g < 3; g++) {
      var pos = sim.sys.gear.pos[g];
      if (pos <= 0.02 || !this.aircraft.gear[g]) continue;
      /* Two motions: the oleo compressing under load, which raises the axle
         toward the body, and retraction lifting the whole leg into its bay. */
      var stroke = sim.sys.gear.stroke[g] || 0;
      hinge(this._local, 0, 0, 0, 0, -stroke - (1 - pos) * 2.2);
      V.mMul(this.model, this.acModel, this._local);
      this._setModel(pm, this.model);
      ctx.draw(this.aircraft.gear[g]);
    }

    /* ---- lights ---- */
    var pspr = ctx.use(this.pSprite);
    gl.uniformMatrix4fv(pspr.u.uViewProj, false, V.toF32(this.mvp32, this.viewProj));
    gl.uniform1f(pspr.u.uFcoef, this.fcoef);
    gl.uniform1f(pspr.u.uFcoefHalf, this.fcoef * 0.5);
    gl.uniform1f(pspr.u.uScale, 0.55);
    frame.offsetOf(this._off, this.airport.frame);
    gl.uniform3f(pspr.u.uOrigin, this._off[0] - this.camEnu[0],
                                 this._off[1] - this.camEnu[1],
                                 this._off[2] - this.camEnu[2]);
    /* Camera-facing basis for the billboards. */
    V.cross3(this._tmp, this.camDir, this.camUp);
    V.norm3(this._tmp, this._tmp);
    gl.uniform3f(pspr.u.uRight, this._tmp[0], this._tmp[1], this._tmp[2]);
    gl.uniform3f(pspr.u.uUp, this.camUp[0], this.camUp[1], this.camUp[2]);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.bindVertexArray(this.airport.lights.vao);
    ctx._vao = this.airport.lights.vao;
    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, this.airport.lights.n);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    /* ---- cockpit pass ----
       Its own depth range, after a clear, so it can never fight the world, and
       double-sided because the camera is inside the flight deck looking at the
       back of every panel. */
    gl.disable(gl.CULL_FACE);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    V.mPerspective(this.proj, input.fov, w / h, 0.02, 30);
    V.mMul(this.viewProj, this.proj, this.view);

    pm = ctx.use(this.pMesh);
    gl.uniformMatrix4fv(pm.u.uViewProj, false, V.toF32(this.mvp32, this.viewProj));
    this.setSky(pm);
    gl.uniform1f(pm.u.uEmissive, 0.10);

    this._cockpitModel();
    this._setModel(pm, this.model);
    ctx.draw(this.cockpit.structure);

    /* ---- display screens ---- */
    var psc = ctx.use(this.pScreen);
    gl.uniformMatrix4fv(psc.u.uViewProj, false, V.toF32(this.mvp32, this.viewProj));
    gl.uniform1f(psc.u.uFcoef, this.fcoef);
    gl.uniform1f(psc.u.uFcoefHalf, this.fcoef * 0.5);
    gl.uniformMatrix4fv(psc.u.uModel, false, V.toF32(this.model32, this.model));
    gl.uniform1i(psc.u.uTex, 0);

    var names = ["pfd1", "nd1", "pfd2", "nd2"];
    for (var i = 0; i < names.length; i++) {
      var surf = this.displays.byName[names[i]];
      var quad = this.cockpit.screens[names[i]];
      if (!surf || !quad) continue;
      ctx.bindTexture(0, surf.tex.tex);
      gl.uniform1f(psc.u.uBright, 1.0);
      ctx.draw(quad);
    }
  };

  Scene.prototype._setModel = function (prog, m) {
    var gl = this.gl;
    gl.uniformMatrix4fv(prog.u.uModel, false, V.toF32(this.model32, m));
    /* Normal matrix: the upper-left 3x3. Every transform here is a rotation
       plus a translation, so the inverse transpose is the rotation itself. */
    var n = this.normal32;
    n[0] = m[0]; n[1] = m[1]; n[2] = m[2];
    n[3] = m[4]; n[4] = m[5]; n[5] = m[6];
    n[6] = m[8]; n[7] = m[9]; n[8] = m[10];
    gl.uniformMatrix3fv(prog.u.uNormalMat, false, n);
  };

  /* Body(forward-right-down) to camera-relative ENU. */
  var _bodyToEnu = null;
  Scene.prototype._aircraftModel = function (sim, frame) {
    var t = sim.truth;
    frame.geodeticToEnu(this._off, t.geo[0], t.geo[1], t.geo[2]);
    bodyMatrix(this.model, t.quat,
               this._off[0] - this.camEnu[0],
               this._off[1] - this.camEnu[1],
               this._off[2] - this.camEnu[2]);
  };

  Scene.prototype._cockpitModel = function () {
    /* The cockpit geometry is authored with its origin AT the design eye
       position, and the camera is placed at that same point — so the transform
       is the attitude rotation and nothing else. Translating by the eye offset
       as well would move the whole flight deck fifteen metres aft of the pilot.
     *
     * The one adjustment: a320_cockpit.js measures its local x AFT-positive —
     * the windscreen sits at -1.30, the aft bulkhead at +0.75 — whereas body
     * axes are forward-positive. Reflecting x reconciles the two. Without it
     * the aeroplane is built back to front and the bulkhead becomes a solid
     * wall three quarters of a metre in front of the pilot's eyes, which seals
     * the camera inside an unlit box and looks precisely like a renderer that
     * has stopped working. */
    bodyMatrix(this.model, this._lastQuat || this._q, 0, 0, 0);
    this.model[0] = -this.model[0];
    this.model[1] = -this.model[1];
    this.model[2] = -this.model[2];
  };

  Scene.prototype.setAttitude = function (q) { this._lastQuat = q; };

  /* Build a model matrix that takes body coordinates (x forward, y right,
     z down) into ENU, given the attitude quaternion (body -> NED). */
  var _r = new Float64Array(3), _c = [new Float64Array(3), new Float64Array(3), new Float64Array(3)];
  function bodyMatrix(out, q, tx, ty, tz) {
    var axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (var i = 0; i < 3; i++) {
      V.set3(_r, axes[i][0], axes[i][1], axes[i][2]);
      V.qrot(_c[i], q, _r);
      V.nedToEnu(_c[i], _c[i]);
    }
    out[0] = _c[0][0]; out[1] = _c[0][1]; out[2] = _c[0][2]; out[3] = 0;
    out[4] = _c[1][0]; out[5] = _c[1][1]; out[6] = _c[1][2]; out[7] = 0;
    out[8] = _c[2][0]; out[9] = _c[2][1]; out[10] = _c[2][2]; out[11] = 0;
    out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
  }

  /* A local transform in body axes: rotate by `theta` about the body y axis
     through the hinge point (hx, 0, hz), then translate by (tx, 0, tz).
     Positive theta puts a trailing edge down, because body z is down. */
  function hinge(out, hx, hz, theta, tx, tz) {
    var c = Math.cos(theta), s = Math.sin(theta);
    out[0] = c; out[1] = 0; out[2] = -s; out[3] = 0;
    out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
    out[8] = s; out[9] = 0; out[10] = c; out[11] = 0;
    /* Translation column: move the hinge back where it started, then offset. */
    out[12] = hx - (c * hx + s * hz) + tx;
    out[13] = 0;
    out[14] = hz - (-s * hx + c * hz) + tz;
    out[15] = 1;
    return out;
  }

  /* General 4x4 inverse, used once per frame for the sky ray direction. */
  function invert(out, m) {
    var a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3],
        a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
        a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11],
        a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    var b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return out;
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }

  return { Scene: Scene };
})();
