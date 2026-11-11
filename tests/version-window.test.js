'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { compareVersions, normalizeVersion, REPOSITORY } = require('../src/main/version-window');

test('normalizes a version prefix and compares numeric components', () => {
  assert.equal(normalizeVersion(' v2.3.0 '), '2.3.0');
  assert.equal(compareVersions('2.10.0', '2.9.9'), 1);
  assert.equal(compareVersions('v2.3.0', '2.3.0'), 0);
  assert.equal(compareVersions('2.3.0', '2.3.1'), -1);
});

test('links only to the official Capri repository', () => {
  assert.equal(REPOSITORY, 'https://github.com/jsaber-irl/capri-desktop');
});
