/* gfx/a320_ext.js
   READS:  sim.surf, sim.sys.gear, sim.sys.eng
   WRITES: -
   TICK:   render
   DEPS:   core/util, gfx/meshgen, sim/a320_config

   The A320 exterior, generated from the same numbers the flight model uses. */

/* Control surfaces are separate meshes on their own hinges, driven straight from
 * sim.surf. That costs a handful of extra draw calls and pays for itself twice:
 * from the flight deck you watch the flaps run out over the wing, which is a
 * large part of what makes the aeroplane feel real; and it is by far the best
 * debugging tool in the simulator, because a control law misbehaving is visible
 * on the wing rather than buried in a number.
 */

BFS.A320Ext = (function () {
  "use strict";

  var U = BFS.Util, M = BFS.MeshGen, A = BFS.A320, C = BFS.A320.C;

  var WHITE = [0.88, 0.89, 0.90];
  var GREY = [0.62, 0.64, 0.66];
  var DARK = [0.17, 0.18, 0.20];
  var BELLY = [0.74, 0.75, 0.77];
  var ENGINE = [0.80, 0.81, 0.83];
  var TAIL = [0.16, 0.36, 0.62];
  var RUBBER = [0.10, 0.10, 0.11];
  var METAL = [0.55, 0.57, 0.60];

  /* Fuselage stations: x from the datum, half-width, half-height, vertical
     offset of the section centre. The nose and tail taper; the belly fairing
     bulges over the wingbox. */
  function fuselage(B) {
    var noseX = C.noseToDatum;
    var tailX = noseX - C.length;
    var r = C.fuseDia / 2;
    var stations = [
      [noseX,            0.02, 0.02,  0.35],
      [noseX - 0.7,      0.55, 0.48,  0.28],
      [noseX - 1.8,      1.15, 1.05,  0.14],
      [noseX - 3.2,      1.70, 1.62,  0.04],
      [noseX - 5.0,      r,    r,     0],
      [noseX - 9.0,      r,    r,     0],
      [noseX - 14.0,     r,    r * 1.06, 0.06],
      [noseX - 18.5,     r,    r * 1.09, 0.08],
      [noseX - 23.0,     r,    r,     0],
      [noseX - 28.0,     r * 0.95, r * 0.95, -0.12],
      [noseX - 32.0,     r * 0.72, r * 0.72, -0.55],
      [noseX - 35.2,     r * 0.40, r * 0.42, -1.05],
      [tailX + 0.4,      0.10, 0.16, -1.45]
    ];
    var sections = stations.map(function (s) {
      return M.superellipse(s[0], s[1], s[2], 2.12, 20, s[3]);
    });
    M.loft(B, sections, WHITE, {
      colour: function (p) {
        /* Belly grey below the waterline, plus a cheatline at window height. */
        if (p[2] > 1.0) return BELLY;
        if (p[2] > -0.55 && p[2] < -0.05) return WHITE;
        return WHITE;
      }
    });
  }

  /* Windows and doors, as recessed dark quads on the fuselage side. Cheaper and
     crisper than a texture, and there is no image to ship. */
  function windows(B) {
    var noseX = C.noseToDatum, r = C.fuseDia / 2;
    var z = -0.42, y = r * 0.985;
    for (var i = 0; i < 34; i++) {
      var x = noseX - 6.2 - i * 0.82;
      if (x < noseX - C.length + 8) break;
      for (var side = -1; side <= 1; side += 2) {
        var yy = y * side;
        M.quadFlat(B, [x - 0.16, yy, z - 0.16], [x + 0.16, yy, z - 0.16],
                      [x + 0.16, yy, z + 0.16], [x - 0.16, yy, z + 0.16],
                   [0.07, 0.09, 0.12], 1);
      }
    }
    /* Passenger doors. */
    var doors = [noseX - 4.4, noseX - 12.6, noseX - 24.0, noseX - 31.0];
    for (var d = 0; d < doors.length; d++) {
      for (var s2 = -1; s2 <= 1; s2 += 2) {
        M.quadFlat(B, [doors[d] - 0.45, r * 0.99 * s2, -0.95],
                      [doors[d] + 0.45, r * 0.99 * s2, -0.95],
                      [doors[d] + 0.45, r * 0.99 * s2, 0.85],
                      [doors[d] - 0.45, r * 0.99 * s2, 0.85], [0.80, 0.81, 0.83], 0.9);
      }
    }
    /* Flight deck windows: the shape that makes an A320 recognisable. */
    for (var s3 = -1; s3 <= 1; s3 += 2) {
      var wy = 1.62 * s3;
      M.quadFlat(B, [noseX - 1.55, wy, -0.90], [noseX - 2.55, wy, -1.05],
                    [noseX - 2.55, wy, -0.35], [noseX - 1.60, wy, -0.30],
                 [0.06, 0.08, 0.11], 1);
      M.quadFlat(B, [noseX - 2.62, wy * 1.01, -1.04], [noseX - 3.40, wy * 1.01, -1.02],
                    [noseX - 3.40, wy * 1.01, -0.42], [noseX - 2.62, wy * 1.01, -0.36],
                 [0.06, 0.08, 0.11], 1);
    }
  }

  function wing(B, side) {
    var semi = C.span / 2;
    var sec = M.airfoil(C.wingTc, 0.018, 0.42, true, 14);
    var stations = [];
    var etas = [0, 0.12, C.kinkEta, 0.55, 0.78, 0.94, 1.0];
    for (var i = 0; i < etas.length; i++) {
      var eta = etas[i];
      var chord = A.chordAt(eta);
      var y = side * eta * semi;
      var x = C.wingApex[0] - eta * semi * Math.tan(C.sweepQC);
      var z = C.wingApex[2] - eta * semi * Math.tan(C.dihedral);
      /* The wingtip fence kicks up at the very end. */
      if (eta > 0.985) z -= 1.05;
      stations.push({
        le: [x, y, z], chord: eta > 0.985 ? chord * 0.75 : chord,
        twist: C.rootIncidence + C.washout * eta, section: sec
      });
    }
    M.wingPanel(B, stations, WHITE);
  }

  function tailplane(B) {
    var sec = M.airfoil(C.htTc, 0, 0.4, false, 10);
    for (var side = -1; side <= 1; side += 2) {
      var st = [];
      for (var i = 0; i <= 4; i++) {
        var e = i / 4;
        var y = side * e * C.htSpan / 2;
        var chord = (C.htArea / C.htSpan) * (1.35 - 0.7 * e);
        st.push({
          le: [C.htPos[0] - Math.abs(y) * Math.tan(C.htSweep) + chord * 0.25,
               y, C.htPos[2] - e * 0.35],
          chord: chord, twist: 0, section: sec
        });
      }
      M.wingPanel(B, st, WHITE);
    }
  }

  function fin(B) {
    var sec = M.airfoil(C.vtTc, 0, 0.4, false, 10);
    var st = [];
    for (var i = 0; i <= 5; i++) {
      var e = i / 5;
      var chord = (C.vtArea / C.vtSpan) * (1.45 - 0.85 * e);
      st.push({
        le: [C.vtPos[0] - e * C.vtSpan * Math.tan(C.vtSweep) + chord * 0.25,
             0, C.vtPos[2] - e * C.vtSpan],
        chord: chord, twist: 0, section: sec
      });
    }
    /* The fin is built in the x-z plane, so loft it as a swept surface by
       rotating the section into the vertical. */
    var sections = st.map(function (s) {
      var ring = [];
      for (var j = 0; j < s.section.length; j++) {
        var cx = (s.section[j][0] - 0.25) * s.chord;
        var cy = s.section[j][1] * s.chord;
        ring.push([s.le[0] - cx, cy, s.le[2]]);
      }
      return ring;
    });
    M.loft(B, sections, TAIL);
  }

  function nacelle(B, side) {
    var p = C.engPos[side];
    var r = C.engDia / 2;
    var profile = [
      [p[0] + 0.00, r * 0.72],
      [p[0] - 0.18, r * 1.02],
      [p[0] - 0.55, r * 1.10],
      [p[0] - 1.60, r * 1.12],
      [p[0] - 2.80, r * 1.02],
      [p[0] - 3.60, r * 0.86],
      [p[0] - 4.10, r * 0.60],
      [p[0] - 4.40, r * 0.40]
    ];
    var B2 = { v: B.v, idx: B.idx, base: 0, vertex: B.vertex, tri: B.tri, quad: B.quad };
    var start = M.revolve(B, profile, 16, ENGINE);
    /* Shift the revolve, which was built about the x axis at the origin. */
    var stride = BFS.MeshGen.Builder.STRIDE;
    for (var i = start; i < B.v.length / stride; i++) {
      B.v[i * stride + 1] += p[1];
      B.v[i * stride + 2] += p[2];
    }
    /* Fan face and pylon. */
    M.box(B, p[0] - 2.4, p[1], p[2] - 1.15, 2.4, 0.28, 1.5, GREY, 0.85);
    M.quadFlat(B, [p[0] - 0.05, p[1] - r * 0.7, p[2] - r * 0.7],
                  [p[0] - 0.05, p[1] + r * 0.7, p[2] - r * 0.7],
                  [p[0] - 0.05, p[1] + r * 0.7, p[2] + r * 0.7],
                  [p[0] - 0.05, p[1] - r * 0.7, p[2] + r * 0.7], DARK, 0.6);
  }

  function gearLeg(B, i) {
    var g = C.gear[i];
    var p = g.pos;
    /* Oleo: a fixed cylinder and a sliding one. Compression is applied at draw
       time from sim.sys.gear.stroke, which is why they are separate meshes. */
    M.box(B, p[0], p[1], p[2] - g.travel * 0.5 - 0.55, 0.22, 0.22, 1.3, METAL, 0.75);
    if (i === 0) {
      wheel(B, p[0], p[1] - 0.22, p[2], g.radius, 0.16);
      wheel(B, p[0], p[1] + 0.22, p[2], g.radius, 0.16);
    } else {
      var s = p[1] > 0 ? 1 : -1;
      wheel(B, p[0] + 0.50, p[1] - 0.30 * s, p[2], g.radius, 0.24);
      wheel(B, p[0] + 0.50, p[1] + 0.30 * s, p[2], g.radius, 0.24);
      wheel(B, p[0] - 0.50, p[1] - 0.30 * s, p[2], g.radius, 0.24);
      wheel(B, p[0] - 0.50, p[1] + 0.30 * s, p[2], g.radius, 0.24);
    }
  }

  function wheel(B, x, y, z, r, w) {
    var segs = 12;
    var prev = null;
    for (var i = 0; i <= segs; i++) {
      var th = (i / segs) * Math.PI * 2;
      var cz = z + Math.cos(th) * r, cx = x + Math.sin(th) * r;
      if (prev) {
        M.quadFlat(B, [prev[0], y - w, prev[1]], [cx, y - w, cz],
                      [cx, y + w, cz], [prev[0], y + w, prev[1]], RUBBER, 0.7);
      }
      prev = [cx, cz];
    }
  }

  /* ------------------------------------------------------------------ build */

  function build(ctx, prog) {
    var parts = {};

    var hull = new M.Builder();
    fuselage(hull);
    windows(hull);
    wing(hull, -1); wing(hull, 1);
    tailplane(hull);
    fin(hull);
    nacelle(hull, 0); nacelle(hull, 1);
    parts.hull = upload(ctx, prog, hull);

    /* Moving parts, each in its own local frame so it can be hinged. */
    var flapB = new M.Builder();
    flapSurface(flapB);
    parts.flap = upload(ctx, prog, flapB);

    var slatB = new M.Builder();
    slatSurface(slatB);
    parts.slat = upload(ctx, prog, slatB);

    var gearB = [];
    for (var i = 0; i < 3; i++) {
      var gb = new M.Builder();
      gearLeg(gb, i);
      gearB.push(upload(ctx, prog, gb));
    }
    parts.gear = gearB;

    return parts;
  }

  function flapSurface(B) {
    var semi = C.span / 2;
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < 6; i++) {
        var e0 = 0.10 + i * 0.10, e1 = e0 + 0.095;
        var c0 = A.chordAt(e0) * 0.28, c1 = A.chordAt(e1) * 0.28;
        var y0 = side * e0 * semi, y1 = side * e1 * semi;
        var x0 = C.wingApex[0] - e0 * semi * Math.tan(C.sweepQC) - A.chordAt(e0) * 0.75;
        var x1 = C.wingApex[0] - e1 * semi * Math.tan(C.sweepQC) - A.chordAt(e1) * 0.75;
        var z0 = C.wingApex[2] - e0 * semi * Math.tan(C.dihedral);
        var z1 = C.wingApex[2] - e1 * semi * Math.tan(C.dihedral);
        M.quadFlat(B, [x0, y0, z0], [x1, y1, z1], [x1 - c1, y1, z1], [x0 - c0, y0, z0],
                   WHITE, 0.95);
      }
    }
  }

  function slatSurface(B) {
    var semi = C.span / 2;
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < 8; i++) {
        var e0 = 0.08 + i * 0.11, e1 = Math.min(0.97, e0 + 0.10);
        var y0 = side * e0 * semi, y1 = side * e1 * semi;
        var x0 = C.wingApex[0] - e0 * semi * Math.tan(C.sweepQC);
        var x1 = C.wingApex[0] - e1 * semi * Math.tan(C.sweepQC);
        var z0 = C.wingApex[2] - e0 * semi * Math.tan(C.dihedral);
        var z1 = C.wingApex[2] - e1 * semi * Math.tan(C.dihedral);
        var c0 = A.chordAt(e0) * 0.16, c1 = A.chordAt(e1) * 0.16;
        M.quadFlat(B, [x0 + c0, y0, z0], [x1 + c1, y1, z1], [x1, y1, z1], [x0, y0, z0],
                   GREY, 0.9);
      }
    }
  }

  function upload(ctx, prog, B) {
    if (B.isEmpty()) return null;
    var d = B.build();
    var gl = ctx.gl;
    return ctx.mesh(prog, [
      { name: "aPos", size: 3 }, { name: "aNormal", size: 3 },
      { name: "aColour", size: 3 }, { name: "aAO", size: 1 }
    ], d.vertices, d.indices);
  }

  return { build: build, upload: upload, colours: {
    white: WHITE, grey: GREY, dark: DARK, tail: TAIL, metal: METAL, rubber: RUBBER } };
})();
