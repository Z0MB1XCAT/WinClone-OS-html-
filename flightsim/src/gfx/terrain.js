/* gfx/terrain.js
   READS:  sim.truth
   WRITES: -
   TICK:   render
   DEPS:   core/util, core/geo, terrain/heightfield, gfx/gl */

/* Terrain rendering, as a single warped grid that follows the aircraft.
 *
 * The usual answer is a quadtree of tiles with screen-space error metrics. That
 * is the right structure once elevation is streaming in at several zoom levels,
 * and it is what Phase 2 builds. For Phase 1 — where all the elevation is
 * already resident in two baked grids — it would be a lot of machinery for no
 * visible gain.
 *
 * So instead: one grid of vertices whose spacing grows quadratically with
 * distance from the aircraft. Dense underneath, coarse at the horizon, one
 * vertex buffer, one draw call, and level of detail that is smooth by
 * construction rather than by managing seams between tiles. It reaches sixty
 * kilometres with sixteen thousand vertices, which at four metre spacing
 * underneath the aeroplane is finer than the elevation data it is sampling.
 *
 * Rebuilding is time-sliced. Sampling sixteen thousand heights costs perhaps
 * twenty milliseconds, which would be a visible hitch every time it happened, so
 * the work is spread over several frames into a back buffer and swapped when
 * complete. The grid only needs rebuilding when the aircraft has moved a
 * meaningful fraction of the inner spacing anyway.
 */

BFS.TerrainView = (function () {
  "use strict";

  var U = BFS.Util, Geo = BFS.Geo, H = BFS.Height;

  var N = 64;                  // half-resolution: the grid is (2N+1)^2
  var MAX_DIST = 60000;        // metres to the outermost ring
  var REBUILD_M = 220;         // aircraft movement that triggers a rebuild
  var ROWS_PER_FRAME = 26;     // time slice

  var SIDE = 2 * N + 1;
  var VERTS = SIDE * SIDE;
  var STRIDE = 7;              // pos3, normal3, cover1

  function warp(t) {
    /* t in [-1,1] -> distance, quadratic so the inner ring is dense. */
    return Math.sign(t) * t * t * MAX_DIST;
  }

  function TerrainView(ctx, prog) {
    this.ctx = ctx;
    this.prog = prog;
    this.data = new Float32Array(VERTS * STRIDE);
    this.scratch = new Float32Array(VERTS * STRIDE);
    this.indices = buildIndices();
    this.mesh = null;
    this.originLat = 0; this.originLon = 0;
    this.buildLat = 0; this.buildLon = 0;
    this.row = -1;               // -1 = idle
    this.ready = false;
    this._offset = new Float64Array(3);

    /* Precompute the grid offsets once; they never change. */
    this.gx = new Float64Array(SIDE);
    for (var i = 0; i < SIDE; i++) this.gx[i] = warp((i - N) / N);
  }

  function buildIndices() {
    var idx = new Uint32Array(2 * N * 2 * N * 6);
    var k = 0;
    for (var j = 0; j < SIDE - 1; j++) {
      for (var i = 0; i < SIDE - 1; i++) {
        /* Wound counter-clockwise seen from above, so the surface normal points
           up and the ground is not the side that faces away from the sky. */
        var a = j * SIDE + i, b = a + 1, c = a + SIDE, d = c + 1;
        idx[k++] = a; idx[k++] = b; idx[k++] = c;
        idx[k++] = b; idx[k++] = d; idx[k++] = c;
      }
    }
    return idx;
  }

  /* Sample one row of the grid into the scratch buffer. */
  TerrainView.prototype._row = function (j) {
    var lat0 = this.buildLat, lon0 = this.buildLon;
    var mPerLat = 111320, mPerLon = 111320 * Math.cos(lat0 * U.DEG);
    var north = this.gx[j];
    var lat = lat0 + north / mPerLat;
    var s = this.scratch;

    for (var i = 0; i < SIDE; i++) {
      var east = this.gx[i];
      var lon = lon0 + east / mPerLon;
      var h = H.at(lat, lon);

      var o = (j * SIDE + i) * STRIDE;
      s[o] = east; s[o + 1] = north; s[o + 2] = h;

      /* Cover: 1 for water, 2 for urban, 0 otherwise. Water is decided by the
         elevation itself — terrarium encodes bathymetry as negative, so the
         Bristol Channel identifies itself. */
      s[o + 6] = h < 0.35 ? 1 : 0;
    }
  };

  /* Normals from the finished heights. Central differences on the grid, which
     is non-uniform, so the spacing has to come from the grid itself. */
  TerrainView.prototype._normals = function () {
    var s = this.scratch;
    for (var j = 0; j < SIDE; j++) {
      for (var i = 0; i < SIDE; i++) {
        var o = (j * SIDE + i) * STRIDE;
        var i0 = Math.max(0, i - 1), i1 = Math.min(SIDE - 1, i + 1);
        var j0 = Math.max(0, j - 1), j1 = Math.min(SIDE - 1, j + 1);
        var oL = (j * SIDE + i0) * STRIDE, oR = (j * SIDE + i1) * STRIDE;
        var oD = (j0 * SIDE + i) * STRIDE, oU = (j1 * SIDE + i) * STRIDE;
        var dx = s[oR] - s[oL] || 1, dy = s[oU + 1] - s[oD + 1] || 1;
        var nx = -(s[oR + 2] - s[oL + 2]) / dx;
        var ny = -(s[oU + 2] - s[oD + 2]) / dy;
        var inv = 1 / Math.hypot(nx, ny, 1);
        s[o + 3] = nx * inv; s[o + 4] = ny * inv; s[o + 5] = inv;
      }
    }
  };

  TerrainView.prototype._startBuild = function (lat, lon) {
    this.buildLat = lat; this.buildLon = lon;
    this.row = 0;
  };

  TerrainView.prototype.update = function (sim, frame, budgetMs) {
    var t = sim.truth;

    if (this.row < 0) {
      var moved = Geo.distance(t.geo[0], t.geo[1], this.originLat, this.originLon);
      if (!this.ready || moved > REBUILD_M) this._startBuild(t.geo[0], t.geo[1]);
    }

    if (this.row >= 0) {
      var end = Math.min(SIDE, this.row + ROWS_PER_FRAME);
      for (; this.row < end; this.row++) this._row(this.row);
      if (this.row >= SIDE) {
        this._normals();
        var tmp = this.data; this.data = this.scratch; this.scratch = tmp;
        this.originLat = this.buildLat; this.originLon = this.buildLon;
        this._upload();
        this.ready = true;
        this.row = -1;
      }
    }
  };

  TerrainView.prototype._upload = function () {
    var gl = this.ctx.gl;
    if (!this.mesh) {
      this.mesh = this.ctx.mesh(this.prog, [
        { name: "aPos", size: 3 }, { name: "aNormal", size: 3 }, { name: "aCover", size: 1 }
      ], this.data, this.indices, gl.DYNAMIC_DRAW);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data);
    }
  };

  /* The grid is built around wherever the aircraft was when it was last
     rebuilt, which is not where the camera is now. The difference is applied as
     a uniform offset rather than by rebuilding — that is the entire reason the
     rebuild can be lazy. */
  TerrainView.prototype.draw = function (frame, camEnu) {
    if (!this.ready || !this.mesh) return;
    var gl = this.ctx.gl, p = this.prog;

    /* The grid stores each vertex's height as metres above the ellipsoid, so the
       offset has to carry the vertical position of the grid's origin as well as
       its horizontal one. Dropping the vertical term leaves the whole landscape
       floating at its own absolute altitude above a camera that thinks it is at
       zero — sixty-odd metres up, in Cardiff's case, which renders as the
       underside of the world and looks exactly like nothing rendering at all. */
    var o = this._offset;
    frame.geodeticToEnu(o, this.originLat, this.originLon, 0);

    gl.uniform3f(p.u.uOffset,
                 o[0] - camEnu[0], o[1] - camEnu[1], o[2] - camEnu[2]);
    this.ctx.draw(this.mesh);
  };

  return { TerrainView: TerrainView, N: N, MAX_DIST: MAX_DIST };
})();
