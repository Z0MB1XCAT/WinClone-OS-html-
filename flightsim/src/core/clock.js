/* core/clock.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util */

/* The fixed-step clock, and the guard rails around it.
 *
 * Three hazards this file exists to handle, all of which are certainties rather
 * than risks in this environment:
 *
 *  1. The window gets minimised. WinClone's window manager hides the iframe, the
 *     browser stops calling requestAnimationFrame, and when it resumes the first
 *     frame reports a delta of thirty seconds. Integrate that and the aircraft
 *     leaves the atmosphere. So: dt is hard-clamped, and visibilitychange pauses
 *     outright.
 *
 *  2. The machine is too slow to keep up. Without a substep cap, each frame's
 *     backlog makes the next frame slower still — the classic spiral of death.
 *     So: MAX_SUBSTEPS, and beyond it simulation time is *discarded*, not
 *     deferred, with the shortfall surfaced rather than hidden.
 *
 *  3. Rendering costs more than the frame budget. The watchdog tracks a rolling
 *     mean frame time and exposes `load`, which the renderer uses to scale
 *     resolution and terrain detail. Adaptivity belongs in the renderer, not
 *     here — this file only measures.
 */

BFS.Clock = (function () {
  "use strict";

  var U = BFS.Util;

  var SIM_HZ = 120;
  var STEP = 1 / SIM_HZ;
  var MAX_SUBSTEPS = 8;
  var DT_CLAMP = 0.1;          // seconds; anything longer is a stall, not elapsed time

  function Clock() {
    this.step = STEP;
    this.simHz = SIM_HZ;
    this.t = 0;                // simulation seconds since boot
    this.frame = 0;
    this.tick = 0;             // fixed steps taken; drives the 30 Hz / 10 Hz decimations
    this.accum = 0;
    this.alpha = 0;            // render interpolation factor within the current step
    this.paused = false;
    this.pauseReason = "";
    this.rate = 1;             // time compression
    this.dropped = 0;          // sim seconds discarded to avoid a death spiral
    this.lastWall = 0;
    this.frameMs = new U.Ring(90);
    this.stepMs = new U.Ring(90);
    this.fps = 0;
    this.load = 0;             // 0..1+, mean frame time against a 60 Hz budget
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this._bound = false;
  }

  /* Auto-pause when the document is hidden or the frame loses focus. Both matter:
     hidden covers the minimised window, blur covers the user clicking another
     WinClone window while ours stays visible. */
  Clock.prototype.bindVisibility = function (onChange) {
    if (this._bound) return;
    this._bound = true;
    var self = this;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) self.pause("hidden");
      else if (self.pauseReason === "hidden") self.resume();
      if (onChange) onChange(self);
    });
    window.addEventListener("blur", function () {
      if (!self.paused) { self.pause("blur"); if (onChange) onChange(self); }
    });
    window.addEventListener("focus", function () {
      if (self.pauseReason === "blur") { self.resume(); if (onChange) onChange(self); }
    });
  };

  Clock.prototype.pause = function (reason) {
    this.paused = true;
    this.pauseReason = reason || "user";
    this.accum = 0;            // discard the backlog; resuming should not fast-forward
  };
  Clock.prototype.resume = function () {
    this.paused = false;
    this.pauseReason = "";
    this.lastWall = 0;         // force the next frame to measure a fresh delta
    this.accum = 0;
  };
  Clock.prototype.togglePause = function () {
    if (this.paused) this.resume(); else this.pause("user");
    return this.paused;
  };

  /* Called once per animation frame with the rAF timestamp in milliseconds.
     Returns the number of fixed steps the caller should run. */
  Clock.prototype.beginFrame = function (wallMs) {
    this.frame++;
    if (!this.lastWall) { this.lastWall = wallMs; return 0; }

    var dt = (wallMs - this.lastWall) / 1000;
    this.lastWall = wallMs;

    this.frameMs.push(dt * 1000);
    this._fpsAccum += dt; this._fpsFrames++;
    if (this._fpsAccum >= 0.5) {
      this.fps = this._fpsFrames / this._fpsAccum;
      this._fpsAccum = 0; this._fpsFrames = 0;
    }
    this.load = this.frameMs.mean() / 16.67;

    if (dt < 0) dt = 0;
    if (dt > DT_CLAMP) dt = DT_CLAMP;     // hazard 1
    if (this.paused) { this.alpha = 0; return 0; }

    this.accum += dt * this.rate;

    var steps = Math.floor(this.accum / this.step);
    if (steps > MAX_SUBSTEPS) {           // hazard 2
      this.dropped += (steps - MAX_SUBSTEPS) * this.step;
      this.accum = MAX_SUBSTEPS * this.step;
      steps = MAX_SUBSTEPS;
    }
    this.accum -= steps * this.step;
    this.alpha = this.accum / this.step;
    return steps;
  };

  Clock.prototype.advance = function () {
    this.t += this.step;
    this.tick++;
  };

  /* The decimations every subsystem schedules against. Offsets are deliberate:
     spreading the 30 Hz and 10 Hz work across different substeps keeps one frame
     from carrying all of it. */
  Clock.prototype.every = function (n, offset) { return (this.tick % n) === (offset || 0); };
  Clock.prototype.is30Hz = function () { return (this.tick & 3) === 0; };
  Clock.prototype.is10Hz = function () { return (this.tick % 12) === 6; };

  return { Clock: Clock, SIM_HZ: SIM_HZ, STEP: STEP, MAX_SUBSTEPS: MAX_SUBSTEPS, DT_CLAMP: DT_CLAMP };
})();
