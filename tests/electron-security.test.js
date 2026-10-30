'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { installNavigationGuards } = require('../src/main/electron-security');

test('Electron refuse les fenêtres enfants et les navigations hors origine locale Capri', () => {
  let created;
  installNavigationGuards({ on: (_event, callback) => { created = callback; } });
  let navigate;
  let open;
  created({}, { on: (_event, callback) => { navigate = callback; }, setWindowOpenHandler: (callback) => { open = callback; } });
  assert.deepEqual(open(), { action: 'deny' });
  let prevented = false;
  navigate({ preventDefault: () => { prevented = true; } }, 'https://example.org');
  assert.equal(prevented, true);
  prevented = false;
  navigate({ preventDefault: () => { prevented = true; } }, 'capri://app/src/renderer/index.html');
  assert.equal(prevented, false);
  navigate({ preventDefault: () => { prevented = true; } }, 'capri://usersounds/file.mp3');
  assert.equal(prevented, true);
});
