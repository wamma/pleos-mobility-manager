import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession, transition } from '../src/troubleshooter.js';
const queried = () => transition(newSession(), { type: 'query', value: 'off' });
test('decline records refusal without requesting or resolving', () => {
  const r = transition(queried(), { type: 'decline' }); assert.equal(r.stage, 'declined'); assert.equal(r.resolved, false);
});
test('manual action acceptance does not imply observed change or resolution', () => {
  const r = transition(queried(), { type: 'approve' }); assert.equal(r.stage, 'awaiting-observation');
  assert.equal(r.after, null); assert.equal(r.resolved, false);
  assert.throws(() => transition(r, { type: 'feedback', clear: true }));
});
test('observed on state can remain subjectively unresolved', () => {
  let r = transition(queried(), { type: 'approve' }); r = transition(r, { type: 'observe', value: 'on' });
  r = transition(r, { type: 'feedback', clear: false }); assert.equal(r.stage, 'unresolved'); assert.equal(r.after, 'on'); assert.equal(r.resolved, false);
});
test('unknown observation is preserved even if user reports clear visibility', () => {
  let r = transition(newSession(), { type: 'query', value: null });
  r = transition(r, { type: 'approve' }); r = transition(r, { type: 'observe', value: null });
  r = transition(r, { type: 'feedback', clear: true }); assert.equal(r.stage, 'user-confirmed'); assert.equal(r.after, null);
});
test('out of order and invalid events rejected', () => {
  assert.throws(() => transition(newSession(), { type: 'approve' }));
  assert.throws(() => transition(newSession(), { type: 'query', value: 'garbage' }));
});
