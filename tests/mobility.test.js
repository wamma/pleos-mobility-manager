import test from 'node:test';
import assert from 'node:assert/strict';
import { planTrip, visitTask, completeTask } from '../src/mobility.js';

export const fixture = () => ({ start: 1080, deadline: 1260, battery: 30, capacity: 60, reserve: 5, consumption: 0.2, travelMinutes: 10, speed: 30,
  tasks: [
    { id: 'laundry', name: '세탁물', priority: 3, open: 540, close: 1170, dwell: 10, chargeKw: 0 },
    { id: 'shop', name: '장보기', priority: 2, open: 540, close: 1320, dwell: 30, chargeKw: 0 },
    { id: 'charge', name: '충전', priority: 1, open: 0, close: 1440, dwell: 20, chargeKw: 30 },
  ] });

test('full trip meets windows and returns home with reserve', () => {
  const r = planTrip(fixture()); assert.equal(r.status, 'feasible');
  assert.equal(r.plan.homeAt, 1180); assert.equal(r.plan.energy, 24);
  assert.equal(r.plan.stops.length, 3);
});
test('deadline failure offers subsets without silently editing requested tasks', () => {
  const input = fixture(); input.deadline = 1130;
  const r = planTrip(input); assert.equal(r.status, 'infeasible');
  assert.equal(input.tasks.length, 3); assert.ok(r.alternatives.length);
  assert.ok(r.alternatives.every(p => p.homeAt <= 1130 && p.excluded.length > 0));
});
test('cannot spend charge gained at a charger before reaching it', () => {
  const input = fixture(); input.battery = 1;
  assert.equal(planTrip(input).status, 'infeasible');
});
test('delay recalculates closing time feasibility', () => {
  const input = fixture(); input.start = 1160;
  const r = planTrip(input); assert.equal(r.status, 'infeasible');
  assert.ok(r.reasons.some(x => x.includes('운영시간')));
});
test('arrival does not complete a task; explicit completion is required', () => {
  const s = visitTask({}, 'shop'); assert.equal(s.shop, 'visited');
  assert.equal(completeTask(s, 'shop').shop, 'completed');
  assert.throws(() => completeTask({}, 'shop'));
});
test('unknown inputs and invalid windows cannot produce a feasible result', () => {
  for (const battery of [null, NaN, -1, 101]) assert.equal(planTrip({ ...fixture(), battery }).status, 'unknown');
  const input = fixture(); input.tasks[0].close = 1;
  assert.equal(planTrip(input).status, 'unknown');
});
test('charging is capacity limited', () => {
  const input = fixture(); input.battery = 100;
  const r = planTrip(input); assert.ok(r.plan.energy <= 60);
});
test('replanning from an already visited first stop does not travel there again', () => {
  const input = fixture(); input.tasks = [input.tasks[0]];
  input.start = 1090; input.atTask = 'laundry'; input.battery = 100*17/60;
  const r = planTrip(input);
  assert.equal(r.plan.homeAt, 1110); assert.equal(r.plan.energy, 16);
});
