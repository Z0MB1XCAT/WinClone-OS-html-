/* ui/input.js
   READS:  -
   WRITES: sim.ctl, sim.ui.view
   TICK:   frame
   DEPS:   core/util, sim/a320_config

   Keyboard, mouse and gamepad. */

/* No pointer lock, by necessity and then by preference.
 *
 * WinClone's iframe sandbox omits allow-pointer-lock, so requestPointerLock is
 * denied. Rather than fight that, the view model is built around it: snap views
 * are the primary mechanism, and the mouse stays free.
 *
 * That turns out to be the better design for this aeroplane anyway. A systems
 * simulator is flown with the mouse on the panels — you are clicking switches far
 * more often than you are looking around — and mandatory mouse-look would have
 * been in the way. Free look is available by dragging, for the times you want it.
 *
 * Nothing here binds a Ctrl, Alt or Meta combination. Inside WinClone those
 * belong to the host, and above it to the browser.
 */

BFS.Input = (function () {
  "use strict";

  var U = BFS.Util, C = BFS.A320.C;

  /* Snap views, in cockpit-local yaw and pitch (radians). */
  var VIEWS = {
    forward: { yaw: 0, pitch: 0, fov: 1.15, name: "Forward" },
    ovhd: { yaw: 0, pitch: -0.95, fov: 1.0, name: "Overhead" },
    ped: { yaw: 0, pitch: 0.85, fov: 1.0, name: "Pedestal" },
    fcu: { yaw: 0, pitch: -0.28, fov: 0.75, name: "FCU" },
    left: { yaw: -1.15, pitch: 0.12, fov: 1.2, name: "Left window" },
    right: { yaw: 1.15, pitch: 0.12, fov: 1.2, name: "Right window" },
    mip: { yaw: -0.30, pitch: 0.30, fov: 0.85, name: "Instruments" }
  };

  function Input(canvas) {
    this.canvas = canvas;
    this.keys = Object.create(null);
    this.view = "forward";
    this.yaw = 0; this.pitch = 0; this.fov = 1.15;
    this.tgtYaw = 0; this.tgtPitch = 0; this.tgtFov = 1.15;
    this.dragging = false;
    this.lastX = 0; this.lastY = 0;
    this.freeLook = false;
    this.notices = [];
    this._bind();
  }

  Input.prototype._bind = function () {
    var self = this, cv = this.canvas;

    function ours(e) { return !e.ctrlKey && !e.altKey && !e.metaKey; }

    window.addEventListener("keydown", function (e) {
      if (!ours(e)) return;
      if (!self.keys[e.code]) self._press(e.code);
      self.keys[e.code] = true;
      /* Swallow the keys we act on, so the page does not scroll under us. */
      if (/^(Arrow|Space|Page|Home|End|Digit|Key[A-Z]|F[1-9])/.test(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", function (e) { self.keys[e.code] = false; });

    cv.addEventListener("mousedown", function (e) {
      self.dragging = true; self.lastX = e.clientX; self.lastY = e.clientY;
      cv.style.cursor = "move";
    });
    window.addEventListener("mouseup", function () {
      self.dragging = false; cv.style.cursor = "default";
    });
    window.addEventListener("mousemove", function (e) {
      if (!self.dragging) return;
      var dx = e.clientX - self.lastX, dy = e.clientY - self.lastY;
      self.lastX = e.clientX; self.lastY = e.clientY;
      self.tgtYaw = U.clamp(self.tgtYaw + dx * 0.0042, -2.4, 2.4);
      self.tgtPitch = U.clamp(self.tgtPitch + dy * 0.0042, -1.35, 1.35);
    });
    cv.addEventListener("wheel", function (e) {
      self.tgtFov = U.clamp(self.tgtFov + e.deltaY * 0.0009, 0.35, 1.5);
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  };

  Input.prototype.setView = function (name) {
    var v = VIEWS[name];
    if (!v) return;
    this.view = name;
    this.tgtYaw = v.yaw; this.tgtPitch = v.pitch; this.tgtFov = v.fov;
    this.notice(v.name);
  };

  Input.prototype.notice = function (s) {
    this.notices.push({ text: s, t: 0 });
    if (this.notices.length > 4) this.notices.shift();
  };

  /* Discrete actions, on key-down only. */
  Input.prototype._press = function (code) {
    var sim = this.sim;
    if (!sim) return;
    var ctl = sim.ctl;

    switch (code) {
      case "F1": this.setView("forward"); break;
      case "F2": this.setView("ovhd"); break;
      case "F3": this.setView("ped"); break;
      case "F4": this.setView("fcu"); break;
      case "F5": this.setView("left"); break;
      case "F6": this.setView("right"); break;
      case "F7": this.setView("mip"); break;

      case "KeyG":
        ctl.gearLever = ctl.gearLever ? 0 : 1;
        this.notice("Gear " + (ctl.gearLever ? "DOWN" : "UP"));
        break;
      case "BracketRight":
        ctl.flapLever = Math.min(4, ctl.flapLever + 1);
        this.notice("Flap " + ["0", "1", "2", "3", "FULL"][ctl.flapLever]);
        break;
      case "BracketLeft":
        ctl.flapLever = Math.max(0, ctl.flapLever - 1);
        this.notice("Flap " + ["0", "1", "2", "3", "FULL"][ctl.flapLever]);
        break;
      case "KeyB":
        ctl.parkBrake = !ctl.parkBrake;
        this.notice("Parking brake " + (ctl.parkBrake ? "SET" : "RELEASED"));
        break;
      case "KeyV":
        ctl.speedbrake = ctl.speedbrake > 0.5 ? 0 : 1;
        this.notice("Speedbrake " + (ctl.speedbrake > 0.5 ? "OUT" : "IN"));
        break;
      case "KeyN":
        ctl.groundSpoilers = !ctl.groundSpoilers;
        this.notice("Ground spoilers " + (ctl.groundSpoilers ? "ARMED" : "DISARMED"));
        break;
      case "KeyC": this.freeLook = !this.freeLook;
        this.notice("Free look " + (this.freeLook ? "on" : "off")); break;
      case "KeyR":
        for (var i = 0; i < 2; i++) sim.sys.eng[i].revCmd = !sim.sys.eng[i].revCmd;
        this.notice("Reverse " + (sim.sys.eng[0].revCmd ? "SELECTED" : "STOWED"));
        break;
      case "Digit1": case "Digit2": case "Digit3": case "Digit4":
        sim.sys.gear.autobrake = +code.slice(5) - 1;
        this.notice("Autobrake " + ["OFF", "LO", "MED", "MAX"][sim.sys.gear.autobrake]);
        break;
      case "Backslash":
        ctl.thrust[0] = ctl.thrust[1] = ctl.thrust[0] > 0.5 ? 0 : 1;
        this.notice("Thrust " + (ctl.thrust[0] > 0.5 ? "TOGA" : "IDLE"));
        break;
    }
  };

  /* Continuous axes. Held keys move the stick toward a target and it springs
     back when released — the closest a keyboard gets to a sidestick, and much
     more flyable than treating the key as a direct deflection. */
  Input.prototype.update = function (sim, dt) {
    this.sim = sim;
    var k = this.keys, ctl = sim.ctl;

    var pitchIn = (k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0);
    var rollIn = (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0);
    var yawIn = (k.Period ? 1 : 0) - (k.Comma ? 1 : 0);

    var rate = 2.6, spring = 3.4;
    ctl.stick[0] = axis(ctl.stick[0], pitchIn, rate, spring, dt);
    ctl.stick[1] = axis(ctl.stick[1], rollIn, rate, spring, dt);
    ctl.pedals = axis(ctl.pedals, yawIn, 2.2, 2.8, dt);

    /* Nosewheel tiller shares the rudder keys on the ground. */
    ctl.tiller = sim.truth.onGround ? ctl.pedals : 0;

    /* Thrust levers. */
    var tdelta = ((k.PageUp || k.Equal) ? 1 : 0) - ((k.PageDown || k.Minus) ? 1 : 0);
    if (tdelta) {
      var nt = U.clamp(ctl.thrust[0] + tdelta * 0.42 * dt, 0, 1);
      ctl.thrust[0] = ctl.thrust[1] = nt;
    }

    /* Wheel brakes. */
    var brake = k.Space ? 1 : 0;
    ctl.brakeL = U.lag(ctl.brakeL, brake, 0.10, dt);
    ctl.brakeR = U.lag(ctl.brakeR, brake, 0.10, dt);
    if (brake && ctl.parkBrake) ctl.parkBrake = false;

    /* Pitch trim. */
    if (k.Semicolon) sim._fctl.trim(-0.35 * U.DEG * dt * 12);
    if (k.Quote) sim._fctl.trim(0.35 * U.DEG * dt * 12);

    /* Keyboard view panning, for when a snap view is nearly right. */
    var pan = 1.4 * dt;
    if (k.KeyJ) this.tgtYaw = U.clamp(this.tgtYaw - pan, -2.4, 2.4);
    if (k.KeyL) this.tgtYaw = U.clamp(this.tgtYaw + pan, -2.4, 2.4);
    if (k.KeyI) this.tgtPitch = U.clamp(this.tgtPitch - pan, -1.35, 1.35);
    if (k.KeyK) this.tgtPitch = U.clamp(this.tgtPitch + pan, -1.35, 1.35);

    /* Ease toward the target so snapping between views is smooth rather than a
       jump cut, which is disorientating in a cockpit. */
    this.yaw = U.lag(this.yaw, this.tgtYaw, 0.10, dt);
    this.pitch = U.lag(this.pitch, this.tgtPitch, 0.10, dt);
    this.fov = U.lag(this.fov, this.tgtFov, 0.12, dt);

    for (var i = this.notices.length - 1; i >= 0; i--) {
      this.notices[i].t += dt;
      if (this.notices[i].t > 3.2) this.notices.splice(i, 1);
    }
  };

  function axis(cur, input, rate, spring, dt) {
    if (input) return U.clamp(cur + input * rate * dt, -1, 1);
    var d = spring * dt;
    return Math.abs(cur) <= d ? 0 : cur - Math.sign(cur) * d;
  }

  return { Input: Input, VIEWS: VIEWS };
})();
