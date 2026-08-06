/* core/geo.js
   READS:  -
   WRITES: -
   TICK:   none
   DEPS:   core/util, core/vecmat */

/* Geodesy, and the rebasable local frame everything renders in.
 *
 * The precision problem: the aircraft's position is a point on a 6,378 km
 * sphere, but the GPU only takes float32, which has ~7 significant digits. Feed
 * it Earth-centred coordinates and vertices land on a 1-metre lattice — the
 * runway visibly jitters and the cockpit shakes apart.
 *
 * The fix is three-layered, and all three layers live here or are enforced from
 * here:
 *   1. Positions are geodetic lat/lon/alt in float64 and never anything else.
 *   2. Rendering happens in a local ENU tangent plane whose origin follows the
 *      aircraft, rebasing whenever it drifts past REBASE_M. Every coordinate the
 *      GPU sees is therefore small — under ~10 km — where float32 resolves
 *      millimetres.
 *   3. Matrices are assembled in float64 with the camera already subtracted,
 *      and only the finished matrix is downcast (see V.toF32).
 *
 * ENU axes: x east, y north, z up.
 */

BFS.Geo = (function () {
  "use strict";

  var U = BFS.Util, V = BFS.V;

  var A = 6378137.0;                 // WGS84 semi-major axis, m
  var F = 1 / 298.257223563;         // flattening
  var E2 = F * (2 - F);              // first eccentricity squared
  var B = A * (1 - F);

  var REBASE_M = 5000;               // rebase once the aircraft is this far from the origin

  function geodeticToEcef(out, latDeg, lonDeg, h) {
    var lat = latDeg * U.DEG, lon = lonDeg * U.DEG;
    var sLat = Math.sin(lat), cLat = Math.cos(lat);
    var N = A / Math.sqrt(1 - E2 * sLat * sLat);
    out[0] = (N + h) * cLat * Math.cos(lon);
    out[1] = (N + h) * cLat * Math.sin(lon);
    out[2] = (N * (1 - E2) + h) * sLat;
    return out;
  }

  /* Bowring's method: closed enough to exact for our altitudes, and non-iterative. */
  function ecefToGeodetic(out, x, y, z) {
    var p = Math.hypot(x, y);
    var th = Math.atan2(z * A, p * B);
    var st = Math.sin(th), ct = Math.cos(th);
    var ep2 = (A * A - B * B) / (B * B);
    var lat = Math.atan2(z + ep2 * B * st * st * st, p - E2 * A * ct * ct * ct);
    var lon = Math.atan2(y, x);
    var sLat = Math.sin(lat);
    var N = A / Math.sqrt(1 - E2 * sLat * sLat);
    out[0] = lat * U.RAD;
    out[1] = lon * U.RAD;
    out[2] = p / Math.cos(lat) - N;
    return out;
  }

  /* ---------------------------------------------------------------- Frame
     A local ENU tangent plane anchored at a geodetic point. Rendering, terrain
     tiles and airport geometry all live in one of these. */

  function Frame(latDeg, lonDeg, h) {
    this.ecef = new Float64Array(3);
    this.lat = 0; this.lon = 0; this.h = 0;
    this._m = new Float64Array(9);   // ECEF -> ENU rotation, row-major
    this.setOrigin(latDeg || 0, lonDeg || 0, h || 0);
  }

  Frame.prototype.setOrigin = function (latDeg, lonDeg, h) {
    this.lat = latDeg; this.lon = lonDeg; this.h = h;
    geodeticToEcef(this.ecef, latDeg, lonDeg, h);
    var lat = latDeg * U.DEG, lon = lonDeg * U.DEG;
    var sLat = Math.sin(lat), cLat = Math.cos(lat),
        sLon = Math.sin(lon), cLon = Math.cos(lon);
    var m = this._m;
    m[0] = -sLon;         m[1] = cLon;          m[2] = 0;
    m[3] = -sLat * cLon;  m[4] = -sLat * sLon;  m[5] = cLat;
    m[6] = cLat * cLon;   m[7] = cLat * sLon;   m[8] = sLat;
    return this;
  };

  Frame.prototype.geodeticToEnu = function (out, latDeg, lonDeg, h) {
    var e = _tmpEcef;
    geodeticToEcef(e, latDeg, lonDeg, h);
    var dx = e[0] - this.ecef[0], dy = e[1] - this.ecef[1], dz = e[2] - this.ecef[2];
    var m = this._m;
    out[0] = m[0] * dx + m[1] * dy + m[2] * dz;
    out[1] = m[3] * dx + m[4] * dy + m[5] * dz;
    out[2] = m[6] * dx + m[7] * dy + m[8] * dz;
    return out;
  };

  Frame.prototype.enuToGeodetic = function (out, e, n, u) {
    var m = this._m;
    var x = this.ecef[0] + m[0] * e + m[3] * n + m[6] * u;
    var y = this.ecef[1] + m[1] * e + m[4] * n + m[7] * u;
    var z = this.ecef[2] + m[2] * e + m[5] * n + m[8] * u;
    return ecefToGeodetic(out, x, y, z);
  };

  /* Offset of another frame's origin, expressed in this frame. Used when the
     render origin rebases: everything resident keeps its own local vertices and
     only its per-draw offset moves. */
  Frame.prototype.offsetOf = function (out, other) {
    var dx = other.ecef[0] - this.ecef[0],
        dy = other.ecef[1] - this.ecef[1],
        dz = other.ecef[2] - this.ecef[2];
    var m = this._m;
    out[0] = m[0] * dx + m[1] * dy + m[2] * dz;
    out[1] = m[3] * dx + m[4] * dy + m[5] * dz;
    out[2] = m[6] * dx + m[7] * dy + m[8] * dz;
    return out;
  };

  var _tmpEcef = new Float64Array(3);

  /* ------------------------------------------------------- great circle / rhumb */

  /* Metres between two geodetic points, ignoring altitude. Haversine on the mean
     radius is good to ~0.3% — fine for navigation display, never used by physics. */
  function distance(lat1, lon1, lat2, lon2) {
    var R = 6371008.8;
    var p1 = lat1 * U.DEG, p2 = lat2 * U.DEG;
    var dp = (lat2 - lat1) * U.DEG, dl = (lon2 - lon1) * U.DEG;
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /* Initial true bearing, degrees. */
  function bearing(lat1, lon1, lat2, lon2) {
    var p1 = lat1 * U.DEG, p2 = lat2 * U.DEG, dl = (lon2 - lon1) * U.DEG;
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return U.wrap360(Math.atan2(y, x) * U.RAD);
  }

  /* Project from a point along a true bearing. */
  function destination(out, lat, lon, bearingDeg, distM) {
    var R = 6371008.8, d = distM / R;
    var p1 = lat * U.DEG, l1 = lon * U.DEG, b = bearingDeg * U.DEG;
    var sp = Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b);
    var p2 = Math.asin(Math.min(1, Math.max(-1, sp)));
    var l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1),
                             Math.cos(d) - Math.sin(p1) * sp);
    out[0] = p2 * U.RAD;
    out[1] = ((l2 * U.RAD + 540) % 360) - 180;
    return out;
  }

  /* ------------------------------------------------------------- slippy tiles
     Web Mercator, the addressing scheme the terrarium elevation tiles use. */

  function lonToTileX(lon, z) { return (lon + 180) / 360 * Math.pow(2, z); }
  function latToTileY(lat, z) {
    var r = lat * U.DEG;
    return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z);
  }
  function tileXToLon(x, z) { return x / Math.pow(2, z) * 360 - 180; }
  function tileYToLat(y, z) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return U.RAD * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  /* Ground metres covered by one tile pixel at this latitude and zoom — the
     input to every screen-space-error decision the terrain quadtree makes. */
  function metresPerPixel(lat, z, tileSize) {
    return Math.cos(lat * U.DEG) * 2 * Math.PI * A / ((tileSize || 256) * Math.pow(2, z));
  }

  /* Terrarium RGB encoding. Negative values are real: they are bathymetry, which
     is why the Bristol Channel comes out of the data correctly for free. */
  function decodeTerrarium(r, g, b) { return (r * 256 + g + b / 256) - 32768; }

  /* Magnetic variation. A plane fit over Britain and the near approaches, good
     to a few tenths of a degree there and deliberately not used elsewhere — a
     world model would cost far more bytes than a single-airport sim can justify. */
  function magVarUK(lat, lon) {
    return -0.30 + 0.145 * (lat - 51.4) - 0.62 * (lon + 3.34);
  }

  return {
    A: A, F: F, E2: E2, REBASE_M: REBASE_M,
    geodeticToEcef: geodeticToEcef, ecefToGeodetic: ecefToGeodetic,
    Frame: Frame,
    distance: distance, bearing: bearing, destination: destination,
    lonToTileX: lonToTileX, latToTileY: latToTileY,
    tileXToLon: tileXToLon, tileYToLat: tileYToLat,
    metresPerPixel: metresPerPixel,
    decodeTerrarium: decodeTerrarium, magVarUK: magVarUK
  };
})();
