/* disp/gfx2d.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util */

/* Shared drawing helpers and the Airbus palette.
 *
 * Every display draw function has the signature draw(ctx, w, h, sim) and is
 * pure. That is what lets exactly the same code paint the 512-pixel texture
 * glued to the panel in three dimensions and a full-screen two-dimensional
 * version for when the WinClone window is too small to read the panel in the
 * cockpit. One implementation, two surfaces, no possibility of drift.
 */

BFS.G2 = (function () {
  "use strict";

  var U = BFS.Util;

  /* Airbus display colours. Green is the normal state, cyan a selected or
     memorised value, magenta a target from the flight management system, amber a
     caution and red a warning. The convention carries real information, so it is
     followed exactly. */
  var COL = {
    bg: "#0b0f14",
    sky: "#3a7fc4",
    ground: "#8a6a3a",
    green: "#22d13a",
    cyan: "#22d8e0",
    magenta: "#e05fd8",
    amber: "#e0a020",
    red: "#e02a20",
    white: "#e8eef5",
    grey: "#8fa0b0",
    dim: "#3d4a56",
    yellow: "#e8e020"
  };

  /* Fonts are set once per group rather than per call, and text widths for
     fixed labels are precomputed. measureText in a per-frame loop is the classic
     way to make canvas drawing unexpectedly expensive. */
  function font(ctx, px, weight) {
    ctx.font = (weight || "") + " " + px + "px Consolas, 'DejaVu Sans Mono', monospace";
  }

  function text(ctx, s, x, y, col, px, align, baseline) {
    ctx.fillStyle = col;
    font(ctx, px);
    ctx.textAlign = align || "left";
    ctx.textBaseline = baseline || "middle";
    ctx.fillText(s, x, y);
  }

  function line(ctx, x0, y0, x1, y1, col, w) {
    ctx.strokeStyle = col; ctx.lineWidth = w || 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  function rect(ctx, x, y, w, h, col, lw) {
    ctx.strokeStyle = col; ctx.lineWidth = lw || 1;
    ctx.strokeRect(x, y, w, h);
  }

  function fillRect(ctx, x, y, w, h, col) {
    ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
  }

  function circle(ctx, x, y, r, col, lw, fill) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = col; ctx.fill(); }
    else { ctx.strokeStyle = col; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }

  function poly(ctx, pts, col, fill, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = col; ctx.fill(); }
    else { ctx.strokeStyle = col; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }

  /* A managed display surface: a canvas, its 2D context, a dirty flag and a
     redraw budget. The scheduler in scene.js picks the single most overdue one
     each frame, which hard-bounds the cost no matter how many exist. */
  function Surface(name, w, h, hz, drawFn) {
    this.name = name;
    this.canvas = document.createElement("canvas");
    this.canvas.width = w; this.canvas.height = h;
    /* Opaque: faster to composite, and a display unit is not transparent. */
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.w = w; this.h = h;
    this.period = 1 / hz;
    this.last = -1e9;
    this.draw = drawFn;
    this.tex = null;
    this.dirty = true;
  }

  Surface.prototype.overdue = function (t) { return t - this.last - this.period; };

  Surface.prototype.render = function (t, sim) {
    this.last = t;
    var c = this.ctx;
    c.save();
    c.fillStyle = COL.bg;
    c.fillRect(0, 0, this.w, this.h);
    this.draw(c, this.w, this.h, sim);
    c.restore();
  };

  /* Pre-render something once into an offscreen canvas so it can be blitted
     rather than re-pathed every frame. The compass rose and the pitch ladder are
     both drawn this way, and between them that is most of the per-frame path
     work in the whole instrument suite. */
  function prerender(w, h, fn) {
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var c = cv.getContext("2d");
    fn(c, w, h);
    return cv;
  }

  return {
    COL: COL, font: font, text: text, line: line, rect: rect, fillRect: fillRect,
    circle: circle, poly: poly, Surface: Surface, prerender: prerender
  };
})();
