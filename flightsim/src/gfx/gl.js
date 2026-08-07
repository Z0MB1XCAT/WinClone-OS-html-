/* gfx/gl.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util */

/* A thin WebGL2 layer. Deliberately thin: this is a systems simulator, and the
 * renderer's job is to be cheap and predictable rather than general. There is no
 * material system, no render graph and no scene abstraction — just programs,
 * meshes and textures, with uniform locations cached because looking them up per
 * draw is the classic way to make a simple renderer slow for no reason. */

BFS.GL = (function () {
  "use strict";

  function Ctx(gl) {
    this.gl = gl;
    this.programs = {};
    this._prog = null;
    this._vao = null;
    this.drawCalls = 0;
    this.tris = 0;
  }

  Ctx.prototype.compile = function (name, vsSrc, fsSrc) {
    var gl = this.gl;
    function stage(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        var log = gl.getShaderInfoLog(sh);
        var kind = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
        throw new Error(name + " " + kind + " shader:\n" + log + "\n" + numbered(src));
      }
      return sh;
    }
    var p = gl.createProgram();
    gl.attachShader(p, stage(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, stage(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error(name + " link: " + gl.getProgramInfoLog(p));

    var prog = { name: name, p: p, u: {}, a: {} };
    var nU = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < nU; i++) {
      var ui = gl.getActiveUniform(p, i);
      var nm = ui.name.replace(/\[0\]$/, "");
      prog.u[nm] = gl.getUniformLocation(p, nm);
    }
    var nA = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (var j = 0; j < nA; j++) {
      var ai = gl.getActiveAttrib(p, j);
      prog.a[ai.name] = gl.getAttribLocation(p, ai.name);
    }
    this.programs[name] = prog;
    return prog;
  };

  function numbered(src) {
    return src.split("\n").map(function (l, i) {
      return String(i + 1).padStart(4) + " | " + l;
    }).join("\n");
  }

  Ctx.prototype.use = function (prog) {
    if (this._prog === prog) return prog;
    this.gl.useProgram(prog.p);
    this._prog = prog;
    return prog;
  };

  /* Interleaved mesh. `layout` is a list of {name, size, type, norm} describing
     one vertex; the stride is worked out from it. */
  Ctx.prototype.mesh = function (prog, layout, vertices, indices, usage) {
    var gl = this.gl;
    var stride = 0, i;
    for (i = 0; i < layout.length; i++) {
      layout[i].offset = stride;
      stride += layout[i].size * bytesOf(gl, layout[i].type || gl.FLOAT);
    }
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, usage || gl.STATIC_DRAW);

    for (i = 0; i < layout.length; i++) {
      var l = layout[i];
      var loc = prog.a[l.name];
      if (loc === undefined || loc < 0) continue;
      gl.enableVertexAttribArray(loc);
      var type = l.type || gl.FLOAT;
      if (type === gl.INT || type === gl.UNSIGNED_INT ||
          (l.integer && type !== gl.FLOAT))
        gl.vertexAttribIPointer(loc, l.size, type, stride, l.offset);
      else
        gl.vertexAttribPointer(loc, l.size, type, !!l.norm, stride, l.offset);
    }

    var ibo = null, count = 0, itype = gl.UNSIGNED_SHORT;
    if (indices) {
      ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, usage || gl.STATIC_DRAW);
      count = indices.length;
      itype = indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    } else {
      count = vertices.byteLength / stride;
    }
    gl.bindVertexArray(null);

    return { vao: vao, vbo: vbo, ibo: ibo, count: count, itype: itype,
             stride: stride, indexed: !!indices };
  };

  function bytesOf(gl, type) {
    switch (type) {
      case gl.BYTE: case gl.UNSIGNED_BYTE: return 1;
      case gl.SHORT: case gl.UNSIGNED_SHORT: case gl.HALF_FLOAT: return 2;
      default: return 4;
    }
  }

  Ctx.prototype.draw = function (mesh, mode) {
    var gl = this.gl;
    if (this._vao !== mesh.vao) { gl.bindVertexArray(mesh.vao); this._vao = mesh.vao; }
    var m = mode === undefined ? gl.TRIANGLES : mode;
    if (mesh.indexed) gl.drawElements(m, mesh.count, mesh.itype, 0);
    else gl.drawArrays(m, 0, mesh.count);
    this.drawCalls++;
    if (m === gl.TRIANGLES) this.tris += mesh.count / 3;
  };

  Ctx.prototype.drawInstanced = function (mesh, n, mode) {
    var gl = this.gl;
    if (this._vao !== mesh.vao) { gl.bindVertexArray(mesh.vao); this._vao = mesh.vao; }
    var m = mode === undefined ? gl.TRIANGLES : mode;
    if (mesh.indexed) gl.drawElementsInstanced(m, mesh.count, mesh.itype, 0, n);
    else gl.drawArraysInstanced(m, 0, mesh.count, n);
    this.drawCalls++;
  };

  Ctx.prototype.destroyMesh = function (m) {
    var gl = this.gl;
    if (!m) return;
    if (m.vao) gl.deleteVertexArray(m.vao);
    if (m.vbo) gl.deleteBuffer(m.vbo);
    if (m.ibo) gl.deleteBuffer(m.ibo);
    if (this._vao === m.vao) this._vao = null;
  };

  /* A texture backed by a 2D canvas. The instrument displays live on these: the
     canvas is redrawn on a schedule and re-uploaded, which is why the PFD can be
     authentic vector artwork without a single shipped image.

     Immutable storage plus texSubImage2D, and no mipmaps — regenerating a mip
     chain on every upload would cost more than the drawing does. */
  Ctx.prototype.canvasTexture = function (canvas) {
    var gl = this.gl;
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, canvas.width, canvas.height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { tex: t, canvas: canvas, w: canvas.width, h: canvas.height };
  };

  Ctx.prototype.updateCanvasTexture = function (ct) {
    var gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, ct.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, ct.canvas);
  };

  Ctx.prototype.bindTexture = function (unit, tex) {
    var gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  };

  Ctx.prototype.beginFrame = function () { this.drawCalls = 0; this.tris = 0; };

  return { Ctx: Ctx };
})();
