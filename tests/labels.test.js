'use strict';

// Her tray menu speaks every language she does, and every voice engine and window she has a line for in each
// (a missing line is an empty item in the menu).
//   node --test tests/labels.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { TRAY, LANGS } = require('../src/main/labels.js');
const tts = require('../src/main/tts.js');

test('she speaks Russian, English and French', async () => {
  const path = require('node:path');
  const { pathToFileURL } = require('node:url');
  assert.deepEqual(LANGS, ['ru', 'en', 'fr']);
  assert.deepEqual(Object.keys(TRAY).sort(), ['en', 'fr', 'ru']);
  globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {} });
  const lines = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'renderer', 'js', 'lines.js')).href);
  assert.deepEqual(Object.keys(lines.LINES).sort(), ['en', 'fr', 'ru'], 'her lines');
  for (const assistant of ['claude', 'codex', 'agy']) {
    assert.deepEqual(Object.keys(lines.linesFor('ru', assistant)), Object.keys(lines.linesFor('en', assistant)), `${assistant}: the same lines in both`);
    assert.deepEqual(Object.keys(lines.linesFor('fr', assistant)), Object.keys(lines.linesFor('en', assistant)), `${assistant}: the same lines in French`);
  }
  assert.match(lines.linesFor('ru', 'codex').welcome.connect, /Codex/);
  assert.match(lines.linesFor('en', 'agy').welcome.restart, /Antigravity/);
  // the demo session and the voices she asks the system for
  const demo = require('../scripts/demo-sequence.js');
  assert.notDeepEqual(demo('fr'), demo('en'), 'the French demo');
  assert.notDeepEqual(demo('ru'), demo('en'));
  const speech = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'renderer', 'js', 'speech.js')).href);
  assert.equal(typeof speech.speakable, 'function');
  const fs = require('node:fs');
  const files = ['piper.js', 'tune.js', 'config.js'].map((f) => fs.readFileSync(path.join(__dirname, '..', 'src', 'main', f), 'utf8')).join('\n');
  assert.match(files, /\bfr:/, 'French voice support');
});

test('every voice engine has its name in the tray menu, in every language', () => {
  for (const lang of LANGS) {
    for (const engine of Object.keys(tts.ENGINES)) {
      assert.ok(TRAY[lang].engines[engine], `${lang}: no line for the voice engine "${engine}"`);
    }
  }
});

test('the preparation and the main menu are in the tray menu, in every language', () => {
  for (const lang of LANGS) {
    assert.ok(TRAY[lang].prepare, `${lang}: prepare`);
    assert.ok(TRAY[lang].hub, `${lang}: hub`);
  }
});

test('her voice engines in the ring menu and in her guide (lines-life.js) have their names too', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'js', 'lines-life.js'), 'utf8');
  const blocks = [...src.matchAll(/engines: \{ system: [^}]*\}/g)].map((m) => m[0]);
  assert.ok(blocks.length >= 4, 'the engine lists');
  for (const b of blocks) for (const engine of Object.keys(tts.ENGINES)) assert.match(b, new RegExp(`${engine}:`), `${engine} in ${b.slice(0, 60)}`);
});
