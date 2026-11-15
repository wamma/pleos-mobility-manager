import test from 'node:test';
import assert from 'node:assert/strict';
import { formatClock, inputClock, upperBound } from '../src/format.js';
test('round total minutes before extracting clock units',()=>{
  assert.equal(formatClock(1199.96),'20:00');
  assert.equal(formatClock(1439.9),'다음날 00:00');
  assert.equal(formatClock(2880),'2일 후 00:00');
});
test('same-day time inputs never contain next-day prose or invalid clocks',()=>{
  assert.equal(inputClock(1439.9),'23:59');
  assert.equal(inputClock(1440),'');
  assert.equal(inputClock(null),'');
});
test('upper bounds are rounded down so displayed advice remains feasible',()=>{
  assert.equal(upperBound(1.26),'1.2');
  assert.equal(upperBound(5.333333),'5.3');
});
