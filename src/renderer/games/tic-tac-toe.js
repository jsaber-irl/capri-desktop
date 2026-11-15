'use strict';
(function (root) {
  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function winner(board) {
    for (const [a, b, c] of LINES) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    return board.every(Boolean) ? 'draw' : null;
  }
  const fresh = () => ({ board: Array(9).fill(null), over: null });
  function playerMove(state, index) {
    if (state.over || !Number.isInteger(index) || index < 0 || index >= 9 || state.board[index]) return state;
    const board = [...state.board]; board[index] = 'X';
    return { board, over: winner(board), last: index };
  }
  function tacticalMove(board, mark) {
    return LINES.map((line) => {
      const marks = line.filter((i) => board[i] === mark).length;
      const open = line.filter((i) => !board[i]);
      return marks === 2 && open.length === 1 ? open[0] : -1;
    }).find((index) => index >= 0) ?? -1;
  }
  function capriMove(state, random = Math.random) {
    if (state.over) return state;
    const available = state.board.map((mark, index) => mark ? -1 : index).filter((index) => index >= 0);
    if (!available.length) return { ...state, over: winner(state.board) || 'draw' };
    const choice = tacticalMove(state.board, 'O') >= 0 ? tacticalMove(state.board, 'O')
      : tacticalMove(state.board, 'X') >= 0 ? tacticalMove(state.board, 'X')
        : available[Math.min(available.length - 1, Math.floor(random() * available.length))];
    const board = [...state.board]; board[choice] = 'O';
    return { board, over: winner(board), last: choice };
  }
  // Keep the original synchronous helper for callers and tests; the window uses the
  // separated moves so it can show Capri thinking before the reply is applied.
  function move(state, index, random = Math.random) {
    const next = playerMove(state, index);
    return next === state || next.over ? next : capriMove(next, random);
  }
  const api = { LINES, winner, fresh, playerMove, capriMove, move, tacticalMove };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TicTacToe = api;
})(typeof window !== 'undefined' ? window : globalThis);
