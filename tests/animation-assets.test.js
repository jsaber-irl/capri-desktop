'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('every named Capri animation image exists with exact path casing', () => {
  const source = fs.readFileSync(path.join(root, 'src/renderer/js/app.js'), 'utf8');
  assert.ok(fs.existsSync(path.join(root, 'assets/capri/capri-full.png')));
  const cutins = source.match(/const CUTINS = \[([^\]]+)\]/)?.[1] || '';
  const names = [...cutins.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.ok(names.length > 0);
  for (const name of names) assert.ok(fs.existsSync(path.join(root, 'assets/capri', `cutin-${name}.png`)), `missing cutin-${name}.png`);
  const fx = fs.readFileSync(path.join(root, 'src/renderer/js/fx.js'), 'utf8');
  const frames = fx.match(/export const GRAB_FRAMES = \[([^\]]+)\]/)?.[1] || '';
  for (const match of frames.matchAll(/'([^']+)'/g)) assert.ok(fs.existsSync(path.join(root, 'assets/capri', `intro-${match[1]}.webp`)), `missing intro-${match[1]}.webp`);
  assert.match(source, /Animation image failed to load/);
  assert.match(source, /cutins\[i\] \|\| cutins\[0\]/);
});
