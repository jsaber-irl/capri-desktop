'use strict';

// Tests des nouvelles commandes terminal Capri :
//   /pc info, /pc react, /remind, /cancel (et leurs alias français /rappelle-moi, /annule)
//   node --test tests/terminal-new.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTerminal } = require('../src/main/terminal');

test('/pc info reads hardware and reports it', async () => {
  let lookCalled = 0;
  const terminal = createTerminal({
    lookAtPc: async () => {
      lookCalled += 1;
      return {
        os: { platform: 'darwin', arch: 'arm64', release: '24.0.0' },
        cpu: { name: 'Apple M2 Pro', cores: 12, threads: 12 },
        ram: 32 * 1024 ** 3, ramFree: 8 * 1024 ** 3,
        gpu: { name: 'Apple M2 Pro', vram: 16 * 1024 ** 3 },
        disk: { free: 200 * 1024 ** 3, total: 500 * 1024 ** 3 },
      };
    },
  });

  const res = await terminal.execute('/pc info');
  assert.equal(res.kind, 'result');
  assert.equal(lookCalled, 1);
  assert.ok(res.lines.some((l) => l.includes('platform: darwin')));
  assert.ok(res.lines.some((l) => l.includes('Apple M2 Pro')));
  assert.ok(res.lines.some((l) => l.includes('GB free')));
});

test('/pc info errors when lookAtPc is missing', async () => {
  const terminal = createTerminal({});
  const res = await terminal.execute('/pc info');
  assert.equal(res.kind, 'error');
});

test('/pc react toggles and reports state', async () => {
  let current = true;
  const toggles = [];
  const terminal = createTerminal({
    pcReact: async () => current,
    setPcReact: async (value) => { current = value; toggles.push(value); },
  });

  const off = await terminal.execute('/pc react');
  assert.equal(off.kind, 'response');
  assert.ok(off.lines.some((l) => /désactivées|off/i.test(l)));
  assert.deepEqual(toggles, [false]);

  const on = await terminal.execute('/pc react');
  assert.equal(on.kind, 'response');
  assert.ok(on.lines.some((l) => /activées|on/i.test(l)));
  assert.deepEqual(toggles, [false, true]);
});

test('/pc react errors when pcReact is missing', async () => {
  const terminal = createTerminal({});
  const res = await terminal.execute('/pc react');
  assert.equal(res.kind, 'error');
});

test('/pc unknown subcommand errors', async () => {
  const terminal = createTerminal({ lookAtPc: async () => ({}) });
  const res = await terminal.execute('/pc frobnicate');
  assert.equal(res.kind, 'error');
});

test('/remind creates a reminder and reports it', async () => {
  const added = [];
  const terminal = createTerminal({
    reminders: {
      add: (at, text) => { added.push({ at, text }); return { id: 'x', at, text, made: null }; },
    },
  });

  const res = await terminal.execute('/remind dans 20 min de sortir la pizza');
  assert.equal(res.kind, 'response');
  assert.equal(added.length, 1);
  assert.equal(added[0].text, 'sortir la pizza');
  assert.ok(added[0].at > Date.now() - 1000);
  assert.match(res.lines.join(' '), /sortir la pizza/);
});

test('/remind without text errors', async () => {
  const terminal = createTerminal({ reminders: { add: () => {} } });
  const res = await terminal.execute('/remind');
  assert.equal(res.kind, 'error');
});

test('/remind when reminders missing errors', async () => {
  const terminal = createTerminal({});
  const res = await terminal.execute('/remind dans 10 min de faire x');
  assert.equal(res.kind, 'error');
});

test('/rappelle-moi is an alias of /remind', async () => {
  const added = [];
  const terminal = createTerminal({
    reminders: { add: (at, text) => { added.push({ at, text }); return { id: 'x', at, text, made: null }; } },
  });
  const res = await terminal.execute('/rappelle-moi dans 5 min de tester');
  assert.equal(res.kind, 'response');
  assert.equal(added[0].text, 'tester');
});

test('/cancel removes a reminder by text', async () => {
  const list = [
    { id: 'a', text: 'sortir la pizza', made: null, at: Date.now() + 60000 },
    { id: 'b', text: 'appeler maman', made: null, at: Date.now() + 120000 },
  ];
  let removed = null;
  const terminal = createTerminal({
    reminders: {
      cancelByText: (text) => {
        removed = text;
        const target = list.find((r) => String(r.text || '').toLowerCase().includes(String(text || '').toLowerCase()));
        if (target) list.splice(list.indexOf(target), 1);
        return target || null;
      },
    },
  });

  const res = await terminal.execute('/cancel pizza');
  assert.equal(res.kind, 'response');
  assert.equal(removed, 'pizza');
  assert.match(res.lines.join(' '), /sortir la pizza/);
});

test('/cancel without text cancels the oldest upcoming', async () => {
  let removed = null;
  const terminal = createTerminal({
    reminders: { cancelByText: (text) => { removed = text; return { id: 'a', text: 'le plus tôt', made: null }; } },
  });

  const res = await terminal.execute('/cancel');
  assert.equal(res.kind, 'response');
  assert.equal(removed, '');
  assert.match(res.lines.join(' '), /le plus tôt/);
});

test('/cancel when nothing matches errors', async () => {
  const terminal = createTerminal({
    reminders: { cancelByText: () => null },
  });
  const res = await terminal.execute('/cancel inexistant');
  assert.equal(res.kind, 'error');
});

test('/annule is an alias of /cancel', async () => {
  let removed = null;
  const terminal = createTerminal({
    reminders: { cancelByText: (text) => { removed = text; return { id: 'a', text: 'quelque chose', made: null }; } },
  });
  const res = await terminal.execute('/annule quelque chose');
  assert.equal(res.kind, 'response');
  assert.equal(removed, 'quelque chose');
});
