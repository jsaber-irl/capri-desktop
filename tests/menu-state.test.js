'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { checkboxState } = require('../src/main/menu-state');

test('unavailable native menu options render unchecked without changing stored preference', () => {
  assert.deepEqual(checkboxState(false, true), { enabled: false, checked: false });
  assert.deepEqual(checkboxState(true, true), { enabled: true, checked: true });
  assert.deepEqual(checkboxState(true, false), { enabled: true, checked: false });
});
