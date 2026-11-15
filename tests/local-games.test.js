'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
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
