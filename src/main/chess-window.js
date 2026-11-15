'use strict';

const { ChessGame } = require('./chess-game');

function createChessWindow({
  BrowserWindow,
  ipcMain,
  preload,
  protocolUrl = 'capri://app/src/renderer/chess.html',
  lang = () => 'fr',
  screen,
  getCommandWebContents = () => null,
}) {
  let win = null;
  const game = new ChessGame();
  const tr = (fr, en, ru) => (lang() === 'en' ? en : lang() === 'ru' ? ru : fr);
  const owns = (event) => Boolean(win && !win.isDestroyed() && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame);
  const mayStart = (event, request) => event.sender === getCommandWebContents()
    && event.senderFrame === event.sender.mainFrame
    && ['start', 'new'].includes(String(request?.action || 'start').toLowerCase());
  const publish = () => { if (win && !win.isDestroyed()) win.webContents.send('chess:state', game.state()); };
  const show = () => {
    if (win && !win.isDestroyed()) { win.show(); win.focus(); publish(); return; }
    const area = screen?.getPrimaryDisplay?.().workArea || { width: 1200, height: 900 };
    const width = Math.min(1120, Math.max(300, area.width - 32));
    const height = Math.min(820, Math.max(380, area.height - 32));
    win = new BrowserWindow({ width, height, minWidth: Math.min(680, width), minHeight: Math.min(500, height), title: 'Capri // Chess', frame: false, show: false, resizable: true, backgroundColor: '#101118', autoHideMenuBar: true, webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.removeMenu?.();
    win.once('ready-to-show', () => { win?.show(); publish(); });
    win.on('closed', () => { win = null; });
    win.loadURL(protocolUrl);
  };
  const command = async (request = {}) => {
    const action = String(request.action || 'start').toLowerCase();
    if (game.thinking && ['new', 'resign'].includes(action)) return { ok: false, error: tr('Attends que Capri termine son coup.', 'Wait for Capri to finish her move.', 'Подожди, пока Capri завершит ход.'), state: game.state() };
    if (action === 'help') return { ok: true, lines: [tr('Clique une pièce puis sa destination, ou saisis /chess move e2e4.', 'Select a piece then its destination, or enter /chess move e2e4.', 'Выбери фигуру и клетку назначения или введи /chess move e2e4.'), tr('/chess new recommence · /chess resign abandonne.', '/chess new starts over · /chess resign resigns.', '/chess new начинает заново · /chess resign сдаётся.')] };
    if (action === 'start' || action === 'new') {
      if (action === 'new') game.newGame();
      show(); publish();
      return { ok: true, state: game.state(), lines: [action === 'new' ? tr('Nouvelle partie lancée.', 'New game started.', 'Новая партия началась.') : tr('Échiquier ouvert. Tu joues les blancs.', 'Chessboard opened. You play White.', 'Доска открыта. Ты играешь белыми.')] };
    }
    if (action === 'resign') { const state = game.resign(); publish(); return { ok: true, state, lines: [tr('Partie abandonnée. Capri gagne.', 'Game resigned. Capri wins.', 'Ты сдался. Победила Capri.')] }; }
    if (action === 'move') {
      const result = await game.playAsync(request.move, { onUserMove: () => publish() });
      publish();
      return result.ok ? { ok: true, state: result.state, userMove: result.userMove, botCapture: result.botCapture, botCheck: result.botCheck, lines: [result.botMove ? tr(`Coup de Capri : ${result.botMove}.`, `Capri played ${result.botMove}.`, `Ход Capri: ${result.botMove}.`) : tr(`Coup joué. État : ${result.state.status}.`, `Move played. Status: ${result.state.status}.`, `Ход сделан. Статус: ${result.state.status}.`)] } : { ok: false, error: result.error, state: game.state() };
    }
    return { ok: false, error: tr('Commande échecs inconnue. Utilise /chess help.', 'Unknown chess command. Use /chess help.', 'Неизвестная шахматная команда. Используй /chess help.') };
  };
  ipcMain.handle('chess:getState', (event) => owns(event) ? { state: game.state(), lang: typeof lang === 'function' ? lang() : lang } : null);
  ipcMain.handle('chess:command', (event, request) => {
    if (!owns(event) && !mayStart(event, request)) return { ok: false, error: 'Accès refusé.' };
    return command(request);
  });
  return { show, command, get state() { return game.state(); }, isOpen: () => Boolean(win && !win.isDestroyed()), close: () => { if (win && !win.isDestroyed()) win.close(); } };
}

module.exports = { createChessWindow };
