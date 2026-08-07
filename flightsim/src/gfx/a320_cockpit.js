/* gfx/a320_cockpit.js
   READS:  -
   WRITES: -
   TICK:   render
   DEPS:   core/util, gfx/meshgen, sim/a320_config

   The flight deck: structure, panels, and the display screens as textured
   quads. */

/* Two decisions shape this file.
 *
 * The window apertures are hand-authored polygons rather than generated. The
 * A320's windscreen outline — the shallow vee of the two forward panes, the
 * sharply raked side windows — is the single most recognisable thing about the
 * view from the seat, and it is about forty numbers. Everything else in the
 * cockpit is parametric; this is worth spelling out.
 *
 * The screens are quads carrying canvas textures, and the panels that are not
 * screens are *also* quads carrying canvas textures. Drawing two hundred
 * switches as geometry would cost more than the rest of the aeroplane put
 * together; drawing them into a canvas costs one texture, makes hit-testing a
 * rectangle lookup, and means the same code can render the panel full-screen in
 * two dimensions when the window is too small to read it in three.
 */

BFS.Cockpit = (function () {
  "use strict";

  var U = BFS.Util, M = BFS.MeshGen, C = BFS.A320.C;

  /* The design eye position, in body axes. Everything in the flight deck is
     placed relative to this so the view out of the windows is right. */
  var EYE = [C.noseToDatum - 2.55, -0.52, -0.62];

  var SHELL = [0.235, 0.245, 0.255];
  var PANEL = [0.135, 0.142, 0.150];
  var TRIM = [0.32, 0.33, 0.34];
  var SEAT = [0.20, 0.17, 0.15];
  var GLARE = [0.105, 0.110, 0.118];

  /* Window apertures, in the cockpit-local frame: x aft-positive from the eye,
     y right, z down. Each is a closed polygon on a plane. */
  var WINDOWS = {
    /* Forward left and right panes, meeting at the centre post. */
    fwdL: [[-1.30, -0.10, -0.62], [-1.34, -0.62, -0.60], [-1.28, -0.74, -0.10],
           [-1.24, -0.66, 0.30], [-1.22, -0.08, 0.32]],
    fwdR: [[-1.30, 0.10, -0.62], [-1.34, 0.62, -0.60], [-1.28, 0.74, -0.10],
           [-1.24, 0.66, 0.30], [-1.22, 0.08, 0.32]],
    /* Sliding side windows, raked hard aft. */
    sideL: [[-1.10, -0.82, -0.50], [-0.42, -0.90, -0.46], [-0.30, -0.90, 0.18],
            [-1.02, -0.84, 0.26]],
    sideR: [[-1.10, 0.82, -0.50], [-0.42, 0.90, -0.46], [-0.30, 0.90, 0.18],
            [-1.02, 0.84, 0.26]],
    /* Rear quarter windows. */
    aftL: [[-0.34, -0.88, -0.44], [0.16, -0.80, -0.38], [0.22, -0.78, 0.12],
           [-0.26, -0.88, 0.18]],
    aftR: [[-0.34, 0.88, -0.44], [0.16, 0.80, -0.38], [0.22, 0.78, 0.12],
           [-0.26, 0.88, 0.18]]
  };

  /* Where the display units sit. Each is a rectangle in the cockpit frame given
     by its centre, its half-extents, and a tilt about the y axis. */
  /* An A320 display unit has about a 158 mm square viewing area, so the half
     extent is a shade under 0.08 m — not the 0.20 they were first built at,
     which put a PFD the size of a dinner tray thirty degrees across the view.
     The local frame's origin is the captain's eye, so y = 0 is the left seat's
     centreline and the six units run rightwards from there: captain's PFD and
     ND, the two ECAM screens on the centreline, then the first officer's ND and
     PFD. */
  var DU = 0.079;
  var SCREENS = {
    pfd1:  { c: [-0.74, -0.02, 0.30], w: DU, h: DU, tilt: -0.22 },
    nd1:   { c: [-0.74, 0.20, 0.30], w: DU, h: DU, tilt: -0.22 },
    ewd:   { c: [-0.74, 0.44, 0.28], w: DU * 0.92, h: DU * 0.80, tilt: -0.22 },
    sd:    { c: [-0.74, 0.44, 0.47], w: DU * 0.92, h: DU * 0.80, tilt: -0.14 },
    nd2:   { c: [-0.74, 0.68, 0.30], w: DU, h: DU, tilt: -0.22 },
    pfd2:  { c: [-0.74, 0.90, 0.30], w: DU, h: DU, tilt: -0.22 },
    fcu:   { c: [-0.98, 0.44, -0.05], w: 0.40, h: 0.055, tilt: -1.05 },
    mcdu1: { c: [-0.34, 0.10, 0.82], w: 0.070, h: 0.105, tilt: -1.32 },
    ovhd:  { c: [-0.50, 0.44, -0.80], w: 0.40, h: 0.26, tilt: 1.45 }
  };

  /* ------------------------------------------------------------- structure */

  function shell(B) {
    /* The flight deck as a box with a raked front, minus the window apertures.
       Rather than doing real boolean subtraction — which would want a polygon
       clipper this simulator has no other use for — the surrounds are built as
       frames of quads around each aperture. Fewer lines, and it produces the
       chunky window posts an A320 actually has. */
    var x0 = -1.42, x1 = 0.75;     // forward, aft
    var y = 0.95, z0 = -0.95, z1 = 1.10;

    /* Roof, floor, aft bulkhead. */
    M.quadFlat(B, [x0, -y, z0], [x0, y, z0], [x1, y, z0], [x1, -y, z0], SHELL, 0.55);
    M.quadFlat(B, [x0, -y, z1], [x1, -y, z1], [x1, y, z1], [x0, y, z1], [0.16,0.16,0.17], 0.7);
    M.quadFlat(B, [x1, -y, z0], [x1, y, z0], [x1, y, z1], [x1, -y, z1], SHELL, 0.5);

    /* Side walls, above and below the window band. */
    for (var s = -1; s <= 1; s += 2) {
      M.quadFlat(B, [x0, y * s, z0], [x1, y * s, z0], [x1, y * s, -0.52], [x0, y * s, -0.52],
                 SHELL, 0.6);
      M.quadFlat(B, [x0, y * s, 0.30], [x1, y * s, 0.30], [x1, y * s, z1], [x0, y * s, z1],
                 SHELL, 0.6);
      /* Post between the side and aft quarter windows. */
      M.box(B, -0.36, y * s * 0.98, -0.15, 0.09, 0.06, 0.75, TRIM, 0.7);
    }

    /* Forward structure: the coaming above the windscreen and the centre post. */
    M.quadFlat(B, [x0, -y, z0], [x0, y, z0], [x0 + 0.06, y, -0.64], [x0 + 0.06, -y, -0.64],
               SHELL, 0.55);
    M.box(B, -1.30, 0, -0.16, 0.10, 0.075, 1.0, TRIM, 0.8);

    /* Window frames. */
    for (var k in WINDOWS) {
      if (!WINDOWS.hasOwnProperty(k)) continue;
      frameAround(B, WINDOWS[k], 0.055);
    }
  }

  /* Build a frame of quads just outside a polygon, giving it a raised surround. */
  function frameAround(B, poly, t) {
    var n = poly.length, cx = 0, cy = 0, cz = 0, i;
    for (i = 0; i < n; i++) { cx += poly[i][0]; cy += poly[i][1]; cz += poly[i][2]; }
    cx /= n; cy /= n; cz /= n;
    for (i = 0; i < n; i++) {
      var a = poly[i], b = poly[(i + 1) % n];
      /* Push each edge outward from the centroid to make the frame's outer rim. */
      var ao = push(a, cx, cy, cz, t), bo = push(b, cx, cy, cz, t);
      M.quadFlat(B, a, b, bo, ao, TRIM, 0.85);
      /* And a lip standing proud into the cockpit. */
      var ai = [ao[0] + 0.05, ao[1], ao[2]], bi = [bo[0] + 0.05, bo[1], bo[2]];
      M.quadFlat(B, ao, bo, bi, ai, [0.20, 0.21, 0.22], 0.75);
    }
  }
  function push(p, cx, cy, cz, t) {
    var dx = p[0] - cx, dy = p[1] - cy, dz = p[2] - cz;
    var l = Math.hypot(dx, dy, dz) || 1;
    return [p[0] + dx / l * t, p[1] + dy / l * t, p[2] + dz / l * t];
  }

  function glareshield(B) {
    /* The shelf the FCU sits in, and the hood over the main instrument panel. */
    M.box(B, -0.95, 0, 0.02, 0.34, 1.55, 0.10, GLARE, 0.7);
    M.quadFlat(B, [-1.12, -0.80, 0.08], [-1.12, 0.80, 0.08],
                  [-0.80, 0.80, 0.16], [-0.80, -0.80, 0.16], GLARE, 0.6);
    /* Main instrument panel face, behind and below the screens. */
    M.quadFlat(B, [-0.80, -0.85, 0.14], [-0.80, 0.85, 0.14],
                  [-0.62, 0.85, 0.72], [-0.62, -0.85, 0.72], PANEL, 0.55);
    /* Panel below the MIP, down to the floor. */
    M.quadFlat(B, [-0.62, -0.85, 0.72], [-0.62, 0.85, 0.72],
                  [-0.52, 0.85, 1.10], [-0.52, -0.85, 1.10], [0.10,0.105,0.112], 0.45);
  }

  function pedestal(B) {
    /* The centre pedestal, raked back between the seats. */
    M.quadFlat(B, [-0.42, -0.21, 0.72], [-0.42, 0.21, 0.72],
                  [0.28, 0.21, 0.96], [0.28, -0.21, 0.96], PANEL, 0.5);
    M.box(B, -0.07, 0, 1.06, 0.72, 0.44, 0.22, [0.12,0.125,0.13], 0.4);

    /* Thrust levers. Two knobs on a quadrant — animated at draw time, because
       the detents are the core of how an A320 is flown and a static lever would
       be a strange thing to leave out. */
    for (var i = 0; i < 2; i++) {
      var y = i ? 0.075 : -0.075;
      M.box(B, -0.30, y, 0.80, 0.05, 0.05, 0.16, [0.05,0.05,0.06], 0.7);
    }
    /* Speedbrake and flap levers, outboard on the pedestal. */
    M.box(B, -0.18, -0.16, 0.83, 0.035, 0.035, 0.13, [0.18,0.18,0.19], 0.7);
    M.box(B, -0.18, 0.16, 0.83, 0.035, 0.035, 0.13, [0.10,0.10,0.11], 0.7);
  }

  function seatsAndSticks(B) {
    for (var s = -1; s <= 1; s += 2) {
      var y = s * 0.50;
      /* Seat pan and back, low-poly and dark; they are behind the eye and only
         seen peripherally. */
      M.box(B, 0.18, y, 0.92, 0.52, 0.50, 0.10, SEAT, 0.45);
      M.box(B, 0.44, y, 0.55, 0.10, 0.50, 0.70, SEAT, 0.4);
      /* Side console and the sidestick on it. */
      M.box(B, 0.05, s * 0.80, 0.80, 0.70, 0.22, 0.14, PANEL, 0.5);
      M.box(B, -0.08, s * 0.80, 0.66, 0.05, 0.05, 0.22, [0.06,0.06,0.07], 0.7);
    }
    /* Rudder pedals. */
    for (var t = -1; t <= 1; t += 2) {
      for (var u = -1; u <= 1; u += 2) {
        M.box(B, -0.62, t * 0.50 + u * 0.11, 1.02, 0.14, 0.08, 0.16, [0.14,0.14,0.15], 0.4);
      }
    }
  }

  /* ---------------------------------------------------------------- screens */

  /* A screen quad in the cockpit frame. The tilt rotates it about y so the
     panels face the eye rather than lying flat. */
  function screenQuad(def) {
    var c = def.c, w = def.w, h = def.h, t = def.tilt || 0;
    var ct = Math.cos(t), st = Math.sin(t);
    function pt(dy, dz) {
      /* Local (dy right, dz down) rotated about y, then offset. */
      return [c[0] + (-dz) * st, c[1] + dy, c[2] + dz * ct];
    }
    return [pt(-w, -h), pt(w, -h), pt(w, h), pt(-w, h)];
  }

  function buildScreens(ctx, prog) {
    var out = {};
    for (var k in SCREENS) {
      if (!SCREENS.hasOwnProperty(k)) continue;
      var q = screenQuad(SCREENS[k]);
      var v = new Float32Array([
        q[0][0], q[0][1], q[0][2], 0, 0,
        q[1][0], q[1][1], q[1][2], 1, 0,
        q[2][0], q[2][1], q[2][2], 1, 1,
        q[3][0], q[3][1], q[3][2], 0, 1
      ]);
      out[k] = ctx.mesh(prog, [{ name: "aPos", size: 3 }, { name: "aUV", size: 2 }],
                        v, new Uint16Array([0, 1, 2, 0, 2, 3]));
    }
    return out;
  }

  /* ------------------------------------------------------------------ build */

  function build(ctx, meshProg, screenProg) {
    var B = new M.Builder();
    shell(B);
    glareshield(B);
    pedestal(B);
    seatsAndSticks(B);

    /* Bake occlusion against the window apertures. This is the one graphics
       indulgence in the whole simulator, and it is the difference between a
       flight deck that reads as an enclosed space and one that looks like a flat
       grey shape with instruments painted on it. */
    var apertures = [];
    for (var k in WINDOWS) {
      if (!WINDOWS.hasOwnProperty(k)) continue;
      var poly = WINDOWS[k];
      for (var i = 0; i < poly.length; i++) apertures.push(poly[i]);
    }
    M.bakeAO(B, apertures, 0.72);

    var d = B.build();
    return {
      structure: ctx.mesh(meshProg, [
        { name: "aPos", size: 3 }, { name: "aNormal", size: 3 },
        { name: "aColour", size: 3 }, { name: "aAO", size: 1 }
      ], d.vertices, d.indices),
      screens: buildScreens(ctx, screenProg),
      eye: EYE,
      screenDefs: SCREENS,
      windows: WINDOWS
    };
  }

  return { build: build, EYE: EYE, SCREENS: SCREENS, WINDOWS: WINDOWS };
})();
