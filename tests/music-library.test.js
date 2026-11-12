'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const library = require('../src/renderer/music-library');

const songsDirectory = path.join(__dirname, '..', 'assets', 'songs');

test('bundled music library lists each requested track once with an existing local MP3', () => {
  const expected = [
    'I Really Want to Stay at Your House',
    "Who's Ready for Tomorrow",
    'This Fffire',
    'In Love with Myself',
    'High Forever',
  ];
  assert.deepEqual(library.map((song) => song.title), expected);
  assert.equal(new Set(library.map((song) => song.file.toLowerCase())).size, expected.length);
  for (const song of library) {
    const file = path.join(songsDirectory, song.file);
    assert.ok(fs.statSync(file).size > 0, `${song.file} exists and is non-empty`);
    assert.match(song.src, /^capri:\/\/app\/assets\/songs\//);
    assert.equal(path.extname(song.file), '.mp3');
    assert.equal(song.artist, null);
    assert.equal(song.album, null);
    assert.equal(song.artwork, null);
  }
});
