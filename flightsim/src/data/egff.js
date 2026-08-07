/* data/egff.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util, core/geo */

/* Cardiff Airport (EGFF / CWL), Rhoose, Vale of Glamorgan.
 *
 * Everything here is generated from two surveyed points — the runway thresholds
 * — rather than listed as coordinates. Layout is expressed in runway-local
 * metres and projected to geodetic on demand, so refining the survey later means
 * changing two numbers rather than re-deriving a table.
 *
 * Runway-local frame:
 *   u  along the runway, 0 at the RWY 12 physical end, increasing toward RWY 30
 *   v  perpendicular, positive to the north-east — the terminal side
 *
 * Provenance, because the two differ in confidence:
 *
 *   SURVEYED. Threshold coordinates and elevations, runway dimensions, displaced
 *   threshold distances, aerodrome reference point, radio frequencies. From
 *   published aeronautical data. The derived runway is 2,389 m on a true bearing
 *   of 116.9 degrees, which agrees with the published 2,392 m TORA and 117
 *   degrees to within the rounding of the source.
 *
 *   APPROXIMATE. Taxiway routing, apron outline, terminal footprint and stand
 *   positions. Cardiff has around seventeen stands in a single line in front of
 *   one compact terminal on the north side, and stands 7 and 10 are the two with
 *   airbridges. The along-runway placement below is scaled to that description
 *   and should be checked against imagery before anyone calls it accurate.
 *   Stand 7 is the spawn point, so it is the one worth surveying first.
 */

BFS.EGFF = (function () {
  "use strict";

  var U = BFS.Util, Geo = BFS.Geo;

  var FT = 0.3048;

  /* ---- surveyed ---- */
  var THR12 = { lat: 51.401501, lon: -3.358680, elev: 205 * FT };
  var THR30 = { lat: 51.391800, lon: -3.327990, elev: 213 * FT };
  var ARP   = { lat: 51.396702, lon: -3.343330, elev: 220 * FT };

  var RWY = {
    id: "12/30",
    width: 148 * FT,              // 45.1 m
    displaced: [797 * FT, 551 * FT],   // in from the 12 and 30 physical ends
    surface: "asphalt"
  };

  /* The local frame is anchored at the RWY 12 end so that u runs the length of
     the runway. Built once, lazily, because it needs Geo. */
  var _frame = null, _len = 0, _brg = 0;

  function frame() {
    if (_frame) return _frame;
    _frame = new Geo.Frame(THR12.lat, THR12.lon, THR12.elev);
    _len = Geo.distance(THR12.lat, THR12.lon, THR30.lat, THR30.lon);
    _brg = Geo.bearing(THR12.lat, THR12.lon, THR30.lat, THR30.lon);
    return _frame;
  }

  function length() { frame(); return _len; }
  function bearing() { frame(); return _brg; }

  /* Runway-local metres -> geodetic. u along the runway, v to the north-east. */
  var _dest = new Float64Array(2);
  function toGeo(out, u, v) {
    frame();
    Geo.destination(_dest, THR12.lat, THR12.lon, _brg, u);
    Geo.destination(out, _dest[0], _dest[1], U.wrap360(_brg - 90), v);
    return out;
  }

  /* The reverse, for working out whether the aircraft is on pavement. */
  var _enu = new Float64Array(3);
  function toLocal(out, lat, lon) {
    frame().geodeticToEnu(_enu, lat, lon, 0);
    var b = _brg * U.DEG;
    var e = _enu[0], n = _enu[1];
    out[0] = e * Math.sin(b) + n * Math.cos(b);          // u
    out[1] = -(e * Math.cos(b) - n * Math.sin(b));       // v, positive north-east
    return out;
  }

  /* Runway surface height along u.
   *
   * The two threshold elevations are 62.5 m and 64.9 m, but the published
   * aerodrome elevation — the highest point of the landing area — is 67.1 m. So
   * the runway is not a ramp between its ends; it crowns in the middle. A
   * quadratic through the three constraints reproduces that, and it matters more
   * than it sounds: on a flat-ramp runway you can see the far threshold from the
   * near one, and at Cardiff you cannot. */
  function runwayElev(u) {
    var L = length();
    var t = U.clamp(u / L, 0, 1);
    var a = THR12.elev, b = THR30.elev, peak = ARP.elev;
    /* Lagrange through (0,a), (0.55,peak), (1,b). */
    var t0 = 0, t1 = 0.55, t2 = 1;
    return a * ((t - t1) * (t - t2)) / ((t0 - t1) * (t0 - t2)) +
           peak * ((t - t0) * (t - t2)) / ((t1 - t0) * (t1 - t2)) +
           b * ((t - t0) * (t - t1)) / ((t2 - t0) * (t2 - t1));
  }

  /* Height of the paved surface at any airport-local point. The apron sits a
     little above the runway crown, as Cardiff's does; taxiway shoulders blend. */
  function pavementElev(u, v) {
    var r = runwayElev(u);
    if (v < 60) return r;
    var t = U.smoothstep(60, 190, v);
    return r + t * 1.6;
  }

  /* ---- approximate: taxiways, apron, stands, buildings ---- */

  var APRON = { u0: 1180, u1: 2010, v0: 168, v1: 300 };
  var TERMINAL = { u0: 1330, u1: 1780, v0: 300, v1: 372, h: 14 };
  var TOWER = { u: 1268, v: 322, h: 28, r: 7 };

  /* Taxiway Alpha runs the length of the runway on the terminal side, with links
     at both ends and two mid-field. Widths are ICAO code C — Cardiff handles
     A320s and little larger. */
  var TAXIWAYS = [
    { id: "A",  width: 23, pts: [[60, 118], [2330, 118]] },
    { id: "A1", width: 23, pts: [[95, 40], [140, 118]] },
    { id: "A2", width: 23, pts: [[1150, 118], [1200, 168]] },
    { id: "A3", width: 23, pts: [[1900, 118], [1950, 168]] },
    { id: "A4", width: 23, pts: [[2300, 40], [2330, 118]] },
    { id: "B",  width: 23, pts: [[1180, 168], [2010, 168]] }
  ];

  /* Seventeen stands in a line facing the apron, nose-in toward the terminal.
     Nose-in means the aircraft heads north-east, across the runway direction. */
  var STAND_U0 = 1230, STAND_PITCH = 46, STAND_V = 232;
  var STANDS = (function () {
    var out = [];
    for (var i = 1; i <= 17; i++) {
      out.push({
        id: String(i),
        u: STAND_U0 + (i - 1) * STAND_PITCH,
        v: STAND_V,
        hdg: U.wrap360(bearingOffset(-90)),   // nose toward the terminal
        airbridge: i === 7 || i === 10,
        code: "C"
      });
    }
    return out;
  })();
  function bearingOffset(d) { return bearing() + d; }

  var STAND_BY_ID = {};
  for (var i = 0; i < STANDS.length; i++) STAND_BY_ID[STANDS[i].id] = STANDS[i];

  /* Where the aeroplane starts. Stand 7 is one of Cardiff's two airbridge
     stands, so it is a jetway gate rather than a walk-out remote stand. */
  function spawn(standId) {
    var s = STAND_BY_ID[standId || "7"] || STANDS[6];
    var g = new Float64Array(2);
    /* The stand marker is where the nosewheel stops. The aircraft datum sits
       about eleven metres behind it, which on a nose-in stand means eleven
       metres back along -v. */
    toGeo(g, s.u, s.v - 11);
    return {
      lat: g[0], lon: g[1],
      elev: pavementElev(s.u, s.v),
      hdg: s.hdg,
      stand: s
    };
  }

  /* Instrument approach geometry. Frequencies come from the UK AIP and are still
     to be filled in; the geometry is what the autopilot actually needs, and it
     falls out of the surveyed thresholds. */
  var ILS = [
    { rwy: "30", crs: U.wrap360(0), gs: 3.0, thrLat: THR30.lat, thrLon: THR30.lon,
      thrElev: THR30.elev, freq: null },
    { rwy: "12", crs: U.wrap360(0), gs: 3.0, thrLat: THR12.lat, thrLon: THR12.lon,
      thrElev: THR12.elev, freq: null }
  ];
  function ils(rwy) {
    frame();
    for (var i = 0; i < ILS.length; i++) {
      if (ILS[i].rwy === rwy) {
        ILS[i].crs = U.wrap360(rwy === "12" ? _brg : _brg + 180);
        return ILS[i];
      }
    }
    return null;
  }

  var RADIO = { twr: 133.105, app: 119.155, radar: 125.855, atis: 132.48, fire: 121.6 };
  var NAVAIDS = [
    { id: "BCN", name: "Brecon",   type: "VOR-DME", freq: 117.45, lat: 51.725601, lon: -3.263060 },
    { id: "SAT", name: "St Athan", type: "TACAN",   freq: 114.80, lat: 51.406399, lon: -3.434970 },
    { id: "BRI", name: "Bristol",  type: "NDB",     freq: 414,    lat: 51.381401, lon: -2.717540 },
    { id: "SWN", name: "Swansea",  type: "NDB",     freq: 321,    lat: 51.602200, lon: -4.065830 }
  ];

  return {
    ident: "EGFF", iata: "CWL", name: "Cardiff Airport",
    ARP: ARP, THR12: THR12, THR30: THR30, RWY: RWY,
    APRON: APRON, TERMINAL: TERMINAL, TOWER: TOWER,
    TAXIWAYS: TAXIWAYS, STANDS: STANDS, standById: STAND_BY_ID,
    RADIO: RADIO, NAVAIDS: NAVAIDS,
    frame: frame, length: length, bearing: bearing,
    toGeo: toGeo, toLocal: toLocal,
    runwayElev: runwayElev, pavementElev: pavementElev,
    spawn: spawn, ils: ils,
    magvar: Geo.magVarUK(ARP.lat, ARP.lon)
  };
})();
