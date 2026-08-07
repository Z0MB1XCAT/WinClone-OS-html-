/* gfx/meshgen.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util */

/* Procedural geometry.
 *
 * There is not one shipped mesh or texture in this simulator, and that is a
 * budget decision before it is an aesthetic one: the whole thing has to fit in a
 * JSON string sharing WinClone's storage with the operating system. An A320
 * exterior as a triangle soup would be a megabyte on its own. As parameters it
 * is about four hundred lines, and it has the useful side effect that changing
 * the wing sweep changes the model and the flight dynamics together, because
 * both read the same numbers out of a320_config.
 *
 * Everything builds into a Builder, which accumulates interleaved
 * position/normal/colour/AO vertices and hands back typed arrays.
 */

BFS.MeshGen = (function () {
  "use strict";

  var U = BFS.Util;

  function Builder() {
    this.v = [];      // flat: px,py,pz, nx,ny,nz, r,g,b, ao
    this.idx = [];
    this.base = 0;
  }
  Builder.STRIDE = 10;

  Builder.prototype.vertex = function (p, n, c, ao) {
    this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2],
                ao === undefined ? 1 : ao);
    return (this.v.length / Builder.STRIDE) - 1;
  };
  Builder.prototype.tri = function (a, b, c) { this.idx.push(a, b, c); };
  Builder.prototype.quad = function (a, b, c, d) {
    this.idx.push(a, b, c, a, c, d);
  };

  Builder.prototype.build = function () {
    return {
      vertices: new Float32Array(this.v),
      indices: this.v.length / Builder.STRIDE > 65535
        ? new Uint32Array(this.idx) : new Uint16Array(this.idx),
      count: this.idx.length
    };
  };
  Builder.prototype.isEmpty = function () { return this.idx.length === 0; };

  /* ------------------------------------------------------------- primitives */

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function normalize(a) {
    var l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  }
  function faceNormal(a, b, c) { return normalize(cross(sub(b, a), sub(c, a))); }

  /* A flat-shaded quad. Used everywhere; flat shading is deliberate on
     structure, where a crease should read as a crease. */
  function quadFlat(B, a, b, c, d, col, ao) {
    var n = faceNormal(a, b, c);
    var i0 = B.vertex(a, n, col, ao), i1 = B.vertex(b, n, col, ao),
        i2 = B.vertex(c, n, col, ao), i3 = B.vertex(d, n, col, ao);
    B.quad(i0, i1, i2, i3);
  }

  function triFlat(B, a, b, c, col, ao) {
    var n = faceNormal(a, b, c);
    B.tri(B.vertex(a, n, col, ao), B.vertex(b, n, col, ao), B.vertex(c, n, col, ao));
  }

  /* Loft a tube through a series of closed cross-sections. Each section is an
     array of 3-vectors with the same point count. Normals are averaged along the
     ring so the fuselage reads as smooth, and across sections so it does too. */
  function loft(B, sections, col, opts) {
    opts = opts || {};
    var rings = sections.length, per = sections[0].length;
    var start = B.v.length / Builder.STRIDE;
    var i, j;

    /* Accumulate smooth normals first. */
    var norms = [];
    for (i = 0; i < rings; i++) {
      norms.push([]);
      for (j = 0; j < per; j++) norms[i].push([0, 0, 0]);
    }
    /* Cross-sections are generated counter-clockwise in the y-z plane while the
       stations run from nose to tail, i.e. along -x. That combination winds each
       quad so its normal points INTO the body — verified by taking a
       mid-fuselage face on the right-hand side, where outward must be +y, and
       getting -y back. Inward normals invert the shading and, far worse, make
       the skin survive back-face culling: the camera sits inside the fuselage,
       so the entire outside world disappears behind the inside of the aeroplane.
       Reversing the two lookups below fixes both at once. */
    for (i = 0; i + 1 < rings; i++) {
      for (j = 0; j < per; j++) {
        var j2 = (j + 1) % per;
        var n = faceNormal(sections[i][j], sections[i + 1][j2], sections[i][j2]);
        var targets = [norms[i][j], norms[i][j2], norms[i + 1][j], norms[i + 1][j2]];
        for (var k = 0; k < targets.length; k++) {
          targets[k][0] += n[0]; targets[k][1] += n[1]; targets[k][2] += n[2];
        }
      }
    }
    for (i = 0; i < rings; i++) {
      for (j = 0; j < per; j++) {
        var nn = normalize(norms[i][j]);
        var ao = opts.ao ? opts.ao(sections[i][j], i, j) : 1;
        var c = opts.colour ? opts.colour(sections[i][j], i, j) : col;
        B.vertex(sections[i][j], nn, c, ao);
      }
    }
    for (i = 0; i + 1 < rings; i++) {
      for (j = 0; j < per; j++) {
        var jn = (j + 1) % per;
        var a = start + i * per + j, b = start + i * per + jn;
        var c2 = start + (i + 1) * per + jn, d = start + (i + 1) * per + j;
        B.quad(a, d, c2, b);
      }
    }
    return start;
  }

  /* A closed superelliptic cross-section: |y/a|^n + |z/b|^n = 1.
   *
   * An A320's fuselage is not a circle — it is close to two arcs with a slightly
   * flattened lower lobe. A superellipse with an exponent near 2.1 captures that
   * at zero cost, and the difference is visible from the flight deck, where the
   * side windows sit right on the shoulder of the curve. */
  function superellipse(x, a, b, n, segs, zOff) {
    var pts = [];
    for (var i = 0; i < segs; i++) {
      var th = (i / segs) * Math.PI * 2;
      var ct = Math.cos(th), st = Math.sin(th);
      var y = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n) * a;
      var z = Math.sign(st) * Math.pow(Math.abs(st), 2 / n) * b;
      pts.push([x, y, z + (zOff || 0)]);
    }
    return pts;
  }

  /* Surface of revolution about the x axis. Nacelles, wheels, oleo cylinders. */
  function revolve(B, profile, segs, col, opts) {
    var sections = [];
    for (var i = 0; i < profile.length; i++) {
      var x = profile[i][0], r = profile[i][1];
      var ring = [];
      for (var j = 0; j < segs; j++) {
        var th = (j / segs) * Math.PI * 2;
        ring.push([x, Math.cos(th) * r, Math.sin(th) * r]);
      }
      sections.push(ring);
    }
    return loft(B, sections, col, opts);
  }

  /* A NACA-style section, with an optional supercritical modifier that flattens
     the upper surface aft and adds aft camber — the shape that makes the A320's
     wing work at M0.78, and visibly different in the cross-section. */
  function airfoil(tc, camber, camberPos, supercritical, n) {
    n = n || 16;
    var upper = [], lower = [];
    for (var i = 0; i <= n; i++) {
      /* Cosine spacing: points cluster at the leading edge where curvature is. */
      var x = 0.5 * (1 - Math.cos(Math.PI * i / n));
      var yt = 5 * tc * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x * x +
                         0.2843 * x * x * x - 0.1015 * x * x * x * x);
      var yc = 0, dy = 0;
      if (camber > 0) {
        if (x < camberPos) {
          yc = camber / (camberPos * camberPos) * (2 * camberPos * x - x * x);
          dy = 2 * camber / (camberPos * camberPos) * (camberPos - x);
        } else {
          var q = 1 - camberPos;
          yc = camber / (q * q) * ((1 - 2 * camberPos) + 2 * camberPos * x - x * x);
          dy = 2 * camber / (q * q) * (camberPos - x);
        }
      }
      if (supercritical) {
        yc += 0.028 * Math.pow(x, 3.2);                  // aft camber
        yt *= 1 - 0.22 * U.smoothstep(0.35, 0.95, x);     // flattened upper aft
      }
      var th = Math.atan(dy);
      upper.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]);
      lower.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]);
    }
    lower.reverse();
    return upper.concat(lower.slice(1, -1));
  }

  /* A lofted lifting surface. `stations` gives, per spanwise position, the
     leading-edge point, chord, incidence and the section to use. */
  function wingPanel(B, stations, col, opts) {
    var sections = [];
    for (var i = 0; i < stations.length; i++) {
      var st = stations[i];
      var af = st.section;
      var ring = [];
      var ci = Math.cos(st.twist || 0), si = Math.sin(st.twist || 0);
      for (var j = 0; j < af.length; j++) {
        var cx = (af[j][0] - 0.25) * st.chord;
        var cz = af[j][1] * st.chord;
        /* Body axes: x forward, z down. The section's +x is aft, +y is up. */
        var px = st.le[0] - (cx * ci - cz * si) - 0.25 * st.chord * 0;
        var pz = st.le[2] - (cx * si + cz * ci);
        ring.push([px, st.le[1], pz]);
      }
      sections.push(ring);
    }
    return loft(B, sections, col, opts);
  }

  /* An extruded prism from a 2D polygon in the ground plane. Buildings. */
  function extrude(B, poly, z0, z1, col, ao) {
    var i, n = poly.length;
    for (i = 0; i < n; i++) {
      var a = poly[i], b = poly[(i + 1) % n];
      quadFlat(B, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1],
               col, ao);
    }
    /* Roof, as a fan. Convex footprints only, which every building here is. */
    for (i = 1; i + 1 < n; i++)
      triFlat(B, [poly[0][0], poly[0][1], z1], [poly[i][0], poly[i][1], z1],
                 [poly[i + 1][0], poly[i + 1][1], z1], col, ao);
  }

  /* A box, axis-aligned in its own frame. */
  function box(B, cx, cy, cz, sx, sy, sz, col, ao) {
    var x0 = cx - sx / 2, x1 = cx + sx / 2;
    var y0 = cy - sy / 2, y1 = cy + sy / 2;
    var z0 = cz - sz / 2, z1 = cz + sz / 2;
    var p = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],
             [x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
    quadFlat(B, p[0], p[3], p[2], p[1], col, ao);
    quadFlat(B, p[4], p[5], p[6], p[7], col, ao);
    quadFlat(B, p[0], p[1], p[5], p[4], col, ao);
    quadFlat(B, p[2], p[3], p[7], p[6], col, ao);
    quadFlat(B, p[1], p[2], p[6], p[5], col, ao);
    quadFlat(B, p[3], p[0], p[4], p[7], col, ao);
  }

  /* Bake a crude ambient-occlusion term into vertices already in the builder.
   *
   * Only used for the cockpit, and it earns its twenty lines there: a flight
   * deck is a small enclosed box, and with a single directional light and no
   * shadows it otherwise looks like flat cardboard. Approximating occlusion as
   * "how far is this vertex from the nearest window aperture" is wrong in every
   * detail and completely convincing in practice. */
  function bakeAO(B, apertures, strength) {
    var stride = Builder.STRIDE;
    var n = B.v.length / stride;
    for (var i = 0; i < n; i++) {
      var o = i * stride;
      var x = B.v[o], y = B.v[o + 1], z = B.v[o + 2];
      var best = 1e9;
      for (var a = 0; a < apertures.length; a++) {
        var ap = apertures[a];
        var d = Math.hypot(x - ap[0], y - ap[1], z - ap[2]);
        if (d < best) best = d;
      }
      var lit = U.clamp(1 - best / 2.6, 0, 1);
      B.v[o + 9] = U.lerp(1 - (strength || 0.6), 1, lit * lit);
    }
  }

  return {
    Builder: Builder,
    quadFlat: quadFlat, triFlat: triFlat, loft: loft, revolve: revolve,
    superellipse: superellipse, airfoil: airfoil, wingPanel: wingPanel,
    extrude: extrude, box: box, bakeAO: bakeAO,
    faceNormal: faceNormal, normalize: normalize
  };
})();
