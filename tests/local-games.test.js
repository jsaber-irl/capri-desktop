'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const TTT = require('../src/renderer/games/tic-tac-toe');
const G2048 = require('../src/renderer/games/2048');

test('tic-tac-toe separates a legal user move from Capri response and rejects occupied squares', () => {
  let state = TTT.fresh();
  state = TTT.playerMove(state, 0);
  assert.equal(state.board[0], 'X');
  assert.equal(TTT.playerMove(state, 0), state);
  state = TTT.capriMove(state, () => 0);
  assert.equal(state.board.filter(Boolean).length, 2);
  assert.equal(TTT.winner(state.board), null);
});

test('2048 merges once per tile and does not alter a board for an invalid move', () => {
  const board = [2, 2, 2, 2, ...Array(12).fill(0)];
  const result = G2048.move(board, 'left', () => 0);
  assert.deepEqual(result.merges, [4, 4]);
  assert.equal(result.board[0], 4);
  assert.equal(result.board[1], 4);
  assert.equal(G2048.move(board, 'sideways').changed, false);
});

test('2048 recognizes win and a full board with no adjacent matches as terminal', () => {
  const win = G2048.move([1024, 1024, ...Array(14).fill(0)], 'left', () => 0.99);
  assert.equal(win.won, true);
  const stuck = [2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];
  assert.equal(G2048.canMove(stuck), false);
  assert.equal(G2048.move(stuck, 'left').gameOver, true);
});

test('2048 can reach the target and have no legal moves on that same turn', () => {
  const board = [1024, 1024, 8, 4, 4, 2, 8, 4, 8, 4, 2, 8, 2, 8, 4, 2];
  const result = G2048.move(board, 'left', () => 0);
  assert.equal(result.won, true);
  assert.equal(result.gameOver, true);
});

test('the tic-tac-toe response timer is cancelled on restart and window close', () => {
  class Element {
    constructor() { this.children = []; this.handlers = {}; this.attributes = {}; this.classList = { add() {}, remove() {}, toggle() {} }; }
    addEventListener(name, callback) { this.handlers[name] = callback; }
    setAttribute(name, value) { this.attributes[name] = value; }
    replaceChildren(...children) { this.children = children; }
    append(child) { this.children.push(child); }
  }
  const elements = Object.fromEntries(['board', 'message', 'game-title', 'restart', 'close'].map((id) => [id, new Element()]));
  const timers = [];
  let closeCount = 0;
  const windowHandlers = {};
  const window = { gameWindow: { close() { closeCount++; } }, addEventListener(name, callback) { windowHandlers[name] = callback; } };
  const document = { getElementById: (id) => elements[id], createElement: () => new Element(), body: { classList: { add() {}, remove() {}, toggle() {} } }, documentElement: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/game.js'), 'utf8');
  vm.runInNewContext(source, {
    URLSearchParams, location: { search: '?game=tic-tac-toe&lang=en' }, document, window,
    TicTacToe: TTT, Game2048: G2048, Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
    setTimeout(callback) { const timer = { callback, cleared: false }; timers.push(timer); return timer; },
    clearTimeout(timer) { if (timer) timer.cleared = true; },
  });
  elements.board.children[0].handlers.click();
  assert.equal(timers.length, 1);
  const staleAfterRestart = timers[0];
  elements.restart.handlers.click();
  assert.equal(staleAfterRestart.cleared, true);
  staleAfterRestart.callback();
  assert.ok(elements.board.children.every((cell) => !cell.textContent), 'stale Capri move cannot alter a new board');

  elements.board.children[0].handlers.click();
  const staleAfterClose = timers[1];
  elements.close.handlers.click();
  assert.equal(staleAfterClose.cleared, true);
  assert.equal(closeCount, 1);
  staleAfterClose.callback();
  assert.equal(elements.board.children.filter((cell) => cell.textContent).length, 1, 'closed game receives no delayed Capri move');
});
