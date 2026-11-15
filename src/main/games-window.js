'use strict';
const GAMES = Object.freeze({ 'tic-tac-toe': 'Morpion', '2048': '2048' });

function createGamesWindow({ BrowserWindow, ipcMain, preload, screen = null, lang = () => 'fr', protocolUrl = 'capri://app/src/renderer/game.html' }) {
  const windows = new Map();
  const owns = (event) => [...windows.values()].some((win) => win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame);
  const open = (id) => {
    const game = String(id || ''); if (!Object.hasOwn(GAMES, game)) return { ok: false, error: 'Jeu inconnu.' };
    const current = windows.get(game);
    if (current && !current.isDestroyed()) { current.show(); current.focus(); return { ok: true, reused: true }; }
    const area = screen?.getPrimaryDisplay?.().workAreaSize || { width: 1280, height: 800 };
    const desired = game === '2048' ? { width: 510, height: 700 } : { width: 500, height: 650 };
    const width = Math.min(desired.width, Math.max(280, area.width - 32));
    const height = Math.min(desired.height, Math.max(360, area.height - 48));
    const locale = ['fr', 'en', 'ru'].includes(typeof lang === 'function' ? lang() : lang) ? (typeof lang === 'function' ? lang() : lang) : 'fr';
    const win = new BrowserWindow({ width, height, minWidth: Math.min(320, width), minHeight: Math.min(400, height), title: `Capri // ${GAMES[game]}`, frame: true, show: false, autoHideMenuBar: true, webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true } });
    windows.set(game, win);
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => { if (windows.get(game) === win) windows.delete(game); });
    win.loadURL(`${protocolUrl}?game=${encodeURIComponent(game)}&lang=${locale}`);
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
