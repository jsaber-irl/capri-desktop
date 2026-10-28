'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const load = (file) => import(pathToFileURL(path.join(__dirname, '..', 'src', 'renderer', 'js', file)).href);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('fast and excluded requests never start the satellite animation', async () => {
  const { createSatelliteWait } = await load('satellite-wait.js');
  let starts = 0;
  let stops = 0;
  const wait = createSatelliteWait({ delay: 30, onStart: () => starts++, onStop: () => stops++ });
  assert.equal(await wait.run(async () => { await delay(5); return 'fast'; }), 'fast');
  assert.equal(await wait.run(async () => 'app', { excluded: true }), 'app');
  await delay(35);
  assert.equal(starts, 0);
  assert.equal(stops, 0);
});

test('a response delivered exactly at the threshold does not start the animation', async () => {
  const { createSatelliteWait } = await load('satellite-wait.js');
  let starts = 0;
  const timeout = 30;
  const wait = createSatelliteWait({ delay: timeout, onStart: () => starts++ });
  await wait.run(() => new Promise((resolve) => setTimeout(() => resolve('at threshold'), timeout)));
  assert.equal(starts, 0);
});

test('a slow request shows one shared animation, keeps it active, and stops on completion', async () => {
  const { createSatelliteWait } = await load('satellite-wait.js');
  const events = [];
  const wait = createSatelliteWait({ delay: 15, onStart: () => events.push('start'), onStop: () => events.push('stop') });
  const result = await wait.run(async () => { await delay(35); assert.equal(wait.active, true); return 'answer'; });
  assert.equal(result, 'answer');
  assert.deepEqual(events, ['start', 'stop']);
  assert.equal(wait.active, false);
});

test('overlapping slow requests do not duplicate or prematurely stop the animation', async () => {
  const { createSatelliteWait } = await load('satellite-wait.js');
  const events = [];
  const wait = createSatelliteWait({ delay: 10, onStart: () => events.push('start'), onStop: () => events.push('stop') });
  const first = wait.run(() => delay(35));
  const second = wait.run(() => delay(55));
  await Promise.all([first, second]);
  assert.deepEqual(events, ['start', 'stop']);
});

test('failed requests stop the animation and rethrow the usual error', async () => {
  const { createSatelliteWait } = await load('satellite-wait.js');
  const events = [];
  const wait = createSatelliteWait({ delay: 10, onStart: () => events.push('start'), onStop: () => events.push('stop') });
  await assert.rejects(wait.run(async () => { await delay(20); throw new Error('network lost'); }), /network lost/);
  assert.deepEqual(events, ['start', 'stop']);
});

test('the first streamed answer chunk stops the animation even while the request promise is still resolving', async () => {
  const { createSatelliteWait } = await load('satellite-wait.js');
  const events = [];
  const wait = createSatelliteWait({ delay: 10, onStart: () => events.push('start'), onStop: () => events.push('stop') });
  let finish;
  const pending = wait.run(() => new Promise((resolve) => { finish = resolve; }), { id: 42 });
  await delay(20);
  assert.equal(wait.active, true);
  assert.equal(wait.response(42), true);
  assert.deepEqual(events, ['start', 'stop']);
  assert.equal(wait.active, false);
  finish('stream completed');
  assert.equal(await pending, 'stream completed');
});

test('CapriSatelliteTest uses the managed request and verifies the visible dialog, loader and animation', async () => {
  const [{ createSatelliteWait }, { CapriSatelliteTest }] = await Promise.all([load('satellite-wait.js'), load('capri-satellite-test.js')]);
  let visible = false;
  let animating = false;
  const logs = [];
  const panel = {
    current: null,
    say(message) { this.last = message; return true; },
    hide() { this.current = null; },
    setSatelliteWait(on) { visible = on; },
    get satelliteWaitVisible() { return visible; },
    satelliteWaitText() { return 'Zut Night City Connexion au satellite...'; },
    hideSatelliteWait() { visible = false; },
  };
  const manager = createSatelliteWait({ delay: 20, onStart: () => { animating = true; panel.setSatelliteWait(true); }, onStop: () => { animating = false; panel.setSatelliteWait(false); } });
  const chat = { runManagedRequest: (fn) => manager.run(fn) };
  const demo = new CapriSatelliteTest({ chat, panel, log: (line) => logs.push(line), duration: 250, threshold: 20, isAnimating: () => animating });
  const result = await demo.run();
  assert.equal(result.ok, true);
  assert.equal(animating, false);
  assert.match(panel.last.line, /réponse de démonstration est arrivée/);
  assert.ok(logs.some((line) => line.includes('Animation satellite déclenchée')));
  assert.ok(logs.some((line) => line.includes('Réception de la réponse')));
});

test('the demo script sequence runs CapriSatelliteTest after every prior demo step', () => {
  const steps = require('../scripts/demo-sequence')('fr');
  assert.equal(steps.at(-1)[1].hook_event_name, 'CapriSatelliteTest');
  assert.equal(steps.at(-2)[1].hook_event_name, 'CapriShowcase');
});
