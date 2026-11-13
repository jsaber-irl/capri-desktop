'use strict';
const GAMES = Object.freeze({ 'tic-tac-toe': 'Morpion', '2048': '2048' });

function createGamesWindow({ BrowserWindow, ipcMain, preload, protocolUrl = 'capri://app/src/renderer/game.html' }) {
  const windows = new Map();
  const owns = (event) => [...windows.values()].some((win) => win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame);
  const open = (id) => {
    const game = String(id || ''); if (!Object.hasOwn(GAMES, game)) return { ok: false, error: 'Jeu inconnu.' };
    const current = windows.get(game);
    if (current && !current.isDestroyed()) { current.show(); current.focus(); return { ok: true, reused: true }; }
    const win = new BrowserWindow({ width: game === '2048' ? 460 : 440, height: game === '2048' ? 620 : 560, minWidth: 360, minHeight: 440, title: `Capri // ${GAMES[game]}`, frame: true, show: false, autoHideMenuBar: true, webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true } });
    windows.set(game, win);
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => { if (windows.get(game) === win) windows.delete(game); });
    win.loadURL(`${protocolUrl}?game=${encodeURIComponent(game)}`);
    return { ok: true, reused: false };
  };
  ipcMain.handle('games:close', (event) => {
    if (!owns(event)) return { ok: false, error: 'Accès refusé.' };
    const win = [...windows.values()].find((item) => item.webContents === event.sender);
    win?.close(); return { ok: Boolean(win) };
  });
  return { open, close: (id) => windows.get(id)?.close(), isOpen: (id) => Boolean(windows.get(id) && !windows.get(id).isDestroyed()), list: () => Object.keys(GAMES) };
}
module.exports = { GAMES, createGamesWindow };
