'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStructuredMemory } = require('../src/main/structured-memory');

test('structured memory supports selective deletion and Markdown round trips', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-memory-'));
  const file = path.join(dir, 'memory.json');
  const memory = createStructuredMemory({ file });
  const added = memory.add({ category: 'preference', content: 'Aime le synthwave' });
  assert.equal(added.ok, true);
  assert.equal(memory.list('preference').length, 1);
  const exported = path.join(dir, 'export.md');
  assert.equal(memory.exportMarkdown(exported).count, 1);
  assert.equal(memory.remove(added.entry.id).ok, true);
  assert.equal(memory.list().length, 0);
  assert.equal(memory.importMarkdown(exported).count, 1);
  assert.equal(memory.list()[0].content, 'Aime le synthwave');
});
