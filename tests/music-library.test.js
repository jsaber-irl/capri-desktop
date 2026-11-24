'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'music-player.html'), 'utf8');
const playerCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'music-player.css'), 'utf8');
const playerScript = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'music-player.js'), 'utf8');
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
  const expectedArtists = [
    'Rosa Walton, Hallie Coggins',
    'RAT BOY & IBDY',
    'Franz Ferdinand',
    'Petite Meller, Kalman Chodakiewitz, Eli Shiffman',
    'Petite Meller, Marion Hoffstadt',
  ];
  assert.deepEqual(library.map((song) => song.title), expected);
  assert.deepEqual(library.map((song) => song.artist), expectedArtists);
  assert.equal(new Set(library.map((song) => song.file.toLowerCase())).size, expected.length);
  for (const song of library) {
    const file = path.join(songsDirectory, song.file);
    assert.ok(fs.statSync(file).size > 0, `${song.file} exists and is non-empty`);
    assert.match(song.src, /^capri:\/\/app\/assets\/songs\//);
    assert.equal(path.extname(song.file), '.mp3');
    assert.equal(song.album, null);
    assert.equal(song.artwork, null);
  }
});

test('mini-player exposes an explicit play control for the currently selected bundled track', () => {
  assert.match(html, /id="play-selected"/);
  assert.match(playerScript, /getElementById\('play-selected'\)\.addEventListener\('click'/);
  assert.match(playerScript, /launchStop\.textContent = localTrackActive \? 'ARRÊTER' : 'LANCER'/);
  assert.match(playerScript, /isLocalPlayback\(\) && localTrackActive[\s\S]{0,240}audio\.pause\(\)/);
  assert.match(playerCss, /#toggle\s*\{[^}]*display:\s*grid;[^}]*visibility:\s*visible;/u);
  assert.match(playerCss, /#toggle\s*\{[^}]*color:\s*var\(--ink\);[^}]*background:\s*#f3f5f6;/u);
  assert.match(html, /<audio id="library-audio"/);
});

test('renderer fills the integrated library and acknowledges playback only after audio.play resolves', async () => {
  class Element {
    constructor(id = '') { this.id = id; this.children = []; this.listeners = {}; this.textContent = ''; this.value = ''; this.paused = true; this.currentTime = 0; this.duration = 180; this.error = null; }
    append(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    removeAttribute(name) { delete this[name]; }
    load() {}
    async play() { this.playCount = (this.playCount || 0) + 1; this.paused = false; this.currentSrc = this.src; this.listeners.play?.(); return undefined; }
    pause() { this.paused = true; this.listeners.pause?.(); }
    get options() { return this.children.flatMap((group) => group.children || []); }
    setAttribute(name, value) { this[name] = value; }
    classList = { toggle() {} };
  }
  const ids = ['track', 'local-tracks', 'mode-tracks', 'detected-tracks', 'service', 'title', 'artist', 'progress', 'current', 'duration', 'playback-state', 'media-tabs', 'library-audio', 'toggle', 'play-selected', 'previous', 'next', 'heart', 'close'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element(id)]));
  elements.track.children = [elements['local-tracks'], elements['mode-tracks'], elements['detected-tracks']];
  const image = new Element('art');
  const events = {};
  const acknowledgements = [];
  let externalMediaCalls = 0;
  const window = {
    CapriMusicLibrary: library,
    host: {
      isDev: true,
      musicPlayerLibrary: async () => ({ ok: true, tracks: [...library, {
        id: 'music-jazz__track-one', title: 'Side Street', artist: 'Demo Artist', album: null,
        artwork: null, src: 'capri://music/music-jazz__track-one', mode: 'Jazz collection',
      }] }),
      musicPlayerReady: async (result) => ({ ok: result.ok }),
      musicPlayerSessions: async () => ({ ok: true, sessions: [] }),
      musicPlayerMedia: async () => { externalMediaCalls += 1; return { ok: false, error: 'Aucun lecteur externe.' }; },
      musicPlayerLocalResult: async (result) => { acknowledgements.push(result); return { ok: true }; },
    },
    addEventListener: (name, listener) => { events[name] = listener; },
  };
  const document = {
    getElementById: (id) => elements[id] || null,
    querySelector: (selector) => selector === '.player__art' ? image : null,
    createElement: (tag) => new Element(tag),
  };
  const context = { window, document, console, setInterval: () => 1, clearInterval() {}, setTimeout, clearTimeout, Number, String, Math, Object, Array, Promise };
  const instrumentedPlayerScript = playerScript.replace(
    'function render() {',
    'window.__forcePlaybackFlagStale = () => { localPlayback = false; };\nfunction render() {'
  );
  assert.notEqual(instrumentedPlayerScript, playerScript, 'the test can exercise stale renderer state');
  vm.runInNewContext(instrumentedPlayerScript, context, { filename: 'music-player.js' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(elements['local-tracks'].children.length, 5);
  assert.equal(elements.track.options.length, 6);
  assert.equal(elements['mode-tracks'].children.length, 1);
  assert.ok(elements.track.options.every((option) => option.value));

  elements.track.value = `local:${library[0].id}`;
  await elements.toggle.listeners.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(elements['library-audio'].playCount, 1, 'play starts the selected bundled track before checking external players');
  assert.match(elements['library-audio'].src, /I%20Really%20Want%20to%20Stay%20at%20Your%20House\.mp3$/u);
  assert.equal(externalMediaCalls, 0);

  await events['capri:music-local-play']({ detail: { id: 'this-fffire', requestId: 'request-1' } });
  assert.equal(elements['library-audio'].playCount, 2);
  assert.match(elements['library-audio'].src, /This%20Fffire\.mp3$/u);
  assert.equal(elements.title.textContent, 'This Fffire');
  assert.equal(elements.artist.textContent, 'Franz Ferdinand');
  assert.equal(acknowledgements[0].ok, true);
  assert.equal(acknowledgements[0].requestId, 'request-1');
  assert.equal(elements.toggle.hidden, false);
  assert.equal(elements.toggle.textContent, 'Ⅱ');
  assert.equal(elements['play-selected'].textContent, 'ARRÊTER');

  window.__forcePlaybackFlagStale();
  await elements.toggle.listeners.click();
  assert.equal(elements.toggle.hidden, false, 'the play/pause control remains visible while paused');
  assert.equal(elements.toggle.textContent, '▶');
  assert.equal(externalMediaCalls, 0, 'integrated audio is never routed to an external media adapter');
  assert.equal(elements['play-selected'].textContent, 'ARRÊTER', 'stop remains available while the selected song is paused');
  await elements.toggle.listeners.click();
  assert.equal(elements.toggle.textContent, 'Ⅱ');
  elements['play-selected'].listeners.click();
  assert.equal(elements['library-audio'].paused, true);
  assert.equal(elements['library-audio'].currentTime, 0);
  assert.equal(elements['play-selected'].textContent, 'LANCER');
  assert.equal(elements['playback-state'].textContent, 'ARRÊTÉ');
  assert.equal(elements.toggle.hidden, false);
  assert.equal(elements.toggle.textContent, '▶');

  elements.track.value = 'local:music-jazz__track-one';
  await elements.track.listeners.change();
  assert.equal(elements['library-audio'].src, 'capri://music/music-jazz__track-one');
  assert.equal(elements.title.textContent, 'Side Street');
  assert.equal(elements.artist.textContent, 'Demo Artist');
  assert.equal(elements['library-audio'].playCount, 4);
});
