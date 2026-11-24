'use strict';

const { DEV, devLog } = require('./logger');
const { randomUUID } = require('node:crypto');
const tracks = require('../renderer/music-library.js');

function createMusicPlayer({ BrowserWindow, ipcMain, preload, protocolUrl, lang = () => 'fr', playTrack, media, listMedia, getLibrary = () => [], tabAction = async () => ({ ok: false, error: 'Action indisponible.' }) }) {
  let win = null;
  const pendingLocal = new Map();
  let rendererReady = false;
  const catalog = () => [...tracks, ...(getLibrary() || [])];
  const owns = (event) => Boolean(
    win && !win.isDestroyed()
      && event.sender === win.webContents
      && (!event.senderFrame || event.senderFrame === win.webContents.mainFrame)
  );
  const show = () => {
    if (win && !win.isDestroyed()) { win.show(); win.focus(); return; }
    win = new BrowserWindow({
      width: 470,
      height: 265,
      minWidth: 400,
      minHeight: 235,
      frame: false,
      resizable: true,
      show: false,
      title: 'Capri // Music',
      backgroundColor: '#0c0d12',
      autoHideMenuBar: true,
      webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    rendererReady = false;
    devLog(`[music-player:close] main: fenêtre créée id=${win.id}`);
    win.removeMenu?.();
    win.once('ready-to-show', () => {
      devLog('[music-player:close] main: fenêtre prête à afficher');
      win?.show();
    });
    win.on('closed', () => {
      devLog('[music-player:close] main: événement closed reçu');
      win = null;
      for (const requestId of pendingLocal.keys()) finishLocal(requestId, { ok: false, error: 'Le mini-lecteur s’est fermé avant la lecture.' });
    });
    win.on('close', (event) => {
      devLog('[music-player:close] main: événement close reçu', {
        defaultPrevented: event.defaultPrevented,
      });
    });
    // Electron 44 passes one details event here. Reading the deprecated positional
    // arguments both emitted a warning and caused renderer diagnostics to be dropped.
    if (DEV) win.webContents.on('console-message', (details) => {
      const message = details?.message;
      if (typeof message === 'string' && message.includes('[music-player:close]')) devLog(message);
    });
    win.webContents.on('did-fail-load', (_event, code, description, url) => {
      console.error('[music-player:close] main: chargement du lecteur échoué', { code, description, url });
    });
    win.webContents.once('did-finish-load', () => {
      devLog('[music-player:close] main: page du lecteur chargée');
      if (rendererReady) {
        for (const [requestId, request] of pendingLocal) dispatchLocal(requestId, request.id);
      }
    });
    win.loadURL(protocolUrl);
  };
  const finishLocal = (requestId, result) => {
    const pending = pendingLocal.get(requestId);
    if (!pending) return false;
    clearTimeout(pending.timer);
    pendingLocal.delete(requestId);
    pending.resolve(result);
    return true;
  };
  const dispatchLocal = (requestId, id) => {
    if (!rendererReady || !win || win.isDestroyed()) {
      devLog('[music-player:local] dispatch différé', { rendererReady, open: Boolean(win && !win.isDestroyed()) });
      return false;
    }
    const pending = pendingLocal.get(requestId);
    if (!pending || pending.dispatched) return false;
    pending.dispatched = true;
    const detail = JSON.stringify({ requestId, id });
    // Audio playback is subject to Chromium's user-activation policy. Electron's
    // documented userGesture flag is applied only to this fixed event dispatch;
    // the payload contains a Main-validated catalog ID and an internally made UUID.
    devLog('[music-player:local] dispatch vers le lecteur', { id, requestId });
    win.webContents.executeJavaScript(
      `window.dispatchEvent(new CustomEvent('capri:music-local-play', { detail: ${detail} }));`,
      true,
    ).then(() => devLog('[music-player:local] événement reçu par le document', { id, requestId }))
      .catch((error) => {
        devLog('[music-player:local] exécution refusée', String(error?.message || error));
        finishLocal(requestId, { ok: false, error: `Le lecteur n’a pas pu lancer le morceau : ${String(error?.message || error).slice(0, 140)}` });
      });
    return true;
  };
  const playLocal = (rawId) => {
    const id = String(rawId || '');
    const track = catalog().find((item) => item.id === id);
    if (!track) return Promise.resolve({ ok: false, error: 'Morceau Capri introuvable.' });
    devLog('[music-player:local] requête de lecture validée', { id, title: track.title });
    show();
    const requestId = randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => finishLocal(requestId, { ok: false, error: 'Le mini-lecteur n’a pas confirmé la lecture.' }), 12000);
      pendingLocal.set(requestId, { id, timer, resolve, dispatched: false });
      dispatchLocal(requestId, id);
    });
  };
  ipcMain.handle('music-player:library', (event) => {
    const owned = owns(event);
    const items = catalog();
    devLog('[music-player:catalog] demande du lecteur', { owned, count: items.length });
    return owned
      ? { ok: true, tracks: items.map(({ id, title, file, src, artist, album, artwork, mode }) => ({ id, title, file, src, artist, album, artwork, mode })) }
      : { ok: false, error: 'Accès refusé.' };
  });
  ipcMain.handle('music-player:ready', (event, result = {}) => {
    if (!owns(event)) return { ok: false, error: 'Accès refusé.' };
    if (result.ok !== true) {
      const error = String(result.error || 'La bibliothèque musicale est indisponible.').slice(0, 180);
      for (const requestId of pendingLocal.keys()) finishLocal(requestId, { ok: false, error });
      return { ok: false, error };
    }
    rendererReady = true;
    devLog('[music-player:catalog] lecteur prêt', { count: catalog().length, waiting: pendingLocal.size });
    for (const [requestId, request] of pendingLocal) dispatchLocal(requestId, request.id);
    return { ok: true };
  });
  ipcMain.handle('music-player:play-local-result', (event, result = {}) => {
    if (!owns(event)) return { ok: false, error: 'Accès refusé.' };
    const requestId = String(result.requestId || '');
    const pending = pendingLocal.get(requestId);
    if (!pending || pending.id !== String(result.id || '')) return { ok: false, error: 'Demande de lecture inconnue.' };
    const title = catalog().find((track) => track.id === pending.id)?.title || 'Morceau';
    finishLocal(requestId, result.ok === true
      ? { ok: true, title }
      : { ok: false, error: String(result.error || 'La lecture du morceau a échoué.').slice(0, 200) });
    return { ok: true };
  });
  ipcMain.handle('music-player:play', (event, request) => owns(event) ? playTrack(request) : { ok: false, error: 'Accès refusé.' });
  ipcMain.handle('music-player:media', (event, action) => owns(event) ? media({ action }) : { ok: false, error: 'Accès refusé.' });
  ipcMain.handle('music-player:sessions', (event) => owns(event) ? listMedia() : { ok: false, error: 'Accès refusé.' });
  ipcMain.handle('music-player:tab', (event, request) => owns(event) ? tabAction(request) : { ok: false, error: 'Accès refusé.' });
  ipcMain.on('music-player:close-debug', (event, marker) => {
    if (win && !win.isDestroyed() && event.sender === win.webContents) {
      devLog(`[music-player:close] main: diagnostic reçu ${String(marker).slice(0, 80)}`);
    }
  });
  ipcMain.handle('music-player:close', (event) => {
    // The mini-player is frameless and its trusted preload is the only close caller.
    // Check its WebContents identity, without depending on Electron's frame wrapper identity.
    const owned = Boolean(win && !win.isDestroyed() && event.sender === win.webContents);
    devLog('[music-player:close] main: IPC reçu', {
      senderId: event.sender?.id,
      playerId: win?.id,
      senderUrl: event.senderFrame?.url,
      owned,
      destroyed: win?.isDestroyed(),
    });
    if (!owned) return { ok: false, error: 'Accès refusé.' };
    win.close();
    devLog('[music-player:close] main: win.close() appelé');
    return { ok: true };
  });
  const refreshLibrary = () => {
    if (win && !win.isDestroyed()) win.webContents.send('music-player:library-changed');
  };
  return { show, playLocal, refreshLibrary, close: () => win?.close(), isOpen: () => Boolean(win && !win.isDestroyed()) };
}

module.exports = { createMusicPlayer };
