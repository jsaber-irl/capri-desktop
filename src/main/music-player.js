'use strict';

const { DEV, devLog } = require('./logger');

function createMusicPlayer({ BrowserWindow, ipcMain, preload, protocolUrl, lang = () => 'fr', playTrack, media, listMedia, tabAction = async () => ({ ok: false, error: 'Action indisponible.' }) }) {
  let win = null;
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
    devLog(`[music-player:close] main: fenêtre créée id=${win.id}`);
    win.removeMenu?.();
    win.once('ready-to-show', () => {
      devLog('[music-player:close] main: fenêtre prête à afficher');
      win?.show();
    });
    win.on('closed', () => {
      devLog('[music-player:close] main: événement closed reçu');
      win = null;
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
    });
    win.loadURL(protocolUrl);
  };
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
  return { show, close: () => win?.close(), isOpen: () => Boolean(win && !win.isDestroyed()) };
}

module.exports = { createMusicPlayer };
