'use strict';

function createMusicPlayer({ BrowserWindow, ipcMain, preload, protocolUrl, lang = () => 'fr', playTrack, media }) {
  let win = null;
  const owns = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame);
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
    win.removeMenu?.();
    win.once('ready-to-show', () => win?.show());
    win.on('closed', () => { win = null; });
    win.loadURL(protocolUrl);
  };
  ipcMain.handle('music-player:play', (event, request) => owns(event) ? playTrack(request) : { ok: false, error: 'Accès refusé.' });
  ipcMain.handle('music-player:media', (event, action) => owns(event) ? media({ action }) : { ok: false, error: 'Accès refusé.' });
  ipcMain.handle('music-player:close', (event) => {
    if (!owns(event)) return { ok: false, error: 'Accès refusé.' };
    win.close();
    return { ok: true };
  });
  return { show, close: () => win?.close(), isOpen: () => Boolean(win && !win.isDestroyed()) };
}

module.exports = { createMusicPlayer };
