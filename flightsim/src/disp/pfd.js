/* disp/pfd.js
   READS:  sim.adr, sim.fcu, sim.fma, sim.ctl, sim.mass
   WRITES: -
   TICK:   display, 15Hz
   DEPS:   core/util, disp/gfx2d, av/adirs

   The primary flight display. */

BFS.PFD = (function () {
  "use strict";

  var U = BFS.Util, G = BFS.G2, COL = BFS.G2.COL;

  var ladder = null;   // pre-rendered attitude strip

  /* The attitude indicator is the most-redrawn thing on the aeroplane, and
     drawing a pitch ladder as paths every frame is most of a display's cost. So
     the whole sky/ground/ladder is rendered once into a tall strip and then
     blitted with a rotation and a translation. Roll becomes a canvas transform
     and pitch becomes an offset; neither costs anything. */
  function buildLadder() {
    var W = 560, PXDEG = 7.2, RANGE = 95;
    var H = Math.round(RANGE * 2 * PXDEG);
    return {
      pxDeg: PXDEG,
      canvas: G.prerender(W, H, function (c, w, h) {
        var mid = h / 2;
        c.fillStyle = COL.sky; c.fillRect(0, 0, w, mid);
        c.fillStyle = COL.ground; c.fillRect(0, mid, w, h - mid);
        c.strokeStyle = COL.white; c.lineWidth = 2.4;
        c.beginPath(); c.moveTo(0, mid); c.lineTo(w, mid); c.stroke();

        c.lineWidth = 1.6; c.strokeStyle = COL.white;
        G.font(c, 15);
        c.fillStyle = COL.white; c.textBaseline = "middle";
        for (var d = -90; d <= 90; d += 2.5) {
          if (d === 0) continue;
          var y = mid - d * PXDEG;
          var major = (d % 10 === 0), half = (d % 5 === 0);
          var len = major ? 78 : (half ? 44 : 22);
          c.beginPath();
          c.moveTo(w / 2 - len, y); c.lineTo(w / 2 - (major ? 20 : 8), y);
          c.moveTo(w / 2 + (major ? 20 : 8), y); c.lineTo(w / 2 + len, y);
          c.stroke();
          if (major) {
            var lbl = String(Math.abs(d));
            c.textAlign = "right"; c.fillText(lbl, w / 2 - len - 6, y);
            c.textAlign = "left"; c.fillText(lbl, w / 2 + len + 6, y);
          }
        }
        /* Below thirty degrees nose down the ladder gets chevrons pointing back
           to the horizon — the unusual-attitude cue. */
        c.strokeStyle = COL.white;
        for (var s = -1; s <= 1; s += 2) {
          for (var k = 3; k <= 8; k++) {
            var yy = mid - s * k * 10 * PXDEG;
            c.beginPath();
            c.moveTo(w / 2 - 100, yy + s * 26); c.lineTo(w / 2 - 60, yy);
            c.lineTo(w / 2 - 100, yy - s * 26);
            c.moveTo(w / 2 + 100, yy + s * 26); c.lineTo(w / 2 + 60, yy);
            c.lineTo(w / 2 + 100, yy - s * 26);
            c.stroke();
          }
        }
      })
    };
  }

  function attitude(c, cx, cy, r, sim) {
    if (!ladder) ladder = buildLadder();
    var a = sim.adr;

    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();

    c.translate(cx, cy);
    c.rotate(-a.roll * U.DEG);
    c.translate(0, a.pitch * ladder.pxDeg);
    c.drawImage(ladder.canvas, -ladder.canvas.width / 2, -ladder.canvas.height / 2);
    c.restore();

    /* Bank scale and the roll pointer. */
    c.save();
    c.translate(cx, cy);
    c.strokeStyle = COL.white; c.lineWidth = 2;
    var marks = [-45, -30, -20, -10, 10, 20, 30, 45];
    for (var i = 0; i < marks.length; i++) {
      var th = (marks[i] - 90) * U.DEG;
      var big = Math.abs(marks[i]) >= 30;
      c.beginPath();
      c.moveTo(Math.cos(th) * r, Math.sin(th) * r);
      c.lineTo(Math.cos(th) * (r - (big ? 14 : 8)), Math.sin(th) * (r - (big ? 14 : 8)));
      c.stroke();
    }
    c.rotate(-sim.adr.roll * U.DEG);
    G.poly(c, [[0, -r + 2], [-9, -r + 18], [9, -r + 18]], COL.yellow, true);
    /* Slip indicator: the trapezoid under the roll pointer, displaced by lateral
       acceleration. Keeping it centred is the whole of coordinated flight. */
    var slip = U.clamp(sim.adr.slip / 8, -1, 1) * 24;
    c.translate(slip, 0);
    c.strokeStyle = COL.yellow; c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-11, -r + 22); c.lineTo(11, -r + 22);
    c.lineTo(13, -r + 29); c.lineTo(-13, -r + 29); c.closePath(); c.stroke();
    c.restore();

    /* The aircraft symbol: fixed wings and a centre square. */
    c.strokeStyle = COL.yellow; c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx - 68, cy); c.lineTo(cx - 26, cy); c.lineTo(cx - 26, cy + 12);
    c.moveTo(cx + 68, cy); c.lineTo(cx + 26, cy); c.lineTo(cx + 26, cy + 12);
    c.stroke();
    G.fillRect(c, cx - 4, cy - 4, 8, 8, COL.yellow);
  }

  /* Speed tape. The digits scroll in a window cut out of a pre-rendered strip. */
  function speedTape(c, x, cy, h, sim, speeds) {
    var ias = sim.adr.ias;
    var PX = 4.6;          // pixels per knot
    var w = 56;

    G.fillRect(c, x, cy - h / 2, w, h, "rgba(12,16,22,0.72)");

    c.save();
    c.beginPath(); c.rect(x, cy - h / 2, w, h); c.clip();

    var lo = ias - (h / 2) / PX, hi = ias + (h / 2) / PX;
    G.font(c, 17);
    c.textAlign = "right"; c.textBaseline = "middle";
    for (var v = Math.floor(lo / 10) * 10; v <= hi; v += 10) {
      if (v < 30) continue;
      var y = cy + (ias - v) * PX;
      c.strokeStyle = COL.white; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(x + w - 12, y); c.lineTo(x + w, y); c.stroke();
      if (v % 20 === 0) { c.fillStyle = COL.white; c.fillText(String(v), x + w - 15, y); }
    }

    /* Speed limits, as bands down the right edge of the tape. VLS amber, alpha
       protection black-and-amber, VMAX red-and-black. These are the numbers the
       fly-by-wire will later protect against, drawn from the same source. */
    function band(v0, v1, style) {
      var y0 = cy + (ias - v1) * PX, y1 = cy + (ias - v0) * PX;
      c.fillStyle = style;
      c.fillRect(x + w - 6, y0, 6, y1 - y0);
    }
    band(speeds.vAlphaMax - 60, speeds.vAlphaMax, COL.red);
    band(speeds.vAlphaMax, speeds.vls, COL.amber);
    band(speeds.vmax, speeds.vmax + 80, COL.red);

    c.restore();

    G.rect(c, x, cy - h / 2, w, h, COL.grey, 1);

    /* The readout box. */
    c.save();
    G.fillRect(c, x - 4, cy - 15, w + 12, 30, "#000");
    G.rect(c, x - 4, cy - 15, w + 12, 30, COL.yellow, 2);
    G.text(c, Math.round(ias) >= 30 ? String(Math.round(ias)) : "---",
           x + w + 3, cy, COL.white, 22, "right");
    c.restore();

    /* Mach, below the tape, once it is worth showing. */
    if (sim.adr.mach > 0.45)
      G.text(c, "." + String(Math.round(sim.adr.mach * 1000)).padStart(3, "0"),
             x + w / 2, cy + h / 2 + 20, COL.green, 17, "center");

    /* Selected speed bug. */
    var sy = cy + (ias - sim.fcu.spd) * PX;
    if (sy > cy - h / 2 && sy < cy + h / 2) {
      G.poly(c, [[x + w + 2, sy], [x + w + 12, sy - 7], [x + w + 12, sy + 7]],
             sim.fcu.spdMode === "man" ? COL.cyan : COL.magenta, true);
    }
  }

  function altTape(c, x, cy, h, sim) {
    var alt = sim.adr.altBaro;
    var PX = 0.30;         // pixels per foot
    var w = 70;

    G.fillRect(c, x, cy - h / 2, w, h, "rgba(12,16,22,0.72)");
    c.save();
    c.beginPath(); c.rect(x, cy - h / 2, w, h); c.clip();

    var lo = alt - (h / 2) / PX, hi = alt + (h / 2) / PX;
    G.font(c, 16);
    c.textAlign = "left"; c.textBaseline = "middle";
    for (var v = Math.floor(lo / 100) * 100; v <= hi; v += 100) {
      var y = cy + (alt - v) * PX;
      c.strokeStyle = COL.white; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (v % 500 === 0 ? 14 : 8), y); c.stroke();
      if (v % 500 === 0) { c.fillStyle = COL.white; c.fillText(String(v), x + 17, y); }
    }

    /* Ground, as a hatched region below field elevation. */
    if (sim.adr.ralt >= 0) {
      var gy = cy + sim.adr.ralt * PX;
      c.fillStyle = "rgba(224,42,32,0.55)";
      c.fillRect(x, gy, w, Math.max(0, cy + h / 2 - gy));
    }
    c.restore();

    G.rect(c, x, cy - h / 2, w, h, COL.grey, 1);

    G.fillRect(c, x - 6, cy - 16, w + 12, 32, "#000");
    G.rect(c, x - 6, cy - 16, w + 12, 32, COL.yellow, 2);
    G.text(c, String(Math.round(alt / 10) * 10), x + w + 3, cy, COL.green, 21, "right");

    /* Selected altitude bug and the FCU value above the tape. */
    var by = cy + (alt - sim.fcu.alt) * PX;
    if (by > cy - h / 2 && by < cy + h / 2)
      G.poly(c, [[x - 2, by], [x - 12, by - 7], [x - 12, by + 7]], COL.cyan, true);
    G.text(c, String(sim.fcu.alt), x + w / 2, cy - h / 2 - 16, COL.cyan, 17, "center");
  }

  function vsi(c, x, cy, h, sim) {
    var vs = U.clamp(sim.adr.vs, -6000, 6000);
    G.fillRect(c, x, cy - h / 2, 34, h, "rgba(12,16,22,0.6)");
    G.rect(c, x, cy - h / 2, 34, h, COL.grey, 1);

    /* Non-linear scale: fine near zero, compressed at the extremes, as on the
       aeroplane — the difference between 200 and 400 feet a minute matters far
       more than between 4,000 and 5,000. */
    function vsy(v) {
      var a = Math.abs(v) / 6000;
      var t = Math.pow(a, 0.62);
      return cy - Math.sign(v) * t * (h / 2 - 6);
    }
    c.strokeStyle = COL.white; c.lineWidth = 1.4;
    var ticks = [500, 1000, 2000, 6000];
    for (var i = 0; i < ticks.length; i++) {
      for (var s = -1; s <= 1; s += 2) {
        var y = vsy(ticks[i] * s);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (i % 2 ? 12 : 7), y); c.stroke();
      }
    }
    var y0 = vsy(vs);
    c.strokeStyle = Math.abs(vs) > 2000 ? COL.amber : COL.green; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x + 2, cy); c.lineTo(x + 32, y0); c.stroke();
    if (Math.abs(vs) >= 100)
      G.text(c, String(Math.round(Math.abs(vs) / 100)), x + 17,
             vs > 0 ? cy - h / 2 - 12 : cy + h / 2 + 12, COL.green, 15, "center");
  }

  function heading(c, cx, y, w, sim) {
    var hdg = sim.adr.hdgMag;
    var PX = w / 60;      // 60 degrees across the strip
    G.fillRect(c, cx - w / 2, y, w, 30, "rgba(12,16,22,0.72)");
    c.save();
    c.beginPath(); c.rect(cx - w / 2, y, w, 30); c.clip();
    G.font(c, 15);
    c.textAlign = "center"; c.textBaseline = "top";
    for (var d = Math.floor((hdg - 32) / 5) * 5; d <= hdg + 32; d += 5) {
      var x = cx + U.wrapPi((d - hdg) * U.DEG) * U.RAD * PX;
      var major = (((d % 360) + 360) % 360) % 10 === 0;
      c.strokeStyle = COL.white; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + (major ? 10 : 6)); c.stroke();
      if (major) {
        c.fillStyle = COL.white;
        c.fillText(String((((d % 360) + 360) % 360) / 10 | 0).padStart(2, "0"), x, y + 12);
      }
    }
    /* Track index — where the aeroplane is actually going, as opposed to where
       it is pointing. In a crosswind those differ, and this is the difference. */
    var tx = cx + U.wrapPi((sim.adr.trkMag - hdg) * U.DEG) * U.RAD * PX;
    G.poly(c, [[tx, y + 4], [tx - 6, y + 16], [tx + 6, y + 16]], COL.green, true);
    c.restore();
    G.rect(c, cx - w / 2, y, w, 30, COL.grey, 1);
    G.poly(c, [[cx, y - 2], [cx - 7, y - 12], [cx + 7, y - 12]], COL.yellow, true);
  }

  function fma(c, w, sim) {
    G.fillRect(c, 0, 0, w, 34, "#0a0d12");
    G.line(c, 0, 34, w, 34, COL.grey, 1);
    var f = sim.fma;
    var cols = [f.thr, f.vert, f.lat, f.appr];
    for (var i = 0; i < 4; i++) {
      if (!cols[i]) continue;
      G.text(c, cols[i], (i + 0.5) * (w / 4), 17, COL.green, 15, "center");
    }
    for (var j = 1; j < 4; j++) G.line(c, j * (w / 4), 2, j * (w / 4), 32, COL.dim, 1);
  }

  function draw(c, w, h, sim) {
    var speeds = sim._speeds || { vls: 130, vAlphaMax: 118, vmax: 350 };
    var cx = w * 0.50, cy = h * 0.47, r = Math.min(w, h) * 0.235;

    fma(c, w, sim);
    attitude(c, cx, cy, r, sim);
    speedTape(c, w * 0.075, cy, h * 0.56, sim, speeds);
    altTape(c, w * 0.705, cy, h * 0.56, sim);
    vsi(c, w * 0.855, cy, h * 0.56, sim);
    heading(c, cx, h * 0.845, w * 0.56, sim);

    /* Radio altitude, below the attitude ball, once it is live. */
    if (sim.adr.ralt >= 0 && sim.adr.ralt < 2500) {
      var ra = sim.adr.ralt;
      G.text(c, String(ra < 100 ? Math.round(ra) : Math.round(ra / 10) * 10),
             cx, cy + r + 22, ra < 200 ? COL.amber : COL.green, 22, "center");
    }

    /* Barometric setting. */
    G.text(c, sim.env.qnh === 1013.25 ? "STD" : "QNH " + Math.round(sim.env.qnh),
           w * 0.74, h * 0.80, COL.cyan, 15, "left");
  }

  return { draw: draw };
})();
