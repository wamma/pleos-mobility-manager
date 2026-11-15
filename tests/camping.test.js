import test from 'node:test';
import assert from 'node:assert/strict';
import { forecast, advanceCamp, campAlternatives } from '../src/camping.js';
const fixture = () => ({ battery: 60, capacity: 60, hours: 8, rate: 1, reserve: 20 });
test('uses kW × hours and kWh capacity with explicit reserve', () => {
  const r = forecast(fixture()); assert.equal(r.departureKwh, 28); assert.equal(r.margin, 8);
  assert.ok(Math.abs(r.departurePercent - 46.6666666667) < 1e-8);
});
test('increased draw reduces forecast and offers recalculable alternatives', () => {
  const input = { ...fixture(), rate: 3 }; const r = forecast(input);
  assert.equal(r.departureKwh, 12); assert.equal(r.margin, -8);
  const options = campAlternatives(input); assert.equal(options.length, 2);
  for (const p of options) assert.ok(forecast(p.input).margin >= -1e-8);
});
test('time advance consumes energy while keeping same constant-rate departure projection', () => {
  const n = advanceCamp(fixture(), 2); assert.equal(n.battery, 100 * 34 / 60); assert.equal(n.hours, 6);
  assert.equal(forecast(n).departureKwh, 28);
});
test('unknown/negative fields are not converted to zero', () => {
  for (const v of [null, undefined, NaN, -1]) assert.equal(forecast({ ...fixture(), rate: v }).status, 'unknown');
  assert.equal(forecast({ ...fixture(), capacity: 0 }).status, 'unknown');
  assert.throws(() => advanceCamp(fixture(), 9));
});
test('already below reserve offers no false feasible alternative', () => {
  assert.deepEqual(campAlternatives({ ...fixture(), reserve: 40 }), []);
});
test('exhaustion is explicit rather than displaying negative battery percent', () => {
  const r = forecast({ ...fixture(), rate: 8 }); assert.equal(r.status, 'shortfall');
  assert.equal(r.departurePercent, 0); assert.equal(r.depleted, true);
});
