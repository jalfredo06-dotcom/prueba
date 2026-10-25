const assert = require('assert');
global.Geo = require('../js/geo.js');
const T = require('../js/trackfmt.js');
const t0 = new Date(2026, 9, 25, 14, 3, 7).getTime();
const tr = { name: 'Prueba <&>', start: t0, points: [
  { t: t0, lat: 4.6, lon: -74.08, alt: 2600, acc: 5, s: 0 },
  { t: t0 + 5000, lat: 4.6009, lon: -74.08, alt: 2601.5, acc: 6, s: 0 },
  { t: t0 + 100000, lat: 4.61, lon: -74.07, alt: null, acc: 8, s: 1 }] };
const st = T.stats(tr);
assert.ok(Math.abs(st.dist - 99.6) < 1, 'distancia ~100 m (' + st.dist + ')'); assert.equal(st.count, 3); assert.equal(st.segs, 2);
const csv = T.toCsv(tr, 9377).replace('\ufeff', '').split('\r\n');
assert.equal(csv[0].split(',')[1], 'fecha'); assert.equal(csv[0].split(',')[2], 'hora');
const r1 = csv[1].split(','); assert.equal(r1[1], '2026-10-25'); assert.equal(r1[2], '14:03:07');
assert.match(csv[2].split(',')[2], /^\d\d:\d\d:\d\d$/); assert.equal(csv[2].split(',')[2], '14:03:12');
assert.equal(csv[3].split(',')[5], ''); assert.equal(csv[3].split(',')[7], '2');
assert.equal(T.toCsv(tr, 4326).split('\r\n')[0].includes('este_epsg9377'), true);
const gpx = T.toGpx(tr, [{ lat: 4.6, lon: -74.08, t: t0, name: 'Foto', desc: 'nota' }]);
assert.equal((gpx.match(/<trkseg>/g) || []).length, 2); assert.equal((gpx.match(/<trkpt /g) || []).length, 3);
assert.ok(gpx.indexOf('<wpt') < gpx.indexOf('<trk>')); assert.ok(gpx.includes('Prueba &lt;&amp;&gt;'));
assert.ok(/<time>\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z<\/time>/.test(gpx));
const kml = T.toKml(tr, []); assert.ok(kml.includes('<LineString>') && kml.includes('<name>Inicio</name>'));
console.log('trackfmt OK');
