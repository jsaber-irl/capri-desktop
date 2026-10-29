'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildVideoSearchUrl, openVideoSearch } = require('../src/main/video-search');

test('latest video search is a real YouTube date-sorted search, never a fixed video', () => {
  const url = new URL(buildVideoSearchUrl('Mister Beast'));
  assert.equal(url.hostname, 'www.youtube.com');
  assert.equal(url.pathname, '/results');
  assert.match(url.searchParams.get('search_query'), /MrBeast/);
  assert.equal(url.searchParams.get('sp'), 'CAISAhAB');
  assert.equal(buildVideoSearchUrl(''), null);
});

test('browser targeting is allow-listed and failures are reported', async () => {
  const calls = [];
  const opened = await openVideoSearch({ creator: 'MrBeast', browser: 'Safari', platform: 'darwin', openInBrowser: async (...args) => calls.push(args) });
  assert.equal(opened.ok, true);
  assert.equal(calls[0][0], 'Safari');
  assert.equal((await openVideoSearch({ creator: 'MrBeast', browser: 'Unknown', openExternal: async () => {} })).ok, false);
  assert.equal((await openVideoSearch({ creator: 'MrBeast', browser: 'Safari', platform: 'win32', openInBrowser: async () => {} })).ok, false);
  assert.match((await openVideoSearch({ creator: 'MrBeast', openExternal: async () => { throw new Error('offline'); } })).error, /offline/);
});
