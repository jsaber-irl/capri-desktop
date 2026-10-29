'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const board = $('board'), statusEl = $('status'), messageEl = $('message'), promotion = $('promotion');
  const glyphs = { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙', k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
  const TXT = {
    fr: { turn: (who) => `À toi (${who})`, bot: 'Capri réfléchit…', check: 'Échec !', mate: (who) => `Échec et mat — ${who} gagne.`, draw: 'Partie nulle.', stalemate: 'Pat — partie nulle.', resigned: 'Partie abandonnée.', whitewon: 'Tu as gagné !', blackwon: 'Capri a gagné.', moves: 'Nouvelle partie · abandonner · aide', title: 'Échecs avec Capri', new: 'Nouvelle partie', resign: 'Abandonner', help: 'Aide', close: 'Fermer', board: 'Échiquier', loading: 'Chargement…', illegal: 'Coup impossible.' },
    en: { turn: (who) => `Your turn (${who})`, bot: 'Capri is thinking…', check: 'Check!', mate: (who) => `Checkmate — ${who} wins.`, draw: 'Draw.', stalemate: 'Stalemate — draw.', resigned: 'Game resigned.', whitewon: 'You won!', blackwon: 'Capri won.', moves: 'New game · resign · help', title: 'Chess with Capri', new: 'New game', resign: 'Resign', help: 'Help', close: 'Close', board: 'Chessboard', loading: 'Loading…', illegal: 'Invalid move.' },
    ru: { turn: (who) => `Твой ход (${who})`, bot: 'Capri думает…', check: 'Шах!', mate: (who) => `Мат — победил ${who}.`, draw: 'Ничья.', stalemate: 'Пат — ничья.', resigned: 'Партия сдана.', whitewon: 'Ты победил!', blackwon: 'Победила Capri.', moves: 'Новая партия · сдаться · помощь', title: 'Шахматы с Capri', new: 'Новая партия', resign: 'Сдаться', help: 'Помощь', close: 'Закрыть', board: 'Шахматная доска', loading: 'Загрузка…', illegal: 'Недопустимый ход.' },
  };
  let lang = 'fr', userName = '', gameState = null, selected = '', pendingPromotion = null, busy = false;
  const tr = () => TXT[lang] || TXT.fr;
  const matrix = () => {
    const [placement] = gameState.fen.split(' ');
    return placement.split('/').flatMap((row) => [...row].flatMap((c) => c >= '1' && c <= '8' ? Array(Number(c)).fill('') : c));
  };
  const coords = (n) => `${'abcdefgh'[n % 8]}${8 - Math.floor(n / 8)}`;
  function render() {
    if (!gameState) return;
    const pieces = matrix();
    const turnText = gameState.turn === 'w' ? (userName || (lang === 'ru' ? 'Вы' : lang === 'en' ? 'You' : 'Toi')) : 'Capri';
    let status = tr().turn(turnText);
    if (gameState.status === 'resigned') status = tr().resigned;
    else if (gameState.status === 'stalemate') status = tr().stalemate;
    else if (gameState.status === 'draw') status = tr().draw;
    else if (gameState.status === 'white-won') status = tr().mate(lang === 'ru' ? 'ты' : lang === 'en' ? 'you' : userName || 'toi');
    else if (gameState.status === 'black-won') status = tr().mate('Capri');
    else if (gameState.inCheck) status = `${status} · ${tr().check}`;
    else if (gameState.turn === 'b') status = tr().bot;
    statusEl.textContent = status;
    $('title').textContent = tr().title;
    $('new').textContent = tr().new;
    $('resign').textContent = tr().resign;
    $('help').textContent = tr().help;
    $('close').setAttribute('aria-label', tr().close);
    board.setAttribute('aria-label', tr().board);
    $('status').parentElement.lang = lang;
    const moves = gameState.legalMoves || [];
    board.replaceChildren(...pieces.map((piece, i) => {
      const from = coords(i), button = document.createElement('button');
      button.type = 'button'; button.className = `square ${((Math.floor(i/8)+i%8)%2) ? 'square--dark' : 'square--light'}`;
      if (piece) { button.dataset.piece = piece === piece.toUpperCase() ? 'white' : 'black'; button.textContent = glyphs[piece]; }
      if (selected === from) button.classList.add('is-selected');
      if (moves.some((m) => m.to === from && m.from === selected)) button.classList.add('is-target');
      if (gameState.lastMove && (gameState.lastMove.from === from || gameState.lastMove.to === from)) button.classList.add('is-last');
      if (piece && (Math.floor(i / 8) === 7 || i % 8 === 0)) { const label = document.createElement('span'); label.className='square__coord'; label.textContent=from; button.append(label); }
      button.setAttribute('aria-label', `${from}${piece ? ` ${piece}` : ''}`);
      button.addEventListener('click', () => choose(from, piece));
      return button;
    }));
    const ended = gameState.status !== 'playing';
    $('resign').disabled = ended;
  }
  function choose(to, piece) {
    if (busy || gameState?.status !== 'playing' || gameState.turn !== 'w') return;
    if (selected) {
      const options = gameState.legalMoves.filter((m) => m.from === selected && m.to === to);
      if (options.length) {
        const promotions = options.filter((m) => m.promotion);
        if (promotions.length) { pendingPromotion = { from: selected, to }; showPromotions(promotions); return; }
        void play(`${selected}${to}`); selected = ''; render(); return;
      }
    }
    if (piece && piece === piece.toUpperCase()) selected = to;
    else selected = '';
    promotion.hidden = true;
    render();
  }
  function showPromotions(moves) {
    promotion.hidden = false;
    const names = { q:'♕', r:'♖', b:'♗', n:'♘' };
    promotion.replaceChildren(...moves.map((move) => {
      const button = document.createElement('button'); button.type='button'; button.textContent=names[move.promotion]; button.setAttribute('aria-label', move.promotion);
      button.addEventListener('click', () => { void play(`${pendingPromotion.from}${pendingPromotion.to}${move.promotion}`); promotion.hidden = true; pendingPromotion = null; selected = ''; });
      return button;
    }));
  }
  async function play(move) {
    busy = true; messageEl.textContent = '';
    try {
      const result = await window.host.chessCommand({ action: 'move', move });
      if (!result?.ok) messageEl.textContent = result?.error || tr().illegal;
      else gameState = result.state;
    } catch (error) { messageEl.textContent = error.message || String(error); }
    finally { busy = false; render(); }
  }
  async function command(action) {
    busy = true;
    try { const result = await window.host.chessCommand({ action }); if (result?.state) gameState = result.state; if (!result?.ok) messageEl.textContent = result?.error || ''; else messageEl.textContent = (result.lines || []).join(' '); }
    catch (error) { messageEl.textContent = error.message || String(error); }
    finally { busy = false; selected = ''; promotion.hidden = true; render(); }
  }
  $('new').addEventListener('click', () => command('new'));
  $('resign').addEventListener('click', () => command('resign'));
  $('help').addEventListener('click', () => { messageEl.textContent = tr().moves; });
  $('close').addEventListener('click', () => window.close());
  window.host.onChessState((state) => { gameState = state; render(); });
  const applyConfig = (cfg) => { lang = ['fr', 'en', 'ru'].includes(cfg?.lang) ? cfg.lang : 'fr'; userName = typeof cfg?.userName === 'string' && !/^(?:null|undefined|unknown|user|utilisateur)$/i.test(cfg.userName.trim()) ? cfg.userName.trim().slice(0, 24) : ''; render(); };
  window.host.onConfig?.(applyConfig);
  window.host.getConfig().then(applyConfig).catch(() => {});
  window.host.chessGetState().then((result) => { if (!result) return; if (result.lang) lang = ['fr','en','ru'].includes(result.lang) ? result.lang : 'fr'; gameState = result.state; render(); });
})();
