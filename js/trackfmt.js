/* Formatos de un track GPS: estadísticas, CSV, GPX 1.1 y KML. Funciones puras (sin DOM). */
(function (root) {
  'use strict';
  const G = root.Geo || (typeof require !== 'undefined' ? require('./geo.js') : null);
  const p2 = (n) => String(n).padStart(2, '0');
  const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
  const hms = (t) => { const d = new Date(t); return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
  const iso = (t) => new Date(t).toISOString();
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]));
  const num = (v, d) => (v == null || isNaN(v) ? '' : Number(v).toFixed(d));
  const seg = (p) => p.s || 0;

  function hav(a, b) {
    const R = 6371008.8, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function stats(tr) {
    const pts = tr.points || [];
    let dist = 0;
    for (let i = 1; i < pts.length; i++) if (seg(pts[i]) === seg(pts[i - 1])) dist += hav(pts[i - 1], pts[i]);
    const t0 = pts.length ? pts[0].t : tr.start, t1 = pts.length ? pts[pts.length - 1].t : (tr.end || tr.start);
    return { dist, count: pts.length, dur: t1 - t0, segs: new Set(pts.map(seg)).size };
  }
  const segments = (tr) => {
    const out = [];
    for (const p of tr.points || []) { const k = seg(p); (out[k] = out[k] || []).push(p); }
    return out.filter(Boolean);
  };

  /** CSV con fecha (AAAA-MM-DD) y hora local (HH:MM:SS) por punto. Coordenadas planas en el EPSG indicado (por defecto 9377). */
  function toCsv(tr, crsId) {
    let id = Number(crsId) || 9377;
    if (G.byId(id).kind === 'geo') id = 9377;
    const head = ['n', 'fecha', 'hora', 'latitud', 'longitud', 'altitud_m', 'precision_m', 'segmento', `este_epsg${id}`, `norte_epsg${id}`, 'fecha_hora_utc'];
    const rows = [head.join(',')];
    (tr.points || []).forEach((p, i) => {
      const [e, n] = G.fromLatLon(id, p.lat, p.lon);
      rows.push([i + 1, ymd(p.t), hms(p.t), p.lat.toFixed(7), p.lon.toFixed(7), num(p.alt, 1), num(p.acc, 1), seg(p) + 1, e.toFixed(2), n.toFixed(2), iso(p.t)].join(','));
    });
    return '\ufeff' + rows.join('\r\n') + '\r\n';
  }

  /** wpts: [{ lat, lon, alt, t, name, desc }] (opcional). */
  function toGpx(tr, wpts) {
    const o = ['<?xml version="1.0" encoding="UTF-8"?>',
      '<gpx version="1.1" creator="Libreta de campo" xmlns="http://www.topografix.com/GPX/1/1">',
      `<metadata><name>${esc(tr.name)}</name><time>${iso(tr.start)}</time></metadata>`];
    for (const w of wpts || []) {
      o.push(`<wpt lat="${w.lat.toFixed(8)}" lon="${w.lon.toFixed(8)}">${w.alt != null && !isNaN(w.alt) ? `<ele>${Number(w.alt).toFixed(1)}</ele>` : ''}<time>${iso(w.t)}</time><name>${esc(w.name)}</name>${w.desc ? `<desc>${esc(w.desc)}</desc>` : ''}</wpt>`);
    }
    o.push(`<trk><name>${esc(tr.name)}</name>`);
    for (const s of segments(tr)) {
      o.push('<trkseg>');
      for (const p of s) o.push(`<trkpt lat="${p.lat.toFixed(8)}" lon="${p.lon.toFixed(8)}">${p.alt != null && !isNaN(p.alt) ? `<ele>${Number(p.alt).toFixed(1)}</ele>` : ''}<time>${iso(p.t)}</time></trkpt>`);
      o.push('</trkseg>');
    }
    o.push('</trk></gpx>');
    return o.join('\n');
  }

  function toKml(tr, wpts) {
    const st = stats(tr), pts = tr.points || [];
    const coord = (p) => `${p.lon.toFixed(8)},${p.lat.toFixed(8)},${p.alt != null && !isNaN(p.alt) ? Number(p.alt).toFixed(1) : 0}`;
    const pin = (name, desc, p, t) => `<Placemark><name>${esc(name)}</name>${desc ? `<description>${esc(desc)}</description>` : ''}${t ? `<TimeStamp><when>${iso(t)}</when></TimeStamp>` : ''}<Point><coordinates>${coord(p)}</coordinates></Point></Placemark>`;
    const o = ['<?xml version="1.0" encoding="UTF-8"?>', '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
      `<name>${esc(tr.name)}</name>`,
      '<Style id="trk"><LineStyle><color>ff2a64e0</color><width>4</width></LineStyle></Style>'];
    if (pts.length) {
      const lines = segments(tr).map(s => `<LineString><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><coordinates>${s.map(coord).join(' ')}</coordinates></LineString>`).join('');
      o.push(`<Placemark><name>${esc(tr.name)}</name><description>${esc(`${(st.dist / 1000).toFixed(2)} km · ${st.count} puntos · ${ymd(pts[0].t)} ${hms(pts[0].t)}–${hms(pts[pts.length - 1].t)}`)}</description><styleUrl>#trk</styleUrl><TimeSpan><begin>${iso(pts[0].t)}</begin><end>${iso(pts[pts.length - 1].t)}</end></TimeSpan><MultiGeometry>${lines}</MultiGeometry></Placemark>`);
      o.push(pin('Inicio', `${ymd(pts[0].t)} ${hms(pts[0].t)}`, pts[0], pts[0].t));
      o.push(pin('Fin', `${ymd(pts[pts.length - 1].t)} ${hms(pts[pts.length - 1].t)}`, pts[pts.length - 1], pts[pts.length - 1].t));
    }
    for (const w of wpts || []) o.push(pin(w.name, w.desc, w, w.t));
    o.push('</Document></kml>');
    return o.join('\n');
  }

  root.TrackFmt = { stats, toCsv, toGpx, toKml, ymd, hms, hav };
  if (typeof module !== 'undefined') module.exports = root.TrackFmt;
})(typeof self !== 'undefined' ? self : globalThis);
