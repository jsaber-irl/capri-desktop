'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTextDocument, safeTextName } = require('../src/main/documents');

test('document names cannot escape the chosen directory', () => {
  assert.equal(safeTextName('test.txt'), 'test.txt');
  assert.equal(safeTextName('notes'), 'notes.txt');
  for (const name of ['../x.txt', '/tmp/x.txt', 'a/b.txt', '']) assert.equal(safeTextName(name), null);
});

test('creates and verifies an exact UTF-8 document and never overwrites existing content', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'capri-doc-'));
  try {
    const result = await createTextDocument({ filename: 'test.txt', content: 'Hello World!\n', directory, platform: 'linux' });
    assert.equal(result.ok, true);
    assert.equal(await fs.readFile(result.file, 'utf8'), 'Hello World!\n');
    const duplicate = await createTextDocument({ filename: 'test.txt', content: 'different', directory, platform: 'linux' });
    assert.equal(duplicate.ok, false);
    assert.match(duplicate.error, /existe déjà|already exists/i);
    assert.equal(await fs.readFile(result.file, 'utf8'), 'Hello World!\n');
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('macOS TextEdit open is a separate verified stage after file creation', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'capri-doc-'));
  try {
    let opened = '';
    const result = await createTextDocument({ filename: 'Hello.txt', content: 'Hello World!', directory, platform: 'darwin', openTextEdit: async (file) => { opened = file; return { ok: true }; } });
    assert.equal(result.ok, true);
    assert.equal(result.verified, true);
    assert.equal(result.opened, true);
    assert.equal(opened, result.file);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
