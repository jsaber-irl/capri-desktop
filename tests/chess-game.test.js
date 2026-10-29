'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ChessGame, parseFen, legalMoves, parseUserMove, inCheck } = require('../src/main/chess-game');

test('new game has the standard 20 legal opening moves and rejects illegal moves', () => {
  const game = new ChessGame({ random: () => 0.5 });
  assert.equal(game.state().legalMoves.length, 20);
  assert.equal(game.play('e2e5').ok, false);
  const result = game.play('e2e4');
  assert.equal(result.ok, true);
  assert.equal(result.state.turn, 'w', 'Capri replies after the user move');
  assert.ok(result.botMove);
  assert.equal(result.state.lastMove.to, result.botMove.slice(2, 4));
});

test('the rules engine handles check, checkmate, and stalemate', () => {
  const mate = parseFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
  assert.equal(inCheck(mate), true);
  assert.equal(legalMoves(mate).length, 0);
  const stalemate = parseFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(inCheck(stalemate), false);
  assert.equal(legalMoves(stalemate).length, 0);
});

test('castling, en passant, and promotion are generated as legal moves', () => {
  const castle = parseFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.ok(legalMoves(castle).some((m) => m.castle === 'k'));
  assert.ok(legalMoves(castle).some((m) => m.castle === 'q'));
  const ep = parseFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2');
  assert.ok(parseUserMove(ep, 'e5d6')?.ep);
  const promotion = parseFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  assert.equal(legalMoves(promotion).filter((m) => m.from === 8 && m.to === 0).length, 4);
  assert.equal(parseUserMove(promotion, 'a7a8q')?.promotion, 'q');
});

test('resignation, new game, and SAN notation remain coherent', () => {
  const game = new ChessGame({ random: () => 0.2 });
  assert.ok(parseUserMove(parseFen(), 'Nf3'));
  assert.equal(game.resign().status, 'resigned');
  assert.equal(game.play('e2e4').ok, false);
  assert.equal(game.newGame().status, 'playing');
});
