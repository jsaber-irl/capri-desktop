'use strict';
(function (root) {
  const SIZE = 4;
  function spawn(board, random = Math.random) {
    const empty = board.map((value, index) => value ? -1 : index).filter((index) => index >= 0);
    if (!empty.length) return board;
    const index = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
    board[index] = random() < 0.9 ? 2 : 4;
    return board;
  }
  function initial(random = Math.random) {
    const board = Array(SIZE * SIZE).fill(0);
    spawn(board, random);
    spawn(board, random);
    return board;
  }
  function canMove(board) {
    if (board.some((value) => value === 0)) return true;
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
      const i = row * SIZE + col;
      if (col < SIZE - 1 && board[i] === board[i + 1]) return true;
      if (row < SIZE - 1 && board[i] === board[i + SIZE]) return true;
    }
    return false;
  }
  function hasWon(board) { return board.some((value) => value >= 2048); }
  function move(board, direction, random = Math.random) {
    if (!['left', 'right', 'up', 'down'].includes(direction)) return { board: [...board], changed: false, merges: [], won: hasWon(board), gameOver: !canMove(board) };
    const next = [...board];
    const merges = [];
    for (let line = 0; line < SIZE; line++) {
      const ids = Array.from({ length: SIZE }, (_, i) => direction === 'left' || direction === 'right' ? line * SIZE + i : i * SIZE + line);
      if (direction === 'right' || direction === 'down') ids.reverse();
      const values = ids.map((index) => next[index]).filter(Boolean);
      for (let i = 0; i < values.length - 1; i++) {
        if (values[i] !== values[i + 1]) continue;
        values[i] *= 2;
        merges.push(values[i]);
        values.splice(i + 1, 1);
      }
      while (values.length < SIZE) values.push(0);
      ids.forEach((index, i) => { next[index] = values[i]; });
    }
    const changed = next.some((value, index) => value !== board[index]);
    if (changed) spawn(next, random);
    return { board: next, changed, merges, won: hasWon(next), gameOver: !canMove(next), maxTile: Math.max(...next) };
  }
  const api = { SIZE, initial, spawn, move, canMove, hasWon };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.Game2048 = api;
})(typeof window !== 'undefined' ? window : globalThis);
