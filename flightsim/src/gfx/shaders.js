/* gfx/shaders.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   - */

/* GLSL for the whole simulator. Five programs; there is no sixth because
 * graphics are explicitly not the priority here.
 *
 * Two ideas do most of the visual work:
 *
 *   Logarithmic depth in the world pass. The view runs from three metres to two
 *   hundred kilometres, which a conventional depth buffer cannot resolve — the
 *   runway markings z-fight with the runway. Writing log2(w) into gl_FragDepth
 *   spreads precision by distance instead of by 1/z, and the cockpit gets its
 *   own second pass at close range so it never competes with terrain at all.
 *
 *   Fog sampled from the sky function. Distant terrain fades into exactly the
 *   colour the sky is in that direction, so the horizon dissolves rather than
 *   ending in a hard line. On procedurally coloured terrain this carries most of
 *   the credibility, and it costs one shared function.
 */

BFS.Shaders = (function () {
  "use strict";

  /* Shared: analytic sky, used both to draw the sky and to fog everything
     against it. */
  var SKY_FN = [
    "vec3 skyColour(vec3 dir, vec3 sun, vec3 zen, vec3 hor, vec3 gnd){",
    "  float t = dir.z;",
    "  vec3 c;",
    "  if (t > 0.0) c = mix(hor, zen, pow(clamp(t,0.0,1.0), 0.62));",
    "  else c = mix(hor, gnd, pow(clamp(-t,0.0,1.0), 0.42));",
    /* Forward scattering: brighter near the sun, which is what makes flying
       into the sun look different from flying away from it. */
    "  float mu = max(dot(normalize(dir), sun), 0.0);",
    "  c += vec3(0.42,0.34,0.22) * pow(mu, 7.0) * 0.9;",
    "  c += vec3(0.16,0.17,0.19) * pow(mu, 2.0) * 0.30;",
    "  return c;",
    "}"
  ].join("\n");

  var LOGDEPTH_VS = [
    "  vLogZ = 1.0 + gl_Position.w;",
    "  gl_Position.z = (log2(max(1e-6, vLogZ)) * uFcoef - 1.0) * gl_Position.w;"
  ].join("\n");

  var LOGDEPTH_FS = "  gl_FragDepth = log2(vLogZ) * uFcoefHalf;";

  var HEAD = "#version 300 es\n";
  var PREC = "precision highp float;\nprecision highp int;\n";

  /* ------------------------------------------------------------------- sky */

  /* The view ray is built from the camera's own basis rather than by inverting
     the view-projection matrix and unprojecting the near and far planes. The
     unprojection is the textbook approach and it is a trap here: with a near
     plane at three metres and a far plane at two hundred kilometres, the far
     point's w is tiny, and dividing by it in float32 loses the direction
     entirely. Three uniforms and a multiply-add are exact at any range. */
  var sky = {
    vs: HEAD + [
      "in vec2 aPos;",
      "uniform vec3 uCamFwd, uCamRight, uCamUp;",
      "uniform vec2 uTanFov;",          // (tan(fov/2)*aspect, tan(fov/2))
      "out vec3 vDir;",
      "void main(){",
      "  vDir = uCamFwd + uCamRight * (aPos.x * uTanFov.x)",
      "                 + uCamUp    * (aPos.y * uTanFov.y);",
      "  gl_Position = vec4(aPos, 1.0, 1.0);",
      "}"
    ].join("\n"),
    fs: HEAD + PREC + [
      "in vec3 vDir;",
      "uniform vec3 uSun, uZenith, uHorizon, uGround;",
      "out vec4 fc;",
      SKY_FN,
      "void main(){",
      "  vec3 d = normalize(vDir);",
      "  vec3 c = skyColour(d, uSun, uZenith, uHorizon, uGround);",
      /* The sun itself: a disc with a soft edge, plus glow. */
      "  float mu = dot(d, uSun);",
      "  c += vec3(1.6,1.45,1.15) * smoothstep(0.99965, 0.99990, mu);",
      "  fc = vec4(c, 1.0);",
      "}"
    ].join("\n")
  };

  /* --------------------------------------------------------------- terrain */

  var terrain = {
    vs: HEAD + [
      "in vec3 aPos;",       // tile-local metres
      "in vec3 aNormal;",
      "in float aCover;",    // 0 land .. 1 water, plus urban flag above 1
      "uniform mat4 uViewProj;",
      "uniform vec3 uOffset;",   // tile origin relative to the camera
      "uniform float uFcoef;",
      "out vec3 vN; out float vCover; out float vH; out vec3 vRel; out float vLogZ;",
      "void main(){",
      "  vec3 p = aPos + uOffset;",
      "  vRel = p;",
      "  vN = aNormal;",
      "  vCover = aCover;",
      "  vH = aPos.z;",
      "  gl_Position = uViewProj * vec4(p, 1.0);",
      LOGDEPTH_VS,
      "}"
    ].join("\n"),
    fs: HEAD + PREC + [
      "in vec3 vN; in float vCover; in float vH; in vec3 vRel; in float vLogZ;",
      "uniform vec3 uSun, uZenith, uHorizon, uGround;",
      "uniform float uFogDensity, uFcoefHalf, uTime;",
      "out vec4 fc;",
      SKY_FN,
      /* Cheap value noise. Two octaves is enough for what it is used for. */
      "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.545); }",
      "float vnoise(vec2 p){",
      "  vec2 i = floor(p), f = fract(p);",
      "  f = f*f*(3.0-2.0*f);",
      "  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),",
      "             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);",
      "}",
      "void main(){",
      "  vec3 n = normalize(vN);",
      "  float slope = 1.0 - clamp(n.z, 0.0, 1.0);",
      "  bool water = vCover > 0.5 && vCover < 1.5;",
      "  bool urban = vCover >= 1.5;",
      "",
      "  vec3 albedo;",
      "  if (water) {",
      "    albedo = vec3(0.045, 0.085, 0.115);",
      "  } else {",
      /* Field patchwork. The mid-frequency term is what makes lowland Britain
         read correctly from a few thousand feet — irregular parcels of slightly
         different green, which is most of what you actually see. */
      "    float parcel = vnoise(vRel.xy * 0.0043);",
      "    float region = vnoise(vRel.xy * 0.00028);",
      "    vec3 pasture = vec3(0.255, 0.315, 0.150);",
      "    vec3 crop    = vec3(0.360, 0.360, 0.185);",
      "    vec3 wood    = vec3(0.130, 0.205, 0.110);",
      "    albedo = mix(pasture, crop, parcel);",
      "    albedo = mix(albedo, wood, smoothstep(0.62, 0.86, region));",
      "    albedo = mix(albedo, vec3(0.36,0.34,0.30), smoothstep(0.30, 0.62, slope));",
      "    albedo = mix(albedo, vec3(0.42,0.41,0.39), smoothstep(0.58, 0.82, slope));",
      /* A beach where low ground meets the shoreline. */
      "    albedo = mix(vec3(0.52,0.49,0.42), albedo, smoothstep(0.4, 5.0, vH));",
      /* Desaturate and cool with height. */
      "    float alt = clamp(vH/900.0, 0.0, 1.0);",
      "    albedo = mix(albedo, vec3(0.42,0.45,0.46), alt*0.45);",
      "    if (urban) albedo = mix(albedo, vec3(0.30,0.30,0.31), 0.68);",
      "  }",
      "",
      "  float ndl = max(dot(n, uSun), 0.0);",
      "  vec3 amb = mix(uGround, uZenith, 0.5 + 0.5*n.z) * 0.42;",
      "  vec3 col = albedo * (amb + vec3(1.05,1.0,0.92) * ndl * 0.95);",
      "  if (water) {",
      "    vec3 v = normalize(-vRel);",
      "    vec3 h = normalize(uSun + v);",
      "    col += vec3(0.9,0.92,0.85) * pow(max(dot(n,h),0.0), 90.0) * 0.55;",
      "  }",
      "",
      "  float dist = length(vRel);",
      "  float fog = 1.0 - exp(-pow(dist*uFogDensity, 2.0));",
      "  vec3 fogCol = skyColour(normalize(vRel), uSun, uZenith, uHorizon, uGround);",
      "  fc = vec4(mix(col, fogCol, clamp(fog,0.0,1.0)), 1.0);",
      LOGDEPTH_FS,
      "}"
    ].join("\n")
  };

  /* ------------------------------------------------------------------ mesh
     Everything solid: the aeroplane inside and out, buildings, pavement. Vertex
     colour plus baked ambient occlusion, one directional light, no shadows. */

  var mesh = {
    vs: HEAD + [
      "in vec3 aPos; in vec3 aNormal; in vec3 aColour; in float aAO;",
      "uniform mat4 uViewProj; uniform mat4 uModel; uniform mat3 uNormalMat;",
      "uniform float uFcoef;",
      "out vec3 vN; out vec3 vC; out float vAO; out vec3 vRel; out float vLogZ;",
      "void main(){",
      "  vec4 wp = uModel * vec4(aPos, 1.0);",
      "  vRel = wp.xyz;",
      "  vN = uNormalMat * aNormal;",
      "  vC = aColour; vAO = aAO;",
      "  gl_Position = uViewProj * wp;",
      LOGDEPTH_VS,
      "}"
    ].join("\n"),
    fs: HEAD + PREC + [
      "in vec3 vN; in vec3 vC; in float vAO; in vec3 vRel; in float vLogZ;",
      "uniform vec3 uSun, uZenith, uHorizon, uGround;",
      "uniform float uFogDensity, uFcoefHalf, uEmissive;",
      "out vec4 fc;",
      SKY_FN,
      "void main(){",
      "  vec3 n = normalize(vN);",
      "  float ndl = max(dot(n, uSun), 0.0);",
      /* Hemispheric ambient: sky colour from above, ground bounce from below.
         With no shadows this is what stops undersides going flat black. */
      "  vec3 amb = mix(uGround, uZenith, 0.5 + 0.5*n.z);",
      "  vec3 col = vC * (amb * 0.52 * vAO + vec3(1.05,1.0,0.94) * ndl * 0.85);",
      "  col = mix(col, vC, uEmissive);",
      "  float dist = length(vRel);",
      "  float fog = 1.0 - exp(-pow(dist*uFogDensity, 2.0));",
      "  vec3 fogCol = skyColour(normalize(vRel + vec3(0.0,0.0,1e-4)), uSun, uZenith, uHorizon, uGround);",
      "  fc = vec4(mix(col, fogCol, clamp(fog,0.0,1.0)), 1.0);",
      LOGDEPTH_FS,
      "}"
    ].join("\n")
  };

  /* ---------------------------------------------------------------- screen
     Instrument displays. Unlit, because a CRT is not lit by the sun, with a
     brightness uniform driven by the display knobs and the electrical state — so
     losing a bus draws a dark panel for free. */

  var screen = {
    vs: HEAD + [
      "in vec3 aPos; in vec2 aUV;",
      "uniform mat4 uViewProj; uniform mat4 uModel; uniform float uFcoef;",
      "out vec2 vUV; out float vLogZ; out vec3 vRel;",
      "void main(){",
      "  vec4 wp = uModel * vec4(aPos, 1.0);",
      "  vRel = wp.xyz; vUV = aUV;",
      "  gl_Position = uViewProj * wp;",
      LOGDEPTH_VS,
      "}"
    ].join("\n"),
    fs: HEAD + PREC + [
      "in vec2 vUV; in float vLogZ; in vec3 vRel;",
      "uniform sampler2D uTex;",
      "uniform float uBright, uFcoefHalf;",
      "out vec4 fc;",
      "void main(){",
      "  vec3 c = texture(uTex, vUV).rgb * uBright;",
      /* A faint sheen across the glass, so the screens do not look like decals. */
      "  c += vec3(0.020,0.023,0.028) * (1.0 - vUV.y*0.55);",
      "  fc = vec4(c, 1.0);",
      LOGDEPTH_FS,
      "}"
    ].join("\n")
  };

  /* ---------------------------------------------------------------- sprite
     Instanced camera-facing quads: runway, approach and taxiway lights. One draw
     call for a few thousand of them. */

  var sprite = {
    vs: HEAD + [
      "in vec2 aCorner;",
      "in vec3 aOffset; in vec4 aColourSize;",
      "uniform mat4 uViewProj; uniform vec3 uRight; uniform vec3 uUp;",
      /* The instance positions are in the aerodrome's own frame, so they need
         the same origin offset every other static mesh gets. Without it each
         light is drawn as though its aerodrome coordinate were already relative
         to the camera, which scatters two thousand of them around the aeroplane
         — and since they blend additively, the ones that land in front of the
         windscreen sum into a wall of colour. */
      "uniform vec3 uOrigin;",
      "uniform float uFcoef; uniform float uScale;",
      "out vec2 vC; out vec3 vCol; out float vLogZ; out float vFade;",
      "void main(){",
      "  vec3 rel = aOffset + uOrigin;",
      "  float d = length(rel);",
      /* Lights grow a little with distance so they stay a visible point rather
         than shrinking below a pixel and shimmering, which is what real lights
         do to the eye. The growth has to be gentle and it has to be CLAMPED:
         unbounded, a two-metre runway end light two kilometres away is drawn
         thirteen metres across, and because the sprites blend additively a row
         of red end lights becomes a wall of pink across the windscreen. */
      "  float size = aColourSize.w * uScale * clamp(1.0 + d*0.0012, 1.0, 3.0);",
      "  vec3 p = rel + (uRight*aCorner.x + uUp*aCorner.y) * size;",
      "  vC = aCorner; vCol = aColourSize.rgb;",
      "  vFade = clamp(1.0 - d/26000.0, 0.0, 1.0);",
      "  gl_Position = uViewProj * vec4(p, 1.0);",
      LOGDEPTH_VS,
      "}"
    ].join("\n"),
    fs: HEAD + PREC + [
      "in vec2 vC; in vec3 vCol; in float vLogZ; in float vFade;",
      "uniform float uFcoefHalf;",
      "out vec4 fc;",
      "void main(){",
      "  float r = dot(vC, vC);",
      "  if (r > 1.0) discard;",
      "  float a = exp(-r*3.1) * vFade;",
      "  fc = vec4(vCol * a, a);",
      LOGDEPTH_FS,
      "}"
    ].join("\n")
  };

  return { sky: sky, terrain: terrain, mesh: mesh, screen: screen, sprite: sprite };
})();
