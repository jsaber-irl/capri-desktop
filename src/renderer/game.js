'use strict';

const params = new URLSearchParams(location.search);
const id = params.get('game');
const lang = ['en', 'ru', 'fr'].includes(params.get('lang')) ? params.get('lang') : 'fr';
const boardEl = document.getElementById('board');
const message = document.getElementById('message');
const title = document.getElementById('game-title');
const copy = {
  fr: { ttt: 'Morpion contre Capri', your: 'À toi : X · Capri : O', think: 'Capri réfléchit…', draw: 'Égalité. Nouvelle partie ?', youWin: 'Partie terminée : tu as gagné.', capriWin: 'Partie terminée : Capri a gagné.', blocked: 'Capri réfléchit…', threat: 'Capri réfléchit…', thinking: 'Capri réfléchit…', gameOver: 'Plus de coup possible. Nouvelle partie ?', won2048: '2048 atteint.', canContinue: 'Tu peux continuer.', bigMerge: 'Déplacement effectué.', highTile: 'Déplacement effectué.', restart: 'Nouvelle partie', close: 'Fermer le jeu', keyHelp: 'Flèches ou glissement · Échap ferme cette fenêtre.' },
  en: { ttt: 'Tic-tac-toe vs Capri', your: 'Your turn: X · Capri: O', think: 'Capri is thinking…', draw: 'Draw. Start a new game?', youWin: 'Game over: you won.', capriWin: 'Game over: Capri won.', blocked: 'Capri is thinking…', threat: 'Capri is thinking…', thinking: 'Capri is thinking…', gameOver: 'No moves left. Start a new game?', won2048: '2048 reached.', canContinue: 'You can keep playing.', bigMerge: 'Move complete.', highTile: 'Move complete.', restart: 'New game', close: 'Close game', keyHelp: 'Arrow keys or swipe · Escape closes this window.' },
  ru: { ttt: 'Крестики-нолики с Capri', your: 'Твой ход: X · Capri: O', think: 'Capri думает…', draw: 'Ничья. Начать заново?', youWin: 'Игра окончена: ты победил.', capriWin: 'Игра окончена: победила Capri.', blocked: 'Capri думает…', threat: 'Capri думает…', thinking: 'Capri думает…', gameOver: 'Ходов больше нет. Начать заново?', won2048: 'Достигнуто 2048.', canContinue: 'Можно продолжать.', bigMerge: 'Ход завершён.', highTile: 'Ход завершён.', restart: 'Новая игра', close: 'Закрыть игру', keyHelp: 'Стрелки или свайп · Escape закрывает это окно.' },
};
const t = copy[lang];
let state;
let thinking = false;
let ended2048 = false;
let winAnnounced = false;
let turnId = 0;
let lastQuip = '';
let thinkTimer = null;
let gameClosing = false;
const pick = (key) => {
  const choices = Array.isArray(t[key]) ? t[key] : [t[key]];
  const distinct = choices.filter((line) => line && line !== lastQuip);
  const line = (distinct.length ? distinct : choices)[Math.floor(Math.random() * (distinct.length || choices.length))];
  lastQuip = line || '';
  return line || '';
};
const report = (reaction) => { void window.gameWindow.react(reaction).catch(() => {}); };

function draw() {
  boardEl.replaceChildren();
  if (id === 'tic-tac-toe') {
    boardEl.className = 'ttt';
    state.board.forEach((mark, index) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.textContent = mark || '';
      cell.disabled = Boolean(mark) || Boolean(state.over) || thinking;
      cell.setAttribute('aria-label', `${lang === 'fr' ? 'Case' : lang === 'ru' ? 'Клетка' : 'Cell'} ${index + 1} ${mark || ''}`);
      cell.addEventListener('click', () => playTicTacToe(index));
      boardEl.append(cell);
    });
    if (!message.textContent) message.textContent = thinking ? pick('think') : state.over ? outcomeLine(state.over) : t.your;
    document.body.classList.toggle('is-thinking', thinking);
    return;
  }
  boardEl.className = 'grid2048';
  state.forEach((value) => {
    const cell = document.createElement('div');
    cell.className = `tile v${Math.min(value, 2048)}`;
    cell.textContent = value || '';
    cell.setAttribute('aria-label', value ? String(value) : (lang === 'fr' ? 'Vide' : lang === 'ru' ? 'Пусто' : 'Empty'));
    boardEl.append(cell);
  });
  document.body.classList.remove('is-thinking');
  if (ended2048) message.textContent = winAnnounced ? `${t.won2048} ${t.gameOver}` : t.gameOver;
  else if (!message.textContent) message.textContent = t.keyHelp;
}

function outcomeLine(outcome) {
  return pick(outcome === 'draw' ? 'draw' : outcome === 'X' ? 'youWin' : 'capriWin');
}

function playTicTacToe(index) {
  if (gameClosing || thinking || state.over || state.board[index]) return;
  const before = state;
  const blocksCapri = TicTacToe.tacticalMove(before.board, 'O') === index;
  const next = TicTacToe.playerMove(before, index);
  if (next === before) return;
  state = next;
  if (state.over) {
    const event = state.over === 'draw' ? 'draw' : state.over === 'X' ? 'user-win' : 'capri-win';
    report(event);
    message.textContent = pick(state.over === 'draw' ? 'draw' : state.over === 'X' ? 'youWin' : 'capriWin');
    draw();
    return;
  }
  const hasThreat = TicTacToe.tacticalMove(state.board, 'X') >= 0;
  if (blocksCapri) report('blocked');
  else if (hasThreat) report('threat');
  message.textContent = blocksCapri ? t.blocked : hasThreat ? t.threat : pick('thinking');
  thinking = true;
  draw();
  const turn = ++turnId;
  // A short, non-blocking pause lets Capri visibly consider the board before replying.
  thinkTimer = setTimeout(() => {
    thinkTimer = null;
    if (gameClosing || turn !== turnId || !thinking || id !== 'tic-tac-toe') return;
    state = TicTacToe.capriMove(state);
    thinking = false;
    if (state.over) {
      report(state.over === 'draw' ? 'draw' : state.over === 'X' ? 'user-win' : 'capri-win');
      message.textContent = outcomeLine(state.over);
    }
    else if (message.textContent === t.thinking) message.textContent = t.your;
    draw();
  }, 360 + Math.floor(Math.random() * 180));
}

function play2048(direction) {
  if (id !== '2048' || ended2048) return;
  const before = state;
  const result = Game2048.move(state, direction);
  if (!result.changed) {
    if (result.gameOver && !ended2048) { ended2048 = true; report('game-over'); draw(); }
    return;
  }
  state = result.board;
  if (result.won && !winAnnounced) {
    winAnnounced = true;
    report('win');
    if (result.gameOver) ended2048 = true;
    message.textContent = `${t.won2048} ${result.gameOver ? t.gameOver : t.canContinue}`;
  } else if (result.gameOver) {
    ended2048 = true;
    report('game-over');
    message.textContent = t.gameOver;
  } else if (result.merges.some((value) => value >= 128)) {
    report('big-merge');
    message.textContent = t.bigMerge;
  } else if (result.maxTile >= 512 && Math.max(...before) < result.maxTile) {
    report('high-tile');
    message.textContent = t.highTile;
  } else {
    message.textContent = t.keyHelp;
  }
  draw();
}

function restart() {
  turnId += 1;
  clearTimeout(thinkTimer);
  thinkTimer = null;
  gameClosing = false;
  thinking = false;
  ended2048 = false;
  winAnnounced = false;
  lastQuip = '';
  state = id === 'tic-tac-toe' ? TicTacToe.fresh() : Game2048.initial();
  message.textContent = '';
  draw();
}

function closeGame() {
  gameClosing = true;
  turnId += 1;
  clearTimeout(thinkTimer);
  thinkTimer = null;
  window.gameWindow.close();
}

title.textContent = id === 'tic-tac-toe' ? t.ttt : '2048';
document.documentElement.lang = lang;
document.getElementById('restart').textContent = t.restart;
document.getElementById('close').setAttribute('aria-label', t.close);
document.getElementById('close').addEventListener('click', closeGame);
document.getElementById('restart').addEventListener('click', restart);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closeGame(); return; }
  if (id !== '2048' || event.repeat) return;
  const direction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[event.key];
  if (!direction) return;
  event.preventDefault();
  play2048(direction);
});
let touchX = 0;
let touchY = 0;
boardEl.addEventListener('touchstart', (event) => {
  touchX = event.changedTouches[0].clientX;
  touchY = event.changedTouches[0].clientY;
}, { passive: true });
boardEl.addEventListener('touchend', (event) => {
  if (id !== '2048') return;
  const dx = event.changedTouches[0].clientX - touchX;
  const dy = event.changedTouches[0].clientY - touchY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  play2048(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
}, { passive: true });
window.addEventListener('pagehide', () => {
  gameClosing = true;
  turnId += 1;
  clearTimeout(thinkTimer);
  thinkTimer = null;
});
restart();
