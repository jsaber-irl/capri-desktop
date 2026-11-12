'use strict';

// Tracks shipped with Capri. Keep missing tags null rather than inventing metadata.
const musicLibrary = Object.freeze([
  { id: 'stay-at-your-house', title: 'I Really Want to Stay at Your House', file: 'I Really Want to Stay at Your House.mp3', artist: null, album: null, artwork: null },
  { id: 'ready-for-tomorrow', title: "Who's Ready for Tomorrow", file: "Who's Ready for Tomorrow.mp3", artist: null, album: null, artwork: null },
  { id: 'this-fffire', title: 'This Fffire', file: 'This Fffire.mp3', artist: null, album: null, artwork: null },
  { id: 'in-love-with-myself', title: 'In Love with Myself', file: 'In Love with Myself.mp3', artist: null, album: null, artwork: null },
  { id: 'high-forever', title: 'High Forever', file: 'High Forever.mp3', artist: null, album: null, artwork: null },
].map((track) => Object.freeze({
  ...track,
  src: `capri://app/assets/songs/${encodeURIComponent(track.file)}`,
})));

if (typeof module !== 'undefined' && module.exports) module.exports = musicLibrary;
if (typeof window !== 'undefined') window.CapriMusicLibrary = musicLibrary;
