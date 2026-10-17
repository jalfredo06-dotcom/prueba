/* Conversión de coordenadas para Colombia (sin dependencias).
 * Transversa de Mercator (series de Krüger, error < 0.1 mm) sobre elipsoide GRS80.
 * MAGNA-SIRGAS se trata como equivalente a WGS84 (diferencia centimétrica). */
(function (root) {
  'use strict';
  const A = 6378137, F = 1 / 298.257222101, RAD = Math.PI / 180;

  function makeTM(o) {
    const n = F / (2 - F), n2 = n * n, n3 = n2 * n;
    const Ar = A / (1 + n) * (1 + n2 / 4 + n2 * n2 / 64);
    const al = [n / 2 - 2 * n2 / 3 + 5 * n3 / 16, 13 * n2 / 48 - 3 * n3 / 5, 61 * n3 / 240];
    const be = [n / 2 - 2 * n2 / 3 + 37 * n3 / 96, n2 / 48 + n3 / 15, 17 * n3 / 480];
    const de = [2 * n - 2 * n2 / 3 - 2 * n3, 7 * n2 / 3 - 8 * n3 / 5, 56 * n3 / 15];
    const q = 2 * Math.sqrt(n) / (1 + n);
    const lon0 = o.lon0 * RAD, k0 = o.k0;

    function xiEta(phi, lam) {
      const s = Math.sin(phi);
      const t = Math.sinh(Math.atanh(s) - q * Math.atanh(q * s));
      const xp = Math.atan2(t, Math.cos(lam));
      const ep = Math.atanh(Math.sin(lam) / Math.sqrt(1 + t * t));
      let xi = xp, eta = ep;
      for (let j = 1; j <= 3; j++) {
        xi += al[j - 1] * Math.sin(2 * j * xp) * Math.cosh(2 * j * ep);
        eta += al[j - 1] * Math.cos(2 * j * xp) * Math.sinh(2 * j * ep);
      }
      return [xi, eta];
    }
    const xi0 = xiEta(o.lat0 * RAD, 0)[0];

    return {
      fwd(lat, lon) {
        let lam = lon * RAD - lon0;
        lam = Math.atan2(Math.sin(lam), Math.cos(lam));
        const [xi, eta] = xiEta(lat * RAD, lam);
        return [o.fe + k0 * Ar * eta, o.fn + k0 * Ar * (xi - xi0)];
      },
      inv(e, nn) {
        const xi = (nn - o.fn) / (k0 * Ar) + xi0, eta = (e - o.fe) / (k0 * Ar);
        let xp = xi, ep = eta;
        for (let j = 1; j <= 3; j++) {
          xp -= be[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
          ep -= be[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
        }
        const chi = Math.asin(Math.sin(xp) / Math.cosh(ep));
        let phi = chi;
        for (let j = 1; j <= 3; j++) phi += de[j - 1] * Math.sin(2 * j * chi);
        const lam = Math.atan2(Math.sinh(ep), Math.cos(xp));
        return [phi / RAD, (lon0 + lam) / RAD];
      }
    };
  }

  const BOGOTA = { lat0: 4.596200417, k0: 1, fe: 1000000, fn: 1000000 };
  const CRS = [
    { id: 4326, name: 'WGS 84 (grados)', short: 'WGS84', kind: 'geo' },
    { id: 4686, name: 'MAGNA-SIRGAS (grados)', short: 'MAGNA', kind: 'geo' },
    { id: 9377, name: 'MAGNA-SIRGAS Origen Nacional', short: 'Origen Nacional', kind: 'proj',
      tm: { lat0: 4, lon0: -73, k0: 0.9992, fe: 5000000, fn: 2000000 } },
    { id: 3116, name: 'MAGNA-SIRGAS Bogotá', short: 'Bogotá', kind: 'proj', tm: { ...BOGOTA, lon0: -74.07750791666666 } },
    { id: 3115, name: 'MAGNA-SIRGAS Oeste', short: 'Oeste', kind: 'proj', tm: { ...BOGOTA, lon0: -77.07750791666666 } },
    { id: 3114, name: 'MAGNA-SIRGAS Oeste-Oeste', short: 'Oeste-Oeste', kind: 'proj', tm: { ...BOGOTA, lon0: -80.07750791666666 } },
    { id: 3117, name: 'MAGNA-SIRGAS Este Central', short: 'Este Central', kind: 'proj', tm: { ...BOGOTA, lon0: -71.07750791666666 } },
    { id: 3118, name: 'MAGNA-SIRGAS Este-Este', short: 'Este-Este', kind: 'proj', tm: { ...BOGOTA, lon0: -68.07750791666666 } }
  ];
  CRS.forEach(c => { if (c.tm) c.proj = makeTM(c.tm); });
  const byId = id => CRS.find(c => c.id === Number(id));

  /** lat/lon (WGS84/MAGNA) -> [a, b] en el CRS. Geográficos: [lat, lon]; planos: [Este, Norte]. */
  function fromLatLon(id, lat, lon) {
    const c = byId(id);
    return c.kind === 'geo' ? [lat, lon] : c.proj.fwd(lat, lon);
  }
  /** [a, b] en el CRS -> [lat, lon]. */
  function toLatLon(id, a, b) {
    const c = byId(id);
    return c.kind === 'geo' ? [a, b] : c.proj.inv(a, b);
  }
  /** Zona de 5 orígenes cuyo meridiano central es el más cercano. */
  function suggestZone(lon) {
    let best = null, d = 1e9;
    for (const c of CRS) {
      if (c.kind !== 'proj' || c.id === 9377) continue;
      const dd = Math.abs(lon - c.tm.lon0);
      if (dd < d) { d = dd; best = c; }
    }
    return best.id;
  }

  /** Acepta decimal (4.5962, -74,0775), con hemisferio (N/S/E/W/O) o DMS (4°35'46.3"). NaN si no es válido. */
  function parseAngle(str, isLat) {
    if (typeof str === 'number') return str;
    let s = String(str == null ? '' : str).trim().toUpperCase();
    if (!s) return NaN;
    if (s.indexOf('.') < 0) s = s.replace(',', '.');
    let neg = /[SWO]/.test(s) || /^\s*-/.test(s);
    const nums = s.match(/\d+(?:\.\d+)?/g);
    if (!nums || nums.length > 3) return NaN;
    const [d, m = 0, sec = 0] = nums.map(Number);
    if (m >= 60 || sec >= 60) return NaN;
    let v = d + m / 60 + sec / 3600;
    if (neg) v = -v;
    const lim = isLat ? 90 : 180;
    return Math.abs(v) <= lim ? v : NaN;
  }
  function parsePlane(str) {
    if (typeof str === 'number') return str;
    let s = String(str == null ? '' : str).trim().replace(/\s+/g, '');
    if (!s) return NaN;
    if (s.indexOf('.') < 0) s = s.replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }

  function dms(v, pos, neg) {
    const h = v < 0 ? neg : pos; v = Math.abs(v);
    let d = Math.floor(v), m = Math.floor((v - d) * 60), s = ((v - d) * 60 - m) * 60;
    if (s >= 59.9995) { s = 0; m++; } if (m >= 60) { m = 0; d++; }
    return `${d}°${String(m).padStart(2, '0')}'${s.toFixed(3).padStart(6, '0')}"${h}`;
  }
  const fmtLat = (v, dp = 6) => `${Math.abs(v).toFixed(dp)}° ${v < 0 ? 'S' : 'N'}`;
  const fmtLon = (v, dp = 6) => `${Math.abs(v).toFixed(dp)}° ${v < 0 ? 'O' : 'E'}`;

  /** Líneas de texto legibles para unas coordenadas en un CRS. */
  function describe(id, lat, lon) {
    const c = byId(id);
    if (c.kind === 'geo') return { label: `EPSG:${c.id}`, text: `${fmtLat(lat)}  ${fmtLon(lon)}`, a: lat, b: lon };
    const [e, n] = c.proj.fwd(lat, lon);
    return { label: `EPSG:${c.id}`, text: `E ${e.toFixed(2)}  N ${n.toFixed(2)}`, a: e, b: n };
  }
  const inColombia = (lat, lon) => lat > -5 && lat < 14 && lon > -82.5 && lon < -66;

  root.Geo = { CRS, byId, fromLatLon, toLatLon, suggestZone, parseAngle, parsePlane, dms, fmtLat, fmtLon, describe, inColombia };
  if (typeof module !== 'undefined') module.exports = root.Geo;
})(typeof self !== 'undefined' ? self : globalThis);
