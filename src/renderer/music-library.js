'use strict';

// Bundled tracks and their supplied original artist/source credits.
const musicLibrary = Object.freeze([
  { id: 'stay-at-your-house', title: 'I Really Want to Stay at Your House', file: 'I Really Want to Stay at Your House.mp3', artist: 'Rosa Walton, Hallie Coggins', album: null, artwork: null },
  { id: 'ready-for-tomorrow', title: "Who's Ready for Tomorrow", file: "Who's Ready for Tomorrow.mp3", artist: 'RAT BOY & IBDY', album: null, artwork: null },
  { id: 'this-fffire', title: 'This Fffire', file: 'This Fffire.mp3', artist: 'Franz Ferdinand', album: null, artwork: null },
  { id: 'in-love-with-myself', title: 'In Love with Myself', file: 'In Love with Myself.mp3', artist: 'Petite Meller, Kalman Chodakiewitz, Eli Shiffman', album: null, artwork: null },
  { id: 'high-forever', title: 'High Forever', file: 'High Forever.mp3', artist: 'Petite Meller, Marion Hoffstadt', album: null, artwork: null },
].map((track) => Object.freeze({
  ...track,
  src: `capri://app/assets/songs/${encodeURIComponent(track.file)}`,
})));

if (typeof module !== 'undefined' && module.exports) module.exports = musicLibrary;
if (typeof globalThis !== 'undefined') globalThis.CapriMusicLibrary = musicLibrary;
