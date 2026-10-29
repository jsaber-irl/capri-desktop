'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createFarewell, farewellCaption } = require('../src/main/farewell');
const { TRAY, LANGS } = require('../src/main/labels');

test('farewell caption uses only a real configured name and safely falls back', () => {
  assert.equal(farewellCaption(' Camille '), 'Bye bye Camille');
  for (const name of ['', '   ', null, undefined, 'null', 'undefined', 'unknown', 'user', 'utilisateur']) {
    assert.equal(farewellCaption(name), 'Bye bye');
  }
  assert.equal(farewellCaption('a'.repeat(100)), `Bye bye ${'a'.repeat(40)}`);
});

test('farewell is one-shot, waits for completion, and has a quit fallback', () => {
  let command;
  let quitCount = 0;
  let fallback;
  let cleared;
  const flow = createFarewell({
    sendCommand: (...args) => { command = args; },
    quit: () => { quitCount += 1; },
    getUserName: () => 'Camille',
    setTimer: (fn, delay) => { fallback = { fn, delay }; return fallback; },
    clearTimer: (timer) => { cleared = timer; },
    timeout: 12000,
  });

  assert.equal(flow.start(), true);
  assert.deepEqual(command, ['farewell', { caption: 'Bye bye Camille' }]);
  assert.equal(fallback.delay, 12000);
  assert.equal(quitCount, 0, 'the application remains open during the animation');
  assert.equal(flow.start(), false, 'double activation is ignored');
  fallback.fn();
  assert.equal(quitCount, 1, 'fallback quits if the renderer never reports completion');
  assert.equal(flow.finish(), false, 'a finished farewell does not quit twice');
  assert.equal(cleared, fallback);
  assert.equal(quitCount, 1);
});

test('normal farewell completion cancels the fallback and quits exactly once', () => {
  let quitCount = 0;
  let callback;
  let cleared = 0;
  const flow = createFarewell({
    sendCommand() {},
    quit: () => { quitCount += 1; },
    getUserName: () => '',
    setTimer: (fn) => { callback = fn; return 1; },
    clearTimer: (id) => { assert.equal(id, 1); cleared += 1; },
  });
  flow.start();
  assert.equal(flow.finish(), true);
  assert.equal(quitCount, 1);
  assert.equal(cleared, 1);
  callback();
  assert.equal(quitCount, 1);
  assert.equal(flow.finish(), false);
});

test('localized farewell menu item follows a separator and immediately precedes Quit', () => {
  for (const lang of LANGS) assert.ok(TRAY[lang].farewell);
  assert.equal(TRAY.fr.farewell, 'Dire au revoir à Capri');
  const main = fs.readFileSync(path.join(__dirname, '../src/main/main.js'), 'utf8');
  const separator = main.indexOf("{ type: 'separator' },\n    { label: t.farewell");
  const farewell = main.indexOf("{ label: t.farewell, click: () => { if (!config.load().visible) toggleVisible(true); farewell.start(); } }");
  const quit = main.indexOf("{ label: t.quit, click: () => app.quit() }");
  assert.ok(separator >= 0 && separator < farewell && farewell < quit, 'separator, farewell, quit order');
  assert.match(main, /farewell\.finish\(\)/);
  const renderer = fs.readFileSync(path.join(__dirname, '../src/renderer/js/app.js'), 'utf8');
  const command = renderer.indexOf("case 'farewell':");
  const animation = renderer.indexOf("await capri.intro(capri.spot('post'), { label: 'hi', caption });", command);
  const acknowledgement = renderer.indexOf('host.farewellDone();', animation);
  assert.ok(command < animation && animation < acknowledgement, 'the renderer acknowledges completion after reusing the intro');
});
