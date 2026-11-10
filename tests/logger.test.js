'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('diagnostic logs are emitted only with --dev', () => {
  const logger = path.join(__dirname, '..', 'src', 'main', 'logger.js');
  const script = `require(${JSON.stringify(logger)}).devLog('diagnostic');`;
  const normal = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  const dev = spawnSync(process.execPath, ['-e', script, '--', '--dev'], { encoding: 'utf8' });
  assert.equal(normal.stdout.trim(), '');
  assert.equal(dev.stdout.trim(), 'diagnostic');
});
