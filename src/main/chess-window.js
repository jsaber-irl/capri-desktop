'use strict';

const { ChessGame } = require('./chess-game');

function createChessWindow({ BrowserWindow, ipcMain, preload, protocolUrl = 'capri://app/src/renderer/chess.html', lang = () => 'fr' }) {
  let win = null;
  const game = new ChessGame();
  const tr = (fr, en, ru) => (lang() === 'en' ? en : lang() === 'ru' ? ru : fr);
  const owns = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame);
  const publish = () => { if (win && !win.isDestroyed()) win.webContents.send('chess:state', game.state()); };
  const show = () => {
    if (win && !win.isDestroyed()) { win.show(); win.focus(); publish(); return; }
    win = new BrowserWindow({ width: 540, height: 650, minWidth: 430, minHeight: 540, title: 'Capri // Chess', frame: false, show: false, resizable: true, backgroundColor: '#101118', autoHideMenuBar: true, webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.removeMenu?.();
    win.once('ready-to-show', () => { win?.show(); publish(); });
    win.on('closed', () => { win = null; });
    win.loadURL(protocolUrl);
  };
  const command = (request = {}) => {
    const action = String(request.action || 'start').toLowerCase();
    if (action === 'help') return { ok: true, lines: [tr('Clique une pièce puis sa destination, ou saisis /chess move e2e4.', 'Select a piece then its destination, or enter /chess move e2e4.', 'Выбери фигуру и клетку назначения или введи /chess move e2e4.'), tr('/chess new recommence · /chess resign abandonne.', '/chess new starts over · /chess resign resigns.', '/chess new начинает заново · /chess resign сдаётся.')] };
    if (action === 'start' || action === 'new') {
      if (action === 'new') game.newGame();
      show(); publish();
      return { ok: true, state: game.state(), lines: [action === 'new' ? tr('Nouvelle partie lancée.', 'New game started.', 'Новая партия началась.') : tr('Échiquier ouvert. Tu joues les blancs.', 'Chessboard opened. You play White.', 'Доска открыта. Ты играешь белыми.')] };
    }
    if (action === 'resign') { const state = game.resign(); publish(); return { ok: true, state, lines: [tr('Partie abandonnée. Capri gagne.', 'Game resigned. Capri wins.', 'Ты сдался. Победила Capri.')] }; }
    if (action === 'move') {
      const result = game.play(request.move);
      publish();
      return result.ok ? { ok: true, state: result.state, lines: [result.botMove ? tr(`Coup de Capri : ${result.botMove}.`, `Capri played ${result.botMove}.`, `Ход Capri: ${result.botMove}.`) : tr(`Coup joué. État : ${result.state.status}.`, `Move played. Status: ${result.state.status}.`, `Ход сделан. Статус: ${result.state.status}.`)] } : { ok: false, error: result.error, state: game.state() };
    }
    return { ok: false, error: tr('Commande échecs inconnue. Utilise /chess help.', 'Unknown chess command. Use /chess help.', 'Неизвестная шахматная команда. Используй /chess help.') };
  };
  ipcMain.handle('chess:getState', (event) => owns(event) ? { state: game.state(), lang: typeof lang === 'function' ? lang() : lang } : null);
  ipcMain.handle('chess:command', (event, request) => { if (!owns(event)) return { ok: false, error: 'Accès refusé.' }; return command(request); });
  return { show, command, get state() { return game.state(); }, isOpen: () => Boolean(win && !win.isDestroyed()), close: () => { if (win && !win.isDestroyed()) win.close(); } };
}

module.exports = { createChessWindow };
