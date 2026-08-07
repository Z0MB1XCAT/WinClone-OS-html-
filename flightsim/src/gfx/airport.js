/* gfx/airport.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util, core/geo, gfx/meshgen, data/egff, terrain/heightfield

   EGFF: pavement, markings, buildings and lighting, all generated from the
   coordinate table in data/egff.js. */

BFS.AirportView = (function () {
  "use strict";

  var U = BFS.Util, M = BFS.MeshGen, E = BFS.EGFF;

  var ASPHALT = [0.148, 0.152, 0.158];
  var TAXI = [0.132, 0.136, 0.142];
  var APRON = [0.185, 0.188, 0.192];
  var PAINT = [0.86, 0.87, 0.86];
  var YELLOW = [0.72, 0.62, 0.16];
  var GRASS_EDGE = [0.20, 0.26, 0.13];
  var BUILDING = [0.52, 0.53, 0.55];
  var GLASS = [0.16, 0.22, 0.28];

  /* Everything is built in the airport's own ENU frame — E.frame() — so the
     whole aerodrome is one static mesh that never needs rebuilding. Only its
     offset from the camera changes, and that is a uniform. */
  var _g = new Float64Array(2);
  var _e = new Float64Array(3);

  function pt(u, v, dz) {
    E.toGeo(_g, u, v);
    E.frame().geodeticToEnu(_e, _g[0], _g[1], E.pavementElev(u, v) + (dz || 0));
    return [_e[0], _e[1], _e[2]];
  }

  /* A quad in runway-local coordinates, lifted slightly to sit on the pavement
     without z-fighting it. Logarithmic depth makes the margin small. */
  function slab(B, u0, v0, u1, v1, col, dz) {
    M.quadFlat(B, pt(u0, v0, dz), pt(u1, v0, dz), pt(u1, v1, dz), pt(u0, v1, dz), col, 1);
  }

  function stripe(B, u0, u1, v, width, col, dz) {
    slab(B, u0, v - width / 2, u1, v + width / 2, col, dz);
  }

  /* -------------------------------------------------------------- pavement */

  function pavement(B) {
    var L = E.length(), hw = E.RWY.width / 2;

    /* Runway, with shoulders. */
    slab(B, -8, -hw - 7.5, L + 8, hw + 7.5, [0.115, 0.125, 0.10], 0.01);
    slab(B, 0, -hw, L, hw, ASPHALT, 0.02);

    /* Taxiways. */
    for (var i = 0; i < E.TAXIWAYS.length; i++) {
      var tw = E.TAXIWAYS[i], p = tw.pts, w = tw.width / 2;
      for (var j = 0; j + 1 < p.length; j++) {
        var a = p[j], b = p[j + 1];
        var du = b[0] - a[0], dv = b[1] - a[1];
        var len = Math.hypot(du, dv) || 1;
        var nx = -dv / len * w, ny = du / len * w;
        M.quadFlat(B, pt(a[0] + nx, a[1] + ny, 0.02), pt(b[0] + nx, b[1] + ny, 0.02),
                      pt(b[0] - nx, b[1] - ny, 0.02), pt(a[0] - nx, a[1] - ny, 0.02),
                   TAXI, 1);
      }
    }

    /* Apron. */
    var A = E.APRON;
    slab(B, A.u0, A.v0, A.u1, A.v1, APRON, 0.02);
  }

  /* -------------------------------------------------------------- markings */

  function markings(B) {
    var L = E.length(), hw = E.RWY.width / 2;
    var d12 = E.RWY.displaced[0], d30 = E.RWY.displaced[1];
    var dz = 0.05;

    /* Centreline: 30 m dashes, 20 m gaps, stopping at each displaced threshold. */
    for (var u = d12; u < L - d30; u += 50) {
      stripe(B, u, Math.min(u + 30, L - d30), 0, 0.9, PAINT, dz);
    }

    /* Threshold bars — the piano keys. Eight stripes each side of the
       centreline for a 45 m runway. */
    function threshold(uStart, dir) {
      for (var k = 0; k < 8; k++) {
        var off = (k < 4 ? -1 : 1) * (2.4 + (k % 4) * 3.6);
        stripe(B, uStart, uStart + dir * 30, off, 1.8, PAINT, dz);
      }
    }
    threshold(d12 + 6, 1);
    threshold(L - d30 - 6, -1);

    /* Displaced-threshold arrows: chevrons pointing at the usable surface. */
    for (var a = 0; a < 4; a++) {
      stripe(B, 12 + a * 55, 12 + a * 55 + 30, 0, 1.2, PAINT, dz);
    }

    /* Aiming point: two broad blocks 300 m in from each threshold. */
    function aiming(u0, dir) {
      for (var s = -1; s <= 1; s += 2) {
        slab(B, u0, s * 10.5 - 3, u0 + dir * 45, s * 10.5 + 3, PAINT, dz);
      }
    }
    aiming(d12 + 300, 1);
    aiming(L - d30 - 300, -1);

    /* Touchdown zone bars, at 150 m intervals either side of the aiming point. */
    function tdz(base, dir) {
      for (var n = 1; n <= 3; n++) {
        var uu = base + dir * (150 * n + 300);
        if (uu < 40 || uu > L - 40) continue;
        for (var s2 = -1; s2 <= 1; s2 += 2) {
          slab(B, uu, s2 * 15 - 1.4, uu + dir * 22, s2 * 15 + 1.4, PAINT, dz);
          slab(B, uu, s2 * 19 - 1.4, uu + dir * 22, s2 * 19 + 1.4, PAINT, dz);
        }
      }
    }
    tdz(d12, 1);
    tdz(L - d30, -1);

    /* Runway edge lines. */
    stripe(B, 0, L, -hw + 1.2, 0.9, PAINT, dz);
    stripe(B, 0, L, hw - 1.2, 0.9, PAINT, dz);

    /* Taxiway centrelines, in yellow. */
    for (var i = 0; i < E.TAXIWAYS.length; i++) {
      var tw = E.TAXIWAYS[i], p = tw.pts;
      for (var j = 0; j + 1 < p.length; j++) {
        var pa = p[j], pb = p[j + 1];
        var du = pb[0] - pa[0], dv = pb[1] - pa[1];
        var len = Math.hypot(du, dv) || 1;
        var nx = -dv / len * 0.075, ny = du / len * 0.075;
        M.quadFlat(B, pt(pa[0] + nx, pa[1] + ny, 0.05), pt(pb[0] + nx, pb[1] + ny, 0.05),
                      pt(pb[0] - nx, pb[1] - ny, 0.05), pt(pa[0] - nx, pa[1] - ny, 0.05),
                   YELLOW, 1);
      }
    }

    /* Stand lead-in lines and stop bars. */
    for (var s3 = 0; s3 < E.STANDS.length; s3++) {
      var st = E.STANDS[s3];
      stripe(B, st.u - 0.35, st.u + 0.35, 0, 0, YELLOW, dz);
      M.quadFlat(B, pt(st.u - 0.4, E.APRON.v0, 0.05), pt(st.u + 0.4, E.APRON.v0, 0.05),
                    pt(st.u + 0.4, st.v, 0.05), pt(st.u - 0.4, st.v, 0.05), YELLOW, 1);
      slab(B, st.u - 3.5, st.v + 0.2, st.u + 3.5, st.v + 0.9, YELLOW, 0.05);
    }
  }

  /* ------------------------------------------------------------- buildings */

  function buildings(B) {
    var T = E.TERMINAL;
    var poly = [
      [T.u0, T.v0], [T.u1, T.v0], [T.u1, T.v1], [T.u0, T.v1]
    ].map(function (p) { return pt(p[0], p[1], 0); });

    /* Extrude in the airport frame: the polygon is already in ENU, so the walls
       go straight up. */
    var z0 = poly[0][2], z1 = z0 + T.h;
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      M.quadFlat(B, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1],
                 BUILDING, 0.9);
    }
    M.quadFlat(B, [poly[0][0], poly[0][1], z1], [poly[1][0], poly[1][1], z1],
                  [poly[2][0], poly[2][1], z1], [poly[3][0], poly[3][1], z1],
               [0.40, 0.41, 0.43], 1);

    /* A glazed band along the apron face — the bit you actually look at from a
       stand. */
    var g0 = pt(T.u0 + 4, T.v0 - 0.4, 4.5), g1 = pt(T.u1 - 4, T.v0 - 0.4, 4.5);
    M.quadFlat(B, [g0[0], g0[1], g0[2]], [g1[0], g1[1], g1[2]],
                  [g1[0], g1[1], g1[2] + 5], [g0[0], g0[1], g0[2] + 5], GLASS, 1);

    /* Control tower. */
    var tw = E.TOWER;
    var c = pt(tw.u, tw.v, 0);
    for (var k = 0; k < 8; k++) {
      var a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2;
      var p0 = [c[0] + Math.cos(a0) * tw.r * 0.5, c[1] + Math.sin(a0) * tw.r * 0.5];
      var p1 = [c[0] + Math.cos(a1) * tw.r * 0.5, c[1] + Math.sin(a1) * tw.r * 0.5];
      M.quadFlat(B, [p0[0], p0[1], c[2]], [p1[0], p1[1], c[2]],
                    [p1[0], p1[1], c[2] + tw.h], [p0[0], p0[1], c[2] + tw.h], BUILDING, 0.9);
      var q0 = [c[0] + Math.cos(a0) * tw.r, c[1] + Math.sin(a0) * tw.r];
      var q1 = [c[0] + Math.cos(a1) * tw.r, c[1] + Math.sin(a1) * tw.r];
      M.quadFlat(B, [q0[0], q0[1], c[2] + tw.h], [q1[0], q1[1], c[2] + tw.h],
                    [q1[0], q1[1], c[2] + tw.h + 4], [q0[0], q0[1], c[2] + tw.h + 4],
                 GLASS, 1);
    }

    /* Airbridges on the two stands that have them. Stand 7 is where the
       aeroplane starts, so its bridge is the first thing the pilot sees. */
    for (var s = 0; s < E.STANDS.length; s++) {
      var st = E.STANDS[s];
      if (!st.airbridge) continue;
      var b0 = pt(st.u, T.v0, 4.2), b1 = pt(st.u, st.v + 3, 3.4);
      var w = 1.6;
      M.quadFlat(B, [b0[0] - w, b0[1], b0[2]], [b0[0] + w, b0[1], b0[2]],
                    [b1[0] + w, b1[1], b1[2]], [b1[0] - w, b1[1], b1[2]],
                 [0.60, 0.61, 0.63], 0.95);
      M.quadFlat(B, [b0[0] - w, b0[1], b0[2] + 2.6], [b1[0] - w, b1[1], b1[2] + 2.6],
                    [b1[0] + w, b1[1], b1[2] + 2.6], [b0[0] + w, b0[1], b0[2] + 2.6],
                 [0.55, 0.56, 0.58], 1);
    }
  }

  /* --------------------------------------------------------------- lights
     Generated from the geometry rather than listed. A few hundred bytes of
     runway description produces a few thousand instanced sprites. */

  function lights() {
    var out = [];
    var L = E.length(), hw = E.RWY.width / 2;
    var d12 = E.RWY.displaced[0], d30 = E.RWY.displaced[1];

    function add(u, v, dz, r, g, b, size) {
      E.toGeo(_g, u, v);
      E.frame().geodeticToEnu(_e, _g[0], _g[1], E.pavementElev(u, v) + dz);
      out.push(_e[0], _e[1], _e[2], r, g, b, size);
    }

    /* Runway edge: white, amber in the last 600 m. */
    for (var u = 0; u <= L; u += 60) {
      var amber = (u > L - 600) ? 1 : 0;
      for (var s = -1; s <= 1; s += 2) {
        add(u, s * hw, 0.35, 1, amber ? 0.68 : 1, amber ? 0.25 : 0.94, 1.5);
      }
    }
    /* Threshold green and end red. */
    for (var i = -hw; i <= hw; i += 6) {
      add(d12, i, 0.3, 0.1, 1, 0.35, 1.4);
      add(L - d30, i, 0.3, 0.1, 1, 0.35, 1.4);
      add(0, i, 0.3, 1, 0.12, 0.12, 1.3);
      add(L, i, 0.3, 1, 0.12, 0.12, 1.3);
    }
    /* Centreline: white, then alternating red from 900 m to go, red at 300. */
    for (var c = d12; c < L - d30; c += 30) {
      var toGo = (L - d30) - c;
      var col = toGo < 300 ? [1, 0.15, 0.15] : (toGo < 900 ? [1, 0.55, 0.55] : [1, 1, 0.96]);
      add(c, 0, 0.25, col[0], col[1], col[2], 1.1);
    }
    /* Approach lighting for both ends: a 600 m centreline of bars with a
       crossbar at 300 m. */
    function approach(uThr, dir) {
      for (var k = 1; k <= 20; k++) {
        var uu = uThr - dir * k * 30;
        add(uu, 0, 0.5, 1, 1, 0.92, 1.8);
        if (k === 10) for (var x = -12; x <= 12; x += 4) add(uu, x, 0.5, 1, 1, 0.92, 1.5);
      }
    }
    approach(d12, 1);
    approach(L - d30, -1);

    /* PAPI: four units on the left of each threshold, 300 m in. Colour is set
       per unit at runtime from the aircraft's position on the glidepath, so for
       now they are placed and left white. */
    for (var pk = 0; pk < 4; pk++) {
      add(d12 + 300, -hw - 15 - pk * 9, 0.5, 1, 1, 1, 2.0);
      add(L - d30 - 300, -hw - 15 - pk * 9, 0.5, 1, 1, 1, 2.0);
    }

    /* Taxiway edge, blue. */
    for (var t = 0; t < E.TAXIWAYS.length; t++) {
      var tw = E.TAXIWAYS[t], p = tw.pts;
      for (var j = 0; j + 1 < p.length; j++) {
        var a = p[j], b = p[j + 1];
        var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        var steps = Math.max(1, Math.floor(len / 40));
        for (var n = 0; n <= steps; n++) {
          var tt = n / steps;
          var uu2 = U.lerp(a[0], b[0], tt), vv = U.lerp(a[1], b[1], tt);
          var du = (b[0] - a[0]) / len, dv = (b[1] - a[1]) / len;
          add(uu2 - dv * tw.width / 2, vv + du * tw.width / 2, 0.25, 0.15, 0.35, 1, 1.0);
          add(uu2 + dv * tw.width / 2, vv - du * tw.width / 2, 0.25, 0.15, 0.35, 1, 1.0);
        }
      }
    }

    return new Float32Array(out);
  }

  /* ------------------------------------------------------------------ build */

  function build(ctx, meshProg, spriteProg) {
    var B = new M.Builder();
    pavement(B);
    markings(B);
    buildings(B);
    var d = B.build();

    var mesh = ctx.mesh(meshProg, [
      { name: "aPos", size: 3 }, { name: "aNormal", size: 3 },
      { name: "aColour", size: 3 }, { name: "aAO", size: 1 }
    ], d.vertices, d.indices);

    /* One instanced quad for every light on the aerodrome. */
    var data = lights();
    var gl = ctx.gl;
    var quad = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    var qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(spriteProg.a.aCorner);
    gl.vertexAttribPointer(spriteProg.a.aCorner, 2, gl.FLOAT, false, 0, 0);

    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(spriteProg.a.aOffset);
    gl.vertexAttribPointer(spriteProg.a.aOffset, 3, gl.FLOAT, false, 28, 0);
    gl.vertexAttribDivisor(spriteProg.a.aOffset, 1);
    gl.enableVertexAttribArray(spriteProg.a.aColourSize);
    gl.vertexAttribPointer(spriteProg.a.aColourSize, 4, gl.FLOAT, false, 28, 12);
    gl.vertexAttribDivisor(spriteProg.a.aColourSize, 1);

    gl.bindVertexArray(null);

    return {
      mesh: mesh,
      lights: { vao: vao, count: 4, n: data.length / 7, indexed: false },
      frame: E.frame()
    };
  }

  return { build: build };
})();
