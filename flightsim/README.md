# Bing Flight Simulator

An Airbus A320 simulator that runs inside WinClone — real terrain elevation, a
3D cockpit, a blade-element flight model, and deep aircraft systems.

It is **imported into WinClone, not built into it.** Nothing in `index.html`,
`app.js` or `styles.css` is modified. Everything lives in this directory.

> **Status: phase 1 of 5 — it flies.** Real Cardiff terrain, EGFF with its
> markings and lighting, an A320 with a 3D cockpit and exterior, blade-element
> aerodynamics, oleo gear, CFM56 engines, PFD and ND. You can start on stand 7,
> take off from runway 12 and fly.
>
> Not yet built: the systems networks (electrical, hydraulic, pneumatic), ECAM,
> the fly-by-wire laws, autoflight and the MCDU. Those are phases 3 to 5.
>
> Known rough edges, honestly: there is **no auto-trim** — the aeroplane is in
> direct law and the engines sit below the centre of gravity, so full thrust
> pitches the nose up and you have to hold it or trim it (`;` and `'`). The
> **short final preset is not properly trimmed** and starts descending faster
> than the glidepath. The terminal building does not render from the stand. The
> lifting-line solve is deferred (see below).

## Installing it into WinClone

1. Open WinClone and sign in.
2. Open **File Explorer**, go to a folder you like (Documents is fine).
3. Right-click ▸ **Import from computer**, and pick
   `flightsim/BingFlightSimulator.html`.
4. Double-click the imported file.

WinClone opens `.html` files in its HTML Viewer, which is where the simulator
runs.

**Updating it later:** delete the old file first. WinClone's importer renames
rather than overwrites, so importing again just gets you
`BingFlightSimulator (2).html` while the original keeps opening.

## What the host environment costs us

WinClone renders imported HTML into
`<iframe sandbox="allow-scripts allow-modals allow-popups">` via `srcdoc`
(`app.js:10692`). That list has no `allow-same-origin`, which gives the document
an **opaque origin**. Consequences, all of them designed around rather than
worked around:

| | |
|---|---|
| **No persistence** | `localStorage` and `indexedDB` *throw* — not fail, throw. Nothing is ever saved. `core/util.js`'s `safeStorage` is the only place allowed to touch storage; everything else goes through it and gets an in-memory map. |
| **No pointer lock** | Snap views (F1–F6) are the primary way to look around, with click-drag as a secondary. This suits a systems simulator better than mouse-look anyway, since the panels need clicking. |
| **No fullscreen** | The sim fills the WinClone window. It must be usable at 760×560, the default HTML Viewer size — so the small layout is designed first, not last. |
| **Size matters more than usual** | WinClone re-runs `JSON.stringify` over its *entire* virtual filesystem on every file operation (`saveFS`, `app.js:7741`). A fat file slows down all of WinClone's file I/O, not just ours. The build gate is on JSON-escaped character count for exactly this reason. |
| **Network is CORS-only** | Requests go out with `Origin: null`, so only `Access-Control-Allow-Origin: *` endpoints work. The elevation tiles qualify; the simulator flies fine without them regardless. |

Blob-URL Web Workers, contrary to the usual guidance about opaque origins, *do*
work in current Chromium — measured, not assumed. The terrain decoder is still
written as a pure function that runs happily on the main thread, because that is
not guaranteed across browsers.

## Why the file is compressed

`BingFlightSimulator.html` is a small shell wrapping one base64 string of gzipped
JavaScript, decompressed with `DecompressionStream` and evaluated at boot.

This is not premature cleverness. The file is stored as a **JSON string**, and
base64 is drawn entirely from `[A-Za-z0-9+/=]`, so it escapes to itself. Raw
JavaScript pays two characters for every `"`, `\` and newline. The compressed
form costs roughly a third as much of WinClone's storage budget, and that
headroom is what pays for the baked elevation data.

Debugging is unaffected: the payload carries a `//# sourceURL`, so DevTools shows
a named, breakpointable script with correct line numbers. `build.mjs` also emits
`BingFlightSimulator.debug.html` with the source inline and uncompressed.

## Working on it

```sh
node flightsim/build.mjs           # build, lint and size-gate
node flightsim/tools/strip_test.mjs # verify the comment scanner
node flightsim/smoke.mjs           # headless end-to-end, under the real sandbox
```

Three test tiers, in decreasing frequency:

1. **`dev.html`** — the everyday loop. Serve the repo
   (`python3 -m http.server 8000`) and open
   `http://localhost:8000/flightsim/dev.html`. It reads `manifest.json` and
   injects one `<script>` per source file, so there is no build step and stack
   traces point at real files and lines.

   It is **not the truth**: `dev.html` runs same-origin, so storage works and
   pointer lock is available when neither is true in WinClone.

2. **`sandbox.html`** — the harness that tells the truth. It fetches the built
   file and assigns it to the `srcdoc` of an iframe carrying WinClone's exact
   sandbox attribute, at the exact default window size. Run it at every phase
   gate. `?selftest=1` prints the environment fingerprint.

   `srcdoc`, never `src`: pointing `src` at a served file gives the frame a real
   origin, and you would be testing capabilities that vanish on import.

3. **`smoke.mjs`** — the same thing headless, plus a check that the file survives
   the `JSON.stringify` round trip WinClone puts it through.

### Source conventions

Every file is `BFS.Name = (function () { … })()`, with **no top-level side
effects** — a file may only assign into `BFS`, and nothing runs until
`BFS.main()` is called. That is what makes the dev loader (many script tags) and
the shipped build (one concatenated blob) behave identically.

Every file carries a contract header, and `build.mjs` enforces it:

```js
/* sim/aero_strips.js
   READS:  sim.truth, sim.env, sim.surf, sim.mass
   WRITES: sim.aero.{F,M,alpha,beta,strips}
   TICK:   fdm, 120Hz
   DEPS:   core/vecmat, sim/atmos, sim/a320_config */
```

If two files claim `WRITES` on the same field, the build fails. Files are capped
at 700 lines (warning) and 900 (error). `manifest.json` lists every file with a
one-line purpose, and doubles as the architecture document.

### The three ownership rules

1. The flight model never reads avionics.
2. **Avionics never read `truth`; they read `adr`.** Exactly one module converts
   physical reality into what the aeroplane believes, and that is where sensor
   lag, pitot blockage and inertial drift live. This split is why unreliable
   airspeed and fly-by-wire law degradation will emerge from the model later
   instead of being scripted — and it is the one thing here that would be
   genuinely expensive to retrofit.
3. The renderer and displays are pure readers.

## Flying it

Arrow keys fly, `,` and `.` are the rudder, `PgUp`/`PgDn` the thrust levers and
`\` snaps them between idle and TOGA. `G` gear, `[` and `]` flaps, `B` parking
brake, `Space` wheel brakes, `V` speedbrake, `R` reverse, `;` and `'` pitch trim,
`1`–`4` autobrake. `F1`–`F7` are snap views, drag to look around, `P` pauses.

Query parameters, useful for testing: `?preset=turnaround|lineup|approach`,
`?wind=`, `?winddir=`, `?turb=`, `?selftest=1`, `?debug=0`.

## A note on the aerodynamics

Forces are computed per surface element from the airflow local to that element —
eighty-two strips across the wing, tailplane, fin, fuselage and nacelles — rather
than from whole-aircraft coefficients. There is no roll damping term anywhere in
this codebase, and no adverse yaw term, and no dihedral effect term. Each falls
out of one line: the velocity seen by a strip is `v_body + ω × r`, so a rolling
aeroplane meets the air at a higher angle on the down-going wing and resists the
roll on its own.

One piece is deliberately deferred. Induced angle currently uses the elliptic
result, `α_ind = cl / (π·AR)`, per strip. The proper lifting-line solve — which
couples the strips together and is what makes a wing drop at the stall — is a
Phase 2 item. A first attempt at it summed each strip's circulation directly;
that is not lifting-line theory, which integrates the *spanwise derivative* of
circulation, and the error was worth measuring rather than arguing about: feeding
the matrix a perfectly symmetric elliptic loading returned a mean induced angle of
−0.05 on one wing and −2.89 on the other. The aeroplane duly rolled and yawed in
dead calm air. Better a simple model that is right than a sophisticated one that
is not.

## Data

Elevation comes from the AWS Terrarium tiles
(`s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`) — keyless,
global, `Access-Control-Allow-Origin: *`, available over Cardiff to zoom 15.
Negative values are bathymetry, which is why the Bristol Channel comes out of the
raw data correctly.

Cardiff Airport geometry derives from published runway data: thresholds
`51.401501, −3.358680` (RWY 12) and `51.391800, −3.327990` (RWY 30), 2,354 m of
asphalt at 220 ft. Stand 7 — one of Cardiff's two airbridge stands — is the spawn
point.

A small elevation grid around the airport is baked into the build so the view
from the gate is correct on the first frame and the simulator remains flyable
with no network at all.

## Licence

Part of the WinClone project; see `../LICENSE.txt`. Not affiliated with
Microsoft, Airbus, or any flight simulator publisher. Cardiff Airport is modelled
from published aeronautical data.
