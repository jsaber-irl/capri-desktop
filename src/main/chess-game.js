'use strict';

// Small self-contained rules engine for Capri's local chess game. Moves are validated by legal
// move generation (including castling, en passant, promotion, check, mate and stalemate).
const FILES = 'abcdefgh';
const VALUES = { p: 100, n: 310, b: 330, r: 500, q: 900, k: 0 };
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const side = (p) => p === p.toUpperCase() ? 'w' : 'b';
const pieceAt = (p, i) => p.board[i];
const index = (square) => FILES.indexOf(square[0]) >= 0 && /[1-8]/.test(square[1]) ? (8 - Number(square[1])) * 8 + FILES.indexOf(square[0]) : -1;
const square = (i) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}`;
const inside = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;

function parseFen(fen = START) {
  const [layout, turn, castle, ep, halfmove, fullmove] = fen.split(' ');
  const board = [];
  for (const row of layout.split('/')) for (const c of row) c >= '1' && c <= '8' ? board.push(...Array(Number(c)).fill('')) : board.push(c);
  return { board, turn, castle: castle === '-' ? '' : castle, ep: ep === '-' ? -1 : index(ep), halfmove: Number(halfmove) || 0, fullmove: Number(fullmove) || 1 };
}

function toFen(p) {
  const ranks = [];
  for (let r = 0; r < 8; r++) {
    let row = '', empty = 0;
    for (let f = 0; f < 8; f++) {
      const v = p.board[r * 8 + f];
      if (!v) empty++;
      else { if (empty) row += empty; row += v; empty = 0; }
    }
    if (empty) row += empty;
    ranks.push(row);
  }
  return `${ranks.join('/')} ${p.turn} ${p.castle || '-'} ${p.ep < 0 ? '-' : square(p.ep)} ${p.halfmove} ${p.fullmove}`;
}

function attacked(p, target, by) {
  const tr = Math.floor(target / 8), tf = target % 8;
  for (let from = 0; from < 64; from++) {
    const piece = p.board[from];
    if (!piece || side(piece) !== by) continue;
    const type = piece.toLowerCase(), r = Math.floor(from / 8), f = from % 8;
    if (type === 'p') { if (tr === r + (by === 'w' ? -1 : 1) && Math.abs(tf - f) === 1) return true; continue; }
    if (type === 'n' && [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].some(([a,b]) => r+a===tr && f+b===tf)) return true;
    if (type === 'k' && Math.max(Math.abs(tr-r), Math.abs(tf-f)) === 1) return true;
    const dr = tr - r, df = tf - f;
    const straight = dr === 0 || df === 0, diagonal = Math.abs(dr) === Math.abs(df);
    if (!((type === 'b' && diagonal) || (type === 'r' && straight) || (type === 'q' && (straight || diagonal)))) continue;
    const sr = Math.sign(dr), sf = Math.sign(df);
    let rr = r + sr, ff = f + sf, clear = true;
    while (rr !== tr || ff !== tf) { if (p.board[rr * 8 + ff]) { clear = false; break; } rr += sr; ff += sf; }
    if (clear) return true;
  }
  return false;
}

function inCheck(p, color = p.turn) {
  const king = p.board.findIndex((piece) => piece === (color === 'w' ? 'K' : 'k'));
  return king < 0 || attacked(p, king, color === 'w' ? 'b' : 'w');
}

function pseudoMoves(p, color = p.turn) {
  const moves = [];
  const add = (from, to, extra = {}) => { if (to >= 0 && to < 64 && (!p.board[to] || side(p.board[to]) !== color)) moves.push({ from, to, ...extra }); };
  const slide = (from, dirs) => {
    for (const [dr, df] of dirs) {
      let r = Math.floor(from / 8) + dr, f = from % 8 + df;
      while (inside(r, f)) { const to = r * 8 + f; if (p.board[to]) { if (side(p.board[to]) !== color) add(from, to); break; } add(from, to); r += dr; f += df; }
    }
  };
  for (let from = 0; from < 64; from++) {
    const piece = p.board[from];
    if (!piece || side(piece) !== color) continue;
    const type = piece.toLowerCase(), r = Math.floor(from / 8), f = from % 8;
    if (type === 'p') {
      const step = color === 'w' ? -1 : 1, nextR = r + step;
      if (inside(nextR, f) && !p.board[nextR * 8 + f]) {
        const to = nextR * 8 + f;
        if (nextR === 0 || nextR === 7) for (const promotion of ['q','r','b','n']) add(from, to, { promotion }); else add(from, to);
        if (r === (color === 'w' ? 6 : 1) && !p.board[(r + 2 * step) * 8 + f]) add(from, (r + 2 * step) * 8 + f);
      }
      for (const df of [-1, 1]) {
        const ff = f + df, to = nextR * 8 + ff;
        if (!inside(nextR, ff)) continue;
        if (p.board[to] && side(p.board[to]) !== color || to === p.ep) {
          const ep = to === p.ep && !p.board[to];
          if (nextR === 0 || nextR === 7) for (const promotion of ['q','r','b','n']) add(from, to, { promotion, ep }); else add(from, to, ep ? { ep: true } : {});
        }
      }
      continue;
    }
    if (type === 'n') { for (const [dr,df] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) { const rr=r+dr, ff=f+df; if(inside(rr,ff)) add(from,rr*8+ff); } continue; }
    if (type === 'b') { slide(from,[[-1,-1],[-1,1],[1,-1],[1,1]]); continue; }
    if (type === 'r') { slide(from,[[-1,0],[1,0],[0,-1],[0,1]]); continue; }
    if (type === 'q') { slide(from,[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); continue; }
    for (let dr=-1;dr<=1;dr++) for (let df=-1;df<=1;df++) if(dr||df) { const rr=r+dr, ff=f+df; if(inside(rr,ff)) add(from,rr*8+ff); }
    const home = color === 'w' ? 60 : 4, enemy = color === 'w' ? 'b' : 'w';
    if (from === home && !inCheck(p, color)) {
      const right = color === 'w' ? 'K' : 'k', left = color === 'w' ? 'Q' : 'q';
      if (p.castle.includes(right) && !p.board[home+1] && !p.board[home+2] && p.board[home+3] === (color === 'w' ? 'R' : 'r') && !attacked(p,home+1,enemy) && !attacked(p,home+2,enemy)) add(from,home+2,{castle:'k'});
      if (p.castle.includes(left) && !p.board[home-1] && !p.board[home-2] && !p.board[home-3] && p.board[home-4] === (color === 'w' ? 'R' : 'r') && !attacked(p,home-1,enemy) && !attacked(p,home-2,enemy)) add(from,home-2,{castle:'q'});
    }
  }
  return moves;
}

function applyMove(p, move) {
  const board = p.board.slice(), piece = board[move.from], target = board[move.to];
  board[move.from] = '';
  if (move.ep) board[move.to + (p.turn === 'w' ? 8 : -8)] = '';
  if (move.castle === 'k') { board[move.to - 1] = board[move.to + 1]; board[move.to + 1] = ''; }
  if (move.castle === 'q') { board[move.to + 1] = board[move.to - 2]; board[move.to - 2] = ''; }
  board[move.to] = move.promotion ? (p.turn === 'w' ? move.promotion.toUpperCase() : move.promotion) : piece;
  let rights = p.castle;
  if (piece === 'K') rights = rights.replace(/[KQ]/g, ''); if (piece === 'k') rights = rights.replace(/[kq]/g, '');
  const rookRights = { 63:'K',56:'Q',7:'k',0:'q' };
  if (piece.toLowerCase() === 'r' && rookRights[move.from]) rights = rights.replace(rookRights[move.from], '');
  if (target.toLowerCase?.() === 'r' && rookRights[move.to]) rights = rights.replace(rookRights[move.to], '');
  const ep = piece.toLowerCase() === 'p' && Math.abs(move.to - move.from) === 16 ? (move.to + move.from) / 2 : -1;
  return { board, turn: p.turn === 'w' ? 'b' : 'w', castle: rights, ep, halfmove: piece.toLowerCase() === 'p' || target ? 0 : p.halfmove + 1, fullmove: p.fullmove + (p.turn === 'b' ? 1 : 0), lastMove: { from: square(move.from), to: square(move.to) } };
}

function legalMoves(p, color = p.turn) {
  return pseudoMoves(p, color).filter((move) => !inCheck(applyMove({ ...p, turn: color }, move), color));
}

function parseUserMove(p, value) {
  const moves = legalMoves(p);
  const raw = String(value || '').trim();
  const uci = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i.exec(raw);
  if (uci) return moves.find((m) => square(m.from) === uci[1].toLowerCase() && square(m.to) === uci[2].toLowerCase() && (m.promotion || '') === (uci[3] || '').toLowerCase()) || null;
  const san = raw.replace(/0/g, 'O').replace(/[+#?!]+$/g, '').replace(/=/g, '').replace(/x/g, '').trim();
  if (san === 'O-O' || san === 'O-O-O') return moves.find((m) => m.castle === (san === 'O-O' ? 'k' : 'q')) || null;
  const match = /^(K|Q|R|B|N)?([a-h1-8]{0,2})([a-h][1-8])([QRBN])?$/i.exec(san);
  if (!match) return null;
  const [, prefix = '', disambiguation = '', dest, promo = ''] = match;
  const type = prefix ? prefix.toLowerCase() : 'p', to = index(dest);
  return moves.find((m) => {
    const piece = p.board[m.from];
    return piece.toLowerCase() === type && m.to === to && (m.promotion || '').toLowerCase() === promo.toLowerCase()
      && (!disambiguation || `${FILES[m.from%8]}${8-Math.floor(m.from/8)}`.includes(disambiguation.toLowerCase()));
  }) || null;
}

function key(p) { const fen = toFen(p).split(' '); return fen.slice(0,4).join(' '); }
function insufficient(p) {
  const minors = p.board.map((v,i) => ({v,i})).filter(({v}) => v && !'PKpk'.includes(v));
  if (!minors.length) return true;
  if (minors.length === 1 && ['b','n'].includes(minors[0].v.toLowerCase())) return true;
  return minors.every(({v}) => v.toLowerCase() === 'b') && new Set(minors.map(({i}) => (Math.floor(i/8)+i%8)%2)).size === 1;
}

function evaluate(p) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const piece = p.board[i]; if (!piece) continue;
    const white = side(piece) === 'w', type = piece.toLowerCase(), r = Math.floor(i/8), f = i%8;
    const center = 3.5 - (Math.abs(3.5-r) + Math.abs(3.5-f)) / 2;
    const advance = white ? 6-r : r-1;
    const positional = type === 'p' ? advance * 5 + center * 2 : ['n','b'].includes(type) ? center * 7 : type === 'q' ? center * 2 : 0;
    score += (white ? 1 : -1) * (VALUES[type] + positional);
  }
  return score;
}

function negamax(p, depth, alpha, beta) {
  const moves = legalMoves(p);
  if (!moves.length) return inCheck(p) ? (p.turn === 'w' ? -100000 : 100000) : 0;
  if (!depth) return evaluate(p) * (p.turn === 'w' ? 1 : -1);
  let best = -Infinity;
  for (const move of moves) {
    const value = -negamax(applyMove(p, move), depth - 1, -beta, -alpha);
    best = Math.max(best, value); alpha = Math.max(alpha, value);
    if (alpha >= beta) break;
  }
  return best;
}

class ChessGame {
  constructor({ random = Math.random } = {}) { this.random = random; this.newGame(); }
  newGame() { this.position = parseFen(); this.history = [key(this.position)]; this.resigned = false; return this.state(); }
  play(value) {
    if (this.resigned || this.outcome()) return { ok: false, error: 'La partie est terminée.' };
    if (this.position.turn !== 'w') return { ok: false, error: 'Capri réfléchit à son coup.' };
    const move = parseUserMove(this.position, value);
    if (!move) return { ok: false, error: 'Coup illégal ou notation non reconnue.' };
    this.position = applyMove(this.position, move); this.history.push(key(this.position));
    const userState = this.state();
    if (userState.status !== 'playing') return { ok: true, userState, state: userState };
    const reply = this.chooseBotMove();
    if (reply) { this.position = applyMove(this.position, reply); this.history.push(key(this.position)); }
    return { ok: true, userState, state: this.state(), botMove: reply ? `${square(reply.from)}${square(reply.to)}${reply.promotion || ''}` : '' };
  }
  chooseBotMove() {
    const moves = legalMoves(this.position);
    if (!moves.length) return null;
    const ranked = moves.map((move) => {
      const next = applyMove(this.position, move);
      const value = negamax(next, 2, -Infinity, Infinity); // White-to-move perspective: Black minimizes it.
      // Small, occasional blunders make this a casual beginner opponent; this is not a calibrated Elo rating.
      const wobble = this.random() < 0.18 ? this.random() * 160 - 80 : this.random() * 18 - 9;
      return { move, value: value + wobble };
    });
    ranked.sort((a,b) => a.value - b.value);
    const pool = ranked.slice(0, Math.min(3, ranked.length));
    return pool[Math.floor(this.random() * pool.length)].move;
  }
  resign() { if (this.outcome()) return this.state(); this.resigned = true; return this.state(); }
  outcome() { return this.state().status !== 'playing'; }
  state() {
    const moves = legalMoves(this.position), checked = inCheck(this.position), draws = this.history.filter((k) => k === key(this.position)).length >= 3 || this.position.halfmove >= 100 || insufficient(this.position);
    let status = 'playing';
    if (this.resigned) status = 'resigned';
    else if (!moves.length) status = checked ? (this.position.turn === 'w' ? 'black-won' : 'white-won') : 'stalemate';
    else if (draws) status = 'draw';
    return { fen: toFen(this.position), turn: this.position.turn, status, inCheck: checked, legalMoves: moves.map((m) => ({ from: square(m.from), to: square(m.to), promotion: m.promotion || '' })), lastMove: this.position.lastMove || null, winner: this.resigned ? 'black' : status === 'white-won' ? 'white' : status === 'black-won' ? 'black' : null };
  }
}

module.exports = { ChessGame, parseFen, toFen, legalMoves, parseUserMove, applyMove, index, square, inCheck, START };
