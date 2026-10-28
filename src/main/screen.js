'use strict';

// Her eyes: a picture of your screen, so she can react to what's on it (eyes.js drives when, the
// vision model in llm.js says what she sees). Off unless you turn it on (her menu › Senses); while
// it's on she takes a small, low-detail shot now and then, never stores it, and sends it only to the
// vision model you picked (a local one keeps it on your PC). She hides herself for the shot, so she
// isn't looking at her own reflection.

const { desktopCapturer, screen, systemPreferences } = require('electron');

// Small enough that it stays cheap and low-detail (no fine print read off your screen), big enough
// for a vision model to get the gist. Kept to the chosen display.
const MAX_W = 896;

// A JPEG of the display she's on, as base64 (no data: prefix), or null if it couldn't.
// hideOverlay: an async () => restore fn, so her own window isn't in the shot.
async function grab({
  displayId = null,
  hideOverlay = null,
  desktopCapturer: capturer = desktopCapturer,
  screen: displayApi = screen,
  systemPreferences: preferences = systemPreferences,
  platform = process.platform,
} = {}) {
  if (platform === 'darwin' && preferences?.getMediaAccessStatus) {
    const access = preferences.getMediaAccessStatus('screen');
    if (access === 'denied' || access === 'restricted') {
      const error = new Error('Autorisez Capri dans Réglages Système > Confidentialité et sécurité > Enregistrement de l’écran, puis relancez Capri.');
      error.code = 'screen_permission_denied';
      throw error;
    }
  }
  const display = (displayId && displayApi.getAllDisplays().find((d) => d.id === displayId)) || displayApi.getPrimaryDisplay();
  const { width, height } = display.size;
  const scale = Math.min(1, MAX_W / width);
  const thumbnailSize = { width: Math.round(width * scale), height: Math.round(height * scale) };

  let restore = null;
  try {
    if (hideOverlay) restore = await hideOverlay();
    const sources = await capturer.getSources({ types: ['screen'], thumbnailSize });
    // match the display by id; desktopCapturer's display_id is a string
    const source = sources.find((s) => String(s.display_id) === String(display.id)) || sources[0];
    if (!source || source.thumbnail.isEmpty()) {
      if (platform === 'darwin' && preferences?.getMediaAccessStatus?.('screen') !== 'granted') {
        const error = new Error('La capture d’écran est bloquée ou doit être autorisée dans Réglages Système > Confidentialité et sécurité > Enregistrement de l’écran.');
        error.code = 'screen_permission_required';
        throw error;
      }
      return null;
    }
    const jpeg = source.thumbnail.toJPEG(70);
    return jpeg.toString('base64');
  } catch (err) {
    if (err.code === 'screen_permission_denied' || err.code === 'screen_permission_required') throw err;
    console.error('[capri] could not see the screen:', err.message);
    return null;
  } finally {
    try {
      await restore?.();
    } catch {
      // the overlay comes back regardless
    }
  }
}

module.exports = { grab };
