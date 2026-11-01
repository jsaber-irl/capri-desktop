import test from 'node:test';
import assert from 'node:assert/strict';
import { NEUTRAL } from '../src/renderer/js/acting.js';

test('neutral sprite pose always provides a finite body bend', () => {
  assert.equal(NEUTRAL.bend, 0);
  assert.ok(Number.isFinite(NEUTRAL.bend));
});
