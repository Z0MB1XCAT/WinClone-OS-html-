#!/usr/bin/env node
/* Numerical checks on the aerodynamics.
 *
 *   node flightsim/tools/aero_test.mjs
 *
 * These run the real strip model in Node, with no browser and no renderer, and
 * compare it against results that are known independently — Prandtl's elliptic
 * wing, and the A320's published behaviour. A strip model cannot be tuned by
 * feel: it has fifty interacting parameters and every one of them changes
 * several things at once, so the only way to know it is right is to measure it
 * against something that was right before you started.
 *
 * The first two tests exist specifically because an earlier lifting-line
 * formulation was silently, badly wrong — symmetric input, wildly asymmetric
 * output — and nothing in the simulator noticed until an aeroplane rolled off a
 * runway in dead calm air.
 */
import { loadSim, makeReporter } from "./simload.mjs";

const BFS = loadSim();
const t = makeReporter();
const U = BFS.Util, C = BFS.A320.C;
const DEG = Math.PI / 180;

/* ------------------------------------------------------- the influence matrix
   Exercised directly, before any of the rest of the model can obscure it. */

const aero = new BFS.Aero.Aero();
const wing = aero.wing;
const nw = wing.length;
const K = aero._K;

/* Symmetry. A symmetric circulation distribution on a symmetric wing must
   produce a symmetric downwash. This is the check the old code failed. */
{
  const semi = C.span / 2;
  const gamma = wing.map((s) => 10 * Math.sqrt(Math.max(0, 1 - (s.r[1] / semi) ** 2)));
  const w = [];
  for (let i = 0; i < nw; i++) {
    let s = 0;
    for (let j = 0; j < nw; j++) s += K[i * nw + j] * gamma[j];
    w.push(s);
  }
  /* Compare each strip against its mirror across the centreline. */
  let worst = 0;
  for (let i = 0; i < nw; i++) {
    const mirror = nw - 1 - i;
    const scale = Math.max(1e-9, Math.abs(w[i]) + Math.abs(w[mirror]));
    worst = Math.max(worst, Math.abs(w[i] - w[mirror]) / scale);
  }
  t("downwash is symmetric for symmetric loading", worst < 1e-9,
    `worst mirror mismatch ${(worst * 100).toExponential(2)}%`);

  const mean = w.reduce((a, b) => a + b, 0) / nw;
  t("elliptic loading induces downwash, not upwash", mean > 0,
    `mean w = ${mean.toFixed(4)} (sign convention)`);
}

/* Magnitude. For elliptic loading the induced angle is uniform across the span
   and equal to CL/(pi*AR) — Prandtl's result, and the one number this whole
   formulation has to reproduce. */
{
  const semi = C.span / 2, V = 100, CL = 0.5;
  /* Circulation for elliptic loading carrying lift L = CL*q*S. */
  const G0 = (2 * CL * V * C.wingArea) / (Math.PI * C.span);
  const gamma = wing.map((s) => G0 * Math.sqrt(Math.max(0, 1 - (s.r[1] / semi) ** 2)));
  const w = [];
  for (let i = 0; i < nw; i++) {
    let s = 0;
    for (let j = 0; j < nw; j++) s += K[i * nw + j] * gamma[j];
    w.push(s / V);
  }
  /* Sample the middle of the span; the discretisation is weakest at the tips,
     where the elliptic distribution has infinite slope. */
  const inner = w.slice(Math.floor(nw * 0.25), Math.ceil(nw * 0.75));
  const got = inner.reduce((a, b) => a + b, 0) / inner.length;
  const want = CL / (Math.PI * C.aspect);
  t.near("induced angle matches Prandtl's elliptic result",
         got / DEG, want / DEG, 0.12, " deg");
}

/* ------------------------------------------------------ the assembled model */

/* Put the aeroplane in a given state and evaluate one aerodynamic step. */
function evaluate({ speed = 100, alpha = 0, beta = 0, flap = 0, slat = 0,
                    p = 0, pitchRate = 0, r = 0, rho = 1.225, elev = 0, ths = 0,
                    ail = 0, rud = 0, mass = 60000, agl = 5000 } = {}) {
  const sim = BFS.State.create();
  sim.mass.m = mass;
  sim.mass.payload = mass - C.oew - 3000;
  sim.mass.fuel.left = sim.mass.fuel.right = 1500;
  BFS.MassBalance.update(sim);
  sim.mass.m = mass;

  sim.env.rho = rho; sim.env.a = 340.29; sim.env.p = 101325; sim.env.T = 288.15;
  sim.truth.agl = agl;
  sim.truth.vBody[0] = speed * Math.cos(alpha) * Math.cos(beta);
  sim.truth.vBody[1] = speed * Math.sin(beta);
  sim.truth.vBody[2] = speed * Math.sin(alpha) * Math.cos(beta);
  sim.truth.omega[0] = p; sim.truth.omega[1] = pitchRate; sim.truth.omega[2] = r;
  sim.surf.flap = flap; sim.surf.slat = slat;
  sim.surf.elev = elev; sim.surf.ths = ths;
  sim.surf.ailL = ail; sim.surf.ailR = -ail;
  sim.surf.rud = rud;

  const a = new BFS.Aero.Aero();
  /* Settle the separation state and the relaxed lifting-line iteration. */
  for (let i = 0; i < 400; i++) a.update(sim, 1 / 120);

  /* Body-axis force is not lift and drag. At any useful incidence the lift
     vector has a forward component along the body x axis, so reading -Fx as
     drag reports a wing that pulls the aeroplane along. Resolve into wind
     axes: drag opposes the velocity, lift is perpendicular to it. */
  const F = sim.aero.F;
  const ca = Math.cos(alpha), sa = Math.sin(alpha);
  const drag = -(F[0] * ca + F[2] * sa);
  const lift = F[0] * sa - F[2] * ca;
  const qbar = 0.5 * rho * speed * speed;

  /* Wing-only force, for comparing against wing theory rather than against the
     whole aeroplane including its tailplane. */
  let wingZ = 0, wingX = 0;
  for (const s of sim.aero.strips) {
    if (s.kind !== "wing") continue;
    wingZ += s._fz || 0; wingX += s._fx || 0;
  }

  return {
    sim, aero: a, F, M: sim.aero.M,
    lift, drag, q: qbar,
    CL: lift / (qbar * C.wingArea), CD: drag / (qbar * C.wingArea),
    wingCL: (wingX * sa - wingZ * ca) / (qbar * C.wingArea)
  };
}

/* Lift curve slope. A swept, moderate-aspect wing should come out near
   4.5 per radian — well below the two-dimensional 2*pi, because of the finite
   span the lifting line is there to model. */
{
  /* Wing alone, so this compares against wing theory rather than against the
     whole aeroplane with its tailplane adding a quarter again of the area.
     The finite-wing result is a0 / (1 + a0/(pi*AR*e)) — about 4.75 per radian
     for this planform, well below the two-dimensional 2*pi that the lifting
     line exists to correct. */
  const a0 = evaluate({ alpha: 0 * DEG });
  const a5 = evaluate({ alpha: 5 * DEG });
  const slope = (a5.wingCL - a0.wingCL) / (5 * DEG);
  t.near("wing lift curve slope is finite-wing, not 2D", slope, 4.75, 0.9, " /rad");
}

/* Roll damping. Rolling right must produce a moment opposing the roll — and
   nothing in the model says so; it comes out of omega x r changing the local
   incidence across the span. */
{
  const rolling = evaluate({ alpha: 3 * DEG, p: 0.35 });
  t("roll damping opposes the roll", rolling.M[0] < 0,
    `L = ${(rolling.M[0] / 1000).toFixed(0)} kN·m for +0.35 rad/s`);
}

/* Pitch damping, likewise. */
{
  const pitching = evaluate({ alpha: 3 * DEG, pitchRate: 0.15 });
  const steady = evaluate({ alpha: 3 * DEG });
  t("pitch damping opposes the pitch rate", pitching.M[1] < steady.M[1],
    `M drops ${((steady.M[1] - pitching.M[1]) / 1000).toFixed(0)} kN·m`);
}

/* Weathercock stability: sideslip must push the nose back into the wind. */
{
  const slip = evaluate({ alpha: 3 * DEG, beta: 6 * DEG });
  t("sideslip is stable in yaw", slip.M[2] > 0,
    `N = ${(slip.M[2] / 1000).toFixed(0)} kN·m for +6 deg of sideslip`);
  /* And dihedral must roll it away from the sideslip. */
  t("sideslip rolls away from the slip (dihedral effect)", slip.M[0] < 0,
    `L = ${(slip.M[0] / 1000).toFixed(0)} kN·m`);
}

/* Pitch stability: more incidence must produce a nose-down moment about the
   centre of gravity, or the aeroplane is not flyable. */
{
  const lo = evaluate({ alpha: 2 * DEG });
  const hi = evaluate({ alpha: 6 * DEG });
  t("positive static pitch stability", hi.M[1] < lo.M[1],
    `dM/dalpha = ${((hi.M[1] - lo.M[1]) / (4 * DEG) / 1000).toFixed(0)} kN·m/rad`);
}

/* Controls act in the right direction. */
{
  const neutral = evaluate({ alpha: 3 * DEG });
  const up = evaluate({ alpha: 3 * DEG, elev: -20 * DEG });
  t("elevator trailing edge up pitches nose up", up.M[1] > neutral.M[1],
    `dM = ${((up.M[1] - neutral.M[1]) / 1000).toFixed(0)} kN·m`);

  const rolled = evaluate({ alpha: 3 * DEG, ail: 20 * DEG });
  t("aileron rolls the commanded way", rolled.M[0] > 0,
    `L = ${(rolled.M[0] / 1000).toFixed(0)} kN·m`);
  /* Adverse yaw: the down-going aileron drags more, so a roll input yaws the
     wrong way. Nothing models this; it falls out of the strips. */
  t("adverse yaw appears with aileron", Math.abs(rolled.M[2]) > 1e3,
    `N = ${(rolled.M[2] / 1000).toFixed(0)} kN·m`);

  const rud = evaluate({ alpha: 3 * DEG, rud: 20 * DEG });
  t("right rudder yaws right", rud.M[2] > 0,
    `N = ${(rud.M[2] / 1000).toFixed(0)} kN·m`);
}

/* Flaps must add lift at a given incidence, and pitch the nose down. */
{
  const clean = evaluate({ alpha: 3 * DEG });
  const dirty = evaluate({ alpha: 3 * DEG, flap: 35, slat: 27 });
  t("full flap adds lift", dirty.CL > clean.CL * 1.25,
    `CL ${clean.CL.toFixed(2)} -> ${dirty.CL.toFixed(2)}`);
  /* Whether the aeroplane as a whole pitches down on flap extension depends on
     what the tailplane was carrying, and comparing two UNTRIMMED states does
     not answer that — the tail load here is whatever ths = 0 happens to give.
     The meaningful statement is "extending flaps requires more nose-up
     stabiliser to stay trimmed", and that check lives with the trim solver in
     the performance table. What belongs here is the mechanism: the flapped
     sections must carry a nose-down couple of their own. */
  const cmSum = (r) => r.sim.aero.strips
    .filter((s) => s.kind === "wing" && s._camber > 0)
    .reduce((a, s) => a + s._camber, 0);
  t("flapped sections carry a nose-down section moment",
    cmSum(dirty) > 0 && dirty.sim.aero.strips.some((s) => s._camber > 0.15),
    `mean camber ${(cmSum(dirty) / 28 / DEG).toFixed(1)} deg on the flapped strips`);
}

/* The stall: lift must peak and then fall away, not rise forever. */
{
  /* The WING's lift, not the whole aeroplane's. Past the stall the fuselage
     keeps generating crossflow lift that grows as sin^2 all the way to ninety
     degrees, which swamps the wing's break in any whole-aircraft measure. */
  let peak = 0, peakAlpha = 0;
  for (let a = 0; a <= 26; a += 1) {
    const r = evaluate({ alpha: a * DEG });
    if (r.wingCL > peak) { peak = r.wingCL; peakAlpha = a; }
  }
  /* Body incidence, not section incidence. The wing is rigged at four degrees
     and the lifting line takes a couple more off as downwash, so a section
     stalling at fifteen degrees shows up as a peak near ten on the fuselage
     reference line — which is where a clean A320 does stall. */
  t("wing lift peaks at a plausible stalling incidence",
    peakAlpha >= 9 && peakAlpha <= 16 && peak > 0.85 && peak < 1.5,
    `CLmax ${peak.toFixed(2)} at ${peakAlpha} deg body incidence`);
  const beyond = evaluate({ alpha: (peakAlpha + 6) * DEG }).wingCL;
  t("wing lift falls away past the stall", beyond < peak * 0.92,
    `${((1 - beyond / peak) * 100).toFixed(0)}% below peak, 6 deg beyond`);
}

/* Mach: drag must rise sharply past the critical Mach number, and the centre of
   pressure move aft — which is what Mach tuck is. */
{
  const slow = evaluate({ speed: 0.60 * 340.29, alpha: 2 * DEG, rho: 0.38 });
  const fast = evaluate({ speed: 0.86 * 340.29, alpha: 2 * DEG, rho: 0.38 });
  t("wave drag rises past the critical Mach number", fast.CD > slow.CD * 1.4,
    `Cd ${slow.CD.toFixed(4)} at M0.60 -> ${fast.CD.toFixed(4)} at M0.86`);
  t("Mach tuck: nose-down moment grows at high Mach", fast.M[1] < slow.M[1],
    `dM = ${((fast.M[1] - slow.M[1]) / 1000).toFixed(0)} kN·m`);
}

/* Ground effect must reduce induced drag near the surface. */
{
  const high = evaluate({ alpha: 5 * DEG, agl: 500 });
  const low = evaluate({ alpha: 5 * DEG, agl: 4 });
  t("ground effect reduces drag near the surface", low.CD < high.CD,
    `Cd ${high.CD.toFixed(4)} high, ${low.CD.toFixed(4)} in ground effect`);
}

process.exit(t.done() ? 1 : 0);
