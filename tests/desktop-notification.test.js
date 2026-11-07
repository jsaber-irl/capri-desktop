'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { showDesktopNotification } = require('../src/main/desktop-notification');

test('shows a desktop notification with the given title and reminder text', () => {
  let shown;
  class FakeNotification {
    static isSupported() { return true; }
    constructor(options) { this.options = options; }
    show() { shown = this.options; }
  }

  assert.deepEqual(showDesktopNotification(FakeNotification, {
    title: 'Rappel',
    body: 'Prendre les clés',
  }), { ok: true });
  assert.deepEqual(shown, { title: 'Rappel', body: 'Prendre les clés' });
});

test('reports unsupported or invalid desktop notifications', () => {
  class UnsupportedNotification {
    static isSupported() { return false; }
  }
  assert.equal(showDesktopNotification(UnsupportedNotification, {
    title: 'Rappel', body: 'Prendre les clés',
  }).ok, false);

  class SupportedNotification {
    static isSupported() { return true; }
  }
  assert.equal(showDesktopNotification(SupportedNotification, {
    title: ' ', body: 'Prendre les clés',
  }).ok, false);
});
