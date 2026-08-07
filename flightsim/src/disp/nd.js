/* disp/nd.js
   READS:  sim.adr, sim.nd, sim.fcu, sim.truth
   WRITES: -
   TICK:   display, 10Hz
   DEPS:   core/util, core/geo, disp/gfx2d, data/egff

   The navigation display, in ARC mode. */

BFS.ND = (function () {
  "use strict";

  var U = BFS.Util, Geo = BFS.Geo, G = BFS.G2, COL = BFS.G2.COL;

  var rose = null;

  /* The compass rose is drawn once at zero degrees and then blitted through a
     rotation. Re-pathing 72 tick marks and 12 labels ten times a second is
     exactly the kind of cost that adds up invisibly. */
  function buildRose(R) {
    var S = R * 2 + 40;
    return G.prerender(S, S, function (c, w, h) {
      var cx = w / 2, cy = h / 2;
      c.strokeStyle = COL.white;
      G.font(c, 15);
      c.textAlign = "center"; c.textBaseline = "middle";
      for (var d = 0; d < 360; d += 5) {
        var th = (d - 90) * U.DEG;
        var major = d % 10 === 0, label = d % 30 === 0;
        var len = major ? 11 : 6;
        c.lineWidth = major ? 1.8 : 1.2;
        c.beginPath();
        c.moveTo(cx + Math.cos(th) * R, cy + Math.sin(th) * R);
        c.lineTo(cx + Math.cos(th) * (R - len), cy + Math.sin(th) * (R - len));
        c.stroke();
        if (label) {
          c.fillStyle = COL.white;
          var lx = cx + Math.cos(th) * (R - 26), ly = cy + Math.sin(th) * (R - 26);
          c.fillText(d === 0 ? "N" : d === 90 ? "E" : d === 180 ? "S" : d === 270 ? "W"
                     : String(d / 10), lx, ly);
        }
      }
    });
  }

  function draw(c, w, h, sim) {
    var R = Math.min(w * 0.46, h * 0.62);
    var cx = w / 2, cy = h * 0.80;
    if (!rose || rose.width !== R * 2 + 40) rose = buildRose(R);

    var hdg = sim.adr.hdgMag;
    var range = sim.nd.range;

    /* Range rings at a half and a full range. */
    c.strokeStyle = COL.white; c.lineWidth = 1;
    for (var f = 0.5; f <= 1.0; f += 0.5) {
      c.setLineDash(f < 1 ? [5, 6] : []);
      c.beginPath();
      c.arc(cx, cy, R * f, Math.PI * 1.18, Math.PI * 1.82);
      c.stroke();
    }
    c.setLineDash([]);

    /* Compass, rotated so the current heading is at the top. */
    c.save();
    c.beginPath(); c.arc(cx, cy, R + 2, 0, Math.PI * 2); c.clip();
    c.translate(cx, cy);
    c.rotate(-hdg * U.DEG);
    c.drawImage(rose, -rose.width / 2, -rose.height / 2);
    c.restore();

    /* Heading index at the top of the arc. */
    G.poly(c, [[cx, cy - R], [cx - 7, cy - R - 13], [cx + 7, cy - R - 13]], COL.yellow, true);

    /* Selected heading bug. */
    var dh = U.wrapPi((sim.fcu.hdg - hdg) * U.DEG);
    var bth = dh - Math.PI / 2;
    G.poly(c, [
      [cx + Math.cos(bth) * R, cy + Math.sin(bth) * R],
      [cx + Math.cos(bth - 0.035) * (R + 13), cy + Math.sin(bth - 0.035) * (R + 13)],
      [cx + Math.cos(bth + 0.035) * (R + 13), cy + Math.sin(bth + 0.035) * (R + 13)]
    ], COL.cyan, true);

    /* Track line: where the aeroplane is going. */
    var dt = U.wrapPi((sim.adr.trkMag - hdg) * U.DEG);
    c.save();
    c.translate(cx, cy); c.rotate(dt);
    G.line(c, 0, 0, 0, -R, COL.green, 1.6);
    c.restore();

    /* The aeroplane symbol at the origin of the arc. */
    c.strokeStyle = COL.yellow; c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(cx, cy - 12); c.lineTo(cx, cy + 12);
    c.moveTo(cx - 12, cy); c.lineTo(cx + 12, cy);
    c.moveTo(cx - 6, cy + 10); c.lineTo(cx + 6, cy + 10);
    c.stroke();

    /* The aerodrome and its runway, drawn to scale. Seeing the runway rotate
       under the track line is most of what makes a visual circuit flyable. */
    drawAirport(c, cx, cy, R, range, hdg, sim);

    /* Navaids within range. */
    var E = BFS.EGFF;
    for (var i = 0; i < E.NAVAIDS.length; i++) {
      var nv = E.NAVAIDS[i];
      var p = project(cx, cy, R, range, hdg, sim, nv.lat, nv.lon);
      if (!p) continue;
      c.save();
      c.translate(p[0], p[1]);
      G.poly(c, [[0, -7], [6, 3.5], [-6, 3.5]], COL.white, false, 1.4);
      c.restore();
      G.text(c, nv.id, p[0] + 9, p[1] + 8, COL.white, 12, "left");
    }

    /* Header: mode, range, ground speed, true airspeed and wind. */
    G.text(c, "ARC", 8, 14, COL.white, 15);
    G.text(c, String(range) + " NM", w - 8, 14, COL.white, 15, "right");
    G.text(c, "GS", 8, 34, COL.white, 13);
    G.text(c, String(Math.round(sim.adr.gs)), 30, 34, COL.green, 15);
    G.text(c, "TAS", 66, 34, COL.white, 13);
    G.text(c, String(Math.round(sim.adr.tas)), 96, 34, COL.green, 15);

    var wdir = sim._wind ? sim._wind.dir : 0, wspd = sim._wind ? sim._wind.kt : 0;
    if (wspd > 0.5) {
      G.text(c, String(Math.round(wdir)).padStart(3, "0") + "/" + Math.round(wspd),
             8, 54, COL.green, 14);
      var wth = (wdir - hdg + 180) * U.DEG;
      c.save(); c.translate(46, 76); c.rotate(wth);
      G.line(c, 0, -11, 0, 11, COL.green, 1.6);
      G.poly(c, [[0, 11], [-4, 4], [4, 4]], COL.green, true);
      c.restore();
    }
  }

  var _enu = new Float64Array(3);
  function project(cx, cy, R, rangeNm, hdg, sim, lat, lon) {
    var d = Geo.distance(sim.truth.geo[0], sim.truth.geo[1], lat, lon) / 1852;
    if (d > rangeNm * 1.25) return null;
    var b = Geo.bearing(sim.truth.geo[0], sim.truth.geo[1], lat, lon)
            - BFS.Geo.magVarUK(lat, lon);
    var th = (b - hdg - 90) * U.DEG;
    var r = (d / rangeNm) * R;
    return [cx + Math.cos(th) * r, cy + Math.sin(th) * r];
  }

  var _g = new Float64Array(2);
  function drawAirport(c, cx, cy, R, range, hdg, sim) {
    var E = BFS.EGFF, L = E.length();
    var a = project(cx, cy, R, range, hdg, sim, E.THR12.lat, E.THR12.lon);
    var b = project(cx, cy, R, range, hdg, sim, E.THR30.lat, E.THR30.lon);
    if (!a || !b) return;

    /* At close range the runway is drawn to width; further out it is a line. */
    var px = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (px > 26) {
      var wpx = px * (E.RWY.width / L);
      var dx = (b[0] - a[0]) / px, dy = (b[1] - a[1]) / px;
      var nx = -dy * wpx / 2, ny = dx * wpx / 2;
      G.poly(c, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny],
                 [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], COL.white, false, 1.4);
    } else {
      G.line(c, a[0], a[1], b[0], b[1], COL.white, 2);
    }
    G.text(c, "EGFF", (a[0] + b[0]) / 2 + 8, (a[1] + b[1]) / 2 - 8, COL.white, 12, "left");
  }

  return { draw: draw };
})();
