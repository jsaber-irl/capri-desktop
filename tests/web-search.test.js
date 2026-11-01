'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWebSearchUrl, openWebSearch } = require('../src/main/web-search');

test('builds allow-listed web search URLs', () => {
  const url = new URL(buildWebSearchUrl('Capri desktop', 'duckduckgo'));
  assert.equal(url.hostname, 'duckduckgo.com');
  assert.equal(url.searchParams.get('q'), 'Capri desktop');
  assert.equal(buildWebSearchUrl('', 'google'), null);
  assert.equal(buildWebSearchUrl('test', 'unknown'), null);
});

test('reports browser errors instead of claiming the search succeeded', async () => {
  const calls = [];
  const result = await openWebSearch({ query: 'Electron', openExternal: async (url) => calls.push(url) });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  const failed = await openWebSearch({ query: 'Electron', openExternal: async () => { throw new Error('offline'); } });
  assert.equal(failed.ok, false);
  assert.match(failed.error, /offline/);
});
