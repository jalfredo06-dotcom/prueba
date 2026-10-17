const assert = require('assert');
const G = require('../js/geo.js');
const near = (a, b, t, m) => assert.ok(Math.abs(a - b) < t, `${m}: ${a} vs ${b}`);

// Orígenes de proyección -> falso este/norte
let [e, n] = G.fromLatLon(9377, 4, -73); near(e, 5000000, 1e-4, '9377 E'); near(n, 2000000, 1e-4, '9377 N');
[e, n] = G.fromLatLon(3116, 4.596200417, -74.07750791666666); near(e, 1e6, 1e-4, '3116 E'); near(n, 1e6, 1e-4, '3116 N');
[e, n] = G.fromLatLon(3117, 4.596200417, -71.07750791666666); near(e, 1e6, 1e-4, '3117 E');

// Ida y vuelta en todo el país y todos los sistemas
for (const c of G.CRS) for (const [lat, lon] of [[4.6, -74.08], [11.2, -74.2], [1.2, -77.3], [-4.2, -69.9], [6.25, -75.57], [12.5, -81.7]]) {
  const [a, b] = G.fromLatLon(c.id, lat, lon);
  const [la, lo] = G.toLatLon(c.id, a, b);
  near(la, lat, 1e-9, `rt lat ${c.id}`); near(lo, lon, 1e-9, `rt lon ${c.id}`);
}
// Valor de referencia conocido: Plaza de Bolívar (Bogotá) ≈ 4.5981 N, -74.0760 O -> ~ (1000000+~170, ~1000000+~... ) en 3116
[e, n] = G.fromLatLon(3116, 4.598056, -74.075833);
near(e, 1000000 + 186.5, 5, '3116 E plaza'); near(n, 1000000 + 205.2, 1, '3116 N plaza');

// Parseo
near(G.parseAngle('4°35\'46.32"N', true), 4 + 35 / 60 + 46.32 / 3600, 1e-9, 'dms');
near(G.parseAngle('74°4\'39"W', false), -(74 + 4 / 60 + 39 / 3600), 1e-9, 'dms W');
near(G.parseAngle('-74,0775', false), -74.0775, 1e-12, 'coma');
assert.ok(isNaN(G.parseAngle('abc', true))); assert.ok(isNaN(G.parseAngle('95', true)));
near(G.parsePlane('1 000 123,45'), 1000123.45, 1e-9, 'plane');
assert.equal(G.suggestZone(-74.1), 3116); assert.equal(G.suggestZone(-77.5), 3115);
console.log('geo OK');
