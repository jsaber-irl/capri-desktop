'use strict';

const params = new URLSearchParams(location.search);
const id = params.get('game');
const lang = ['en', 'ru', 'fr'].includes(params.get('lang')) ? params.get('lang') : 'fr';
const boardEl = document.getElementById('board');
const message = document.getElementById('message');
const title = document.getElementById('game-title');
const copy = {
  fr: { ttt: 'Morpion contre Capri', your: 'À toi : X · Capri : O', think: 'Capri réfléchit…', draw: ['Égalité ! Bien joué.', 'On était à deux doigts de gagner !'], youWin: ['Tu as gagné ! Je veux ma revanche.', 'Bien joué… je prends ma revanche quand tu veux !'], capriWin: ['Hihi, cette fois, c’est moi !', 'Yes ! Une petite victoire pour Capri !'], blocked: ['Oh, tu avais prévu ce blocage ?', 'Bien vu, tu m’as arrêtée juste à temps !'], threat: ['Pas mal… tu prépares un alignement.', 'Oh, tu construis une belle attaque !'], thinking: 'Je cherche un coup…', gameOver: 'Plus de coup possible. Nouvelle partie ?', won2048: '2048 ! Incroyable, tu l’as fait ! Tu peux continuer.', bigMerge: ['Oh ! Quelle fusion !', 'Cette combinaison était énorme !'], highTile: 'La grille se remplit… reste concentré.', restart: 'Nouvelle partie', close: 'Fermer le jeu', keyHelp: 'Flèches ou glissement · Échap ferme cette fenêtre.' },
  en: { ttt: 'Tic-tac-toe vs Capri', your: 'Your turn: X · Capri: O', think: 'Capri is thinking…', draw: ['A draw! Nicely played.', 'That was a close one!'], youWin: ['You won! I want a rematch.', 'Well played… rematch whenever you like!'], capriWin: ['Hehe, this one’s mine!', 'Yes! A little win for Capri!'], blocked: ['Oh, did you plan that block?', 'Nice save, you stopped me just in time!'], threat: ['Not bad… setting up a line?', 'Oh, that attack is coming together!'], thinking: 'Thinking of a move…', gameOver: 'No moves left. Start a new game?', won2048: '2048! You did it! You can keep playing.', bigMerge: ['Whoa, what a merge!', 'That was a huge combo!'], highTile: 'The board is filling up… stay sharp.', restart: 'New game', close: 'Close game', keyHelp: 'Arrow keys or swipe · Escape closes this window.' },
  ru: { ttt: 'Крестики-нолики с Capri', your: 'Твой ход: X · Capri: O', think: 'Capri думает…', draw: ['Ничья! Хорошая игра.', 'Вот это была напряжённая партия!'], youWin: ['Ты победил! Хочу реванш.', 'Отличная игра… сыграем ещё!'], capriWin: ['Хи-хи, в этот раз моя победа!', 'Ура! Маленькая победа Capri!'], blocked: ['О, ты заранее придумал блокировку?', 'Хорошо! Ты остановил меня вовремя.'], threat: ['Неплохо… готовишь линию?', 'О, атака начинает складываться!'], thinking: 'Ищу ход…', gameOver: 'Ходов больше нет. Начать заново?', won2048: '2048! Невероятно, получилось! Можно продолжать.', bigMerge: ['Вот это слияние!', 'Какая мощная комбинация!'], highTile: 'Поле заполняется… будь внимателен.', restart: 'Новая игра', close: 'Закрыть игру', keyHelp: 'Стрелки или свайп · Escape закрывает это окно.' },
};
const t = copy[lang];
let state;
let thinking = false;
let ended2048 = false;
let winAnnounced = false;
let turnId = 0;
let lastQuip = '';
const pick = (key) => {
  const choices = Array.isArray(t[key]) ? t[key] : [t[key]];
  const distinct = choices.filter((line) => line && line !== lastQuip);
  const line = (distinct.length ? distinct : choices)[Math.floor(Math.random() * (distinct.length || choices.length))];
  lastQuip = line || '';
  return line || '';
};

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
    if (!message.textContent || !thinking) message.textContent = thinking ? pick('think') : state.over ? outcomeLine(state.over) : t.your;
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
  if (ended2048) message.textContent = t.gameOver;
  else if (!message.textContent) message.textContent = t.keyHelp;
}

function outcomeLine(outcome) {
  return pick(outcome === 'draw' ? 'draw' : outcome === 'X' ? 'youWin' : 'capriWin');
}

function playTicTacToe(index) {
  if (thinking || state.over || state.board[index]) return;
  const before = state;
  const blocksCapri = TicTacToe.tacticalMove(before.board, 'O') === index;
  const next = TicTacToe.playerMove(before, index);
  if (next === before) return;
  state = next;
  if (state.over) {
    message.textContent = pick(state.over === 'draw' ? 'draw' : state.over === 'X' ? 'youWin' : 'capriWin');
    draw();
    return;
  }
  const hasThreat = TicTacToe.tacticalMove(state.board, 'X') >= 0;
  message.textContent = blocksCapri ? pick('blocked') : hasThreat ? pick('threat') : pick('thinking');
  thinking = true;
  draw();
  const turn = ++turnId;
  // A short, non-blocking pause lets Capri visibly consider the board before replying.
  setTimeout(() => {
    if (turn !== turnId || !thinking || id !== 'tic-tac-toe') return;
    state = TicTacToe.capriMove(state);
    thinking = false;
    draw();
    if (state.over) message.textContent = pick(state.over === 'draw' ? 'draw' : state.over === 'X' ? 'youWin' : 'capriWin');
  }, 360 + Math.floor(Math.random() * 180));
}

function play2048(direction) {
  if (id !== '2048' || ended2048) return;
  const before = state;
  const result = Game2048.move(state, direction);
  if (!result.changed) {
    if (result.gameOver) { ended2048 = true; draw(); }
    return;
  }
  state = result.board;
  if (result.won && !winAnnounced) {
    winAnnounced = true;
    message.textContent = t.won2048;
  } else if (result.gameOver) {
    ended2048 = true;
    message.textContent = t.gameOver;
  } else if (result.merges.some((value) => value >= 128)) {
    message.textContent = pick('bigMerge');
  } else if (result.maxTile >= 512 && Math.max(...before) < result.maxTile) {
    message.textContent = t.highTile;
  } else {
    message.textContent = t.keyHelp;
  }
  draw();
}

function restart() {
  turnId += 1;
  thinking = false;
  ended2048 = false;
  winAnnounced = false;
  lastQuip = '';
  state = id === 'tic-tac-toe' ? TicTacToe.fresh() : Game2048.initial();
  message.textContent = '';
  draw();
}

title.textContent = id === 'tic-tac-toe' ? t.ttt : '2048';
document.documentElement.lang = lang;
document.getElementById('restart').textContent = t.restart;
document.getElementById('close').setAttribute('aria-label', t.close);
document.getElementById('close').addEventListener('click', () => window.gameWindow.close());
document.getElementById('restart').addEventListener('click', restart);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { window.gameWindow.close(); return; }
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
restart();
