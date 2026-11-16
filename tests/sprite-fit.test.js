import test from 'node:test';
import assert from 'node:assert/strict';
import { fitSpriteScale, SPRITE } from '../src/renderer/js/sprite.js';

test('sprite keeps the configured scale when the work area is tall enough', () => {
  assert.equal(fitSpriteScale(0.8, 900), 0.8);
});

test('sprite scale is reduced to keep its full height and margins on short work areas', () => {
  const floor = 220;
  const scale = fitSpriteScale(0.8, floor);
  assert.ok(scale > 0);
  assert.ok(scale < 0.8);
  assert.ok(SPRITE.height * scale + 12 <= floor);
});

test('invalid viewport values fall back to a finite safe scale', () => {
  assert.ok(Number.isFinite(fitSpriteScale(0.8, Number.NaN)));
  assert.ok(Number.isFinite(fitSpriteScale(Number.NaN, 900)));
});
