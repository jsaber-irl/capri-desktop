
'use strict';

(() => {

  // =========================================
  // ÉLÉMENTS HTML
  // =========================================

  const $ = (id) => document.getElementById(id);

  const board = $('board');
  const statusEl = $('status');
  const messageEl = $('message');
  const promotion = $('promotion');
  const quoteEl = $('quote');

  // =========================================
  // PIÈCES
  // =========================================

  const glyphs = {
    K: '♔',
    Q: '♕',
    R: '♖',
    B: '♗',
    N: '♘',
    P: '♙',

    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟'
  };

  // =========================================
  // TRADUCTIONS
  // =========================================

  const TXT = {

    fr: {
      turn: (who) => `TON TOUR (${who})`,
      bot: 'CAPRI RÉFLÉCHIT…',

      check: 'ÉCHEC !',

      mate: (who) => `ÉCHEC ET MAT — ${who} GAGNE.`,
      draw: 'PARTIE NULLE.',
      stalemate: 'PAT — PARTIE NULLE.',
      resigned: 'PARTIE ABANDONNÉE.',

      whitewon: 'TU AS GAGNÉ !',
      blackwon: 'CAPRI A GAGNÉ.',

      title: 'Échecs avec Capri',
      quote: 'Les blancs sont à toi. Voyons ce dont tu es capable.',
      new: 'NOUVELLE PARTIE',
      resign: 'ABANDONNER',
      help: 'AIDE',
      close: 'Fermer',
      board: 'Échiquier',

      loading: 'Chargement…',
      illegal: 'Coup impossible.',

      helpText: 'Sélectionne une pièce blanche puis une case pour la déplacer.'
    },

    en: {
      turn: (who) => `YOUR TURN (${who})`,
      bot: 'CAPRI IS THINKING…',

      check: 'CHECK!',

      mate: (who) => `CHECKMATE — ${who} WINS.`,
      draw: 'DRAW.',
      stalemate: 'STALEMATE — DRAW.',
      resigned: 'GAME RESIGNED.',

      whitewon: 'YOU WON!',
      blackwon: 'CAPRI WON.',

      title: 'Chess with Capri',
      quote: 'The white pieces are yours. Let’s see what you can do.',
      new: 'NEW GAME',
      resign: 'RESIGN',
      help: 'HELP',
      close: 'Close',
      board: 'Chessboard',

      loading: 'Loading…',
      illegal: 'Invalid move.',

      helpText: 'Select a white piece, then select a square to move it.'
    },

    ru: {
      turn: (who) => `ТВОЙ ХОД (${who})`,
      bot: 'CAPRI ДУМАЕТ…',

      check: 'ШАХ!',

      mate: (who) => `МАТ — ПОБЕДИЛ ${who}.`,
      draw: 'НИЧЬЯ.',
      stalemate: 'ПАТ — НИЧЬЯ.',
      resigned: 'ПАРТИЯ СДАНА.',

      whitewon: 'ТЫ ПОБЕДИЛ!',
      blackwon: 'ПОБЕДИЛА CAPRI.',

      title: 'Шахматы с Capri',
      quote: 'Белые твои. Посмотрим, на что ты способен.',
      new: 'НОВАЯ ПАРТИЯ',
      resign: 'СДАТЬСЯ',
      help: 'ПОМОЩЬ',
      close: 'Закрыть',
      board: 'Шахматная доска',

      loading: 'Загрузка…',
      illegal: 'Недопустимый ход.',

      helpText: 'Выбери белую фигуру, затем клетку для перемещения.'
    }

  };


  // =========================================
  // ÉTAT DU JEU
  // =========================================

  let lang = 'fr';
  let userName = '';

  let gameState = null;
  let selected = '';

  let pendingPromotion = null;
  let busy = false;

  const tr = () => TXT[lang] || TXT.fr;


  // =========================================
  // CONVERSION FEN -> ÉCHIQUIER
  // =========================================

  function matrix() {

    if (!gameState?.fen) return Array(64).fill('');

    const [placement] = gameState.fen.split(' ');

    return placement.split('/').flatMap((row) =>
      [...row].flatMap((c) =>
        c >= '1' && c <= '8'
          ? Array(Number(c)).fill('')
          : c
      )
    );

  }


  // =========================================
  // COORDONNÉES
  // =========================================

  const coords = (n) =>
    `${'abcdefgh'[n % 8]}${8 - Math.floor(n / 8)}`;


  // =========================================
  // AFFICHAGE DE L'ÉCHIQUIER
  // =========================================

  function render() {

    if (!gameState) return;

    const pieces = matrix();

    const turnText =
      gameState.turn === 'w'
        ? (userName || (
            lang === 'ru' ? 'ТЫ' :
            lang === 'en' ? 'YOU' : 'TOI'
          ))
        : 'CAPRI';


    // -----------------------------------------
    // STATUT
    // -----------------------------------------

    let status = tr().turn(turnText);

    if (gameState.status === 'resigned') {

      status = tr().resigned;

    } else if (gameState.status === 'stalemate') {

      status = tr().stalemate;

    } else if (gameState.status === 'draw') {

      status = tr().draw;

    } else if (gameState.status === 'white-won') {

      status = tr().whitewon;

    } else if (gameState.status === 'black-won') {

      status = tr().blackwon;

    } else if (gameState.inCheck) {

      status += ` · ${tr().check}`;

    } else if (gameState.turn === 'b') {

      status = tr().bot;

    }

    statusEl.textContent = status;


    // -----------------------------------------
    // INFORMATIONS CAPRI
    // -----------------------------------------

    document.title = tr().title;

    quoteEl.textContent =
      gameState.status === 'white-won'
        ? tr().whitewon
        : gameState.status === 'black-won'
          ? tr().blackwon
          : tr().quote;


    // -----------------------------------------
    // BOUTONS
    // -----------------------------------------

    $('new').textContent = tr().new;
    $('resign').textContent = tr().resign;
    $('help').textContent = tr().help;

    $('close').setAttribute('aria-label', tr().close);

    board.setAttribute('aria-label', tr().board);

    document.documentElement.lang = lang;


    // -----------------------------------------
    // CASES ET DÉPLACEMENTS
    // -----------------------------------------

    const moves = gameState.legalMoves || [];

    board.replaceChildren(

      ...pieces.map((piece, i) => {

        const from = coords(i);

        const row = Math.floor(i / 8);
        const col = i % 8;

        const button = document.createElement('button');

        button.type = 'button';

        button.className =
          `square ${
            (row + col) % 2
              ? 'square--dark'
              : 'square--light'
          }`;


        // Couleur des pièces

        if (piece) {

          button.dataset.piece =
            piece === piece.toUpperCase()
              ? 'white'
              : 'black';

          button.textContent = glyphs[piece];

        }


        // Case sélectionnée

        if (selected === from) {

          button.classList.add('is-selected');

        }


        // Coups possibles

        const targetMoves = moves.filter(
          (m) => m.from === selected && m.to === from
        );

        if (targetMoves.length) {

          button.classList.add('is-target');

          if (piece) {

            button.classList.add('has-capture');

          }

        }


        // Dernier déplacement

        if (
          gameState.lastMove &&
          (
            gameState.lastMove.from === from ||
            gameState.lastMove.to === from
          )
        ) {

          button.classList.add('is-last');

        }


        // Coordonnées verticales

        if (col === 0) {

          const rank = document.createElement('span');

          rank.className = 'square__coord square__coord--rank';
          rank.textContent = 8 - row;

          button.append(rank);

        }


        // Coordonnées horizontales

        if (row === 7) {

          const file = document.createElement('span');

          file.className = 'square__coord square__coord--file';
          file.textContent = 'abcdefgh'[col];

          button.append(file);

        }


        // Accessibilité

        button.setAttribute(
          'aria-label',
          `${from}${piece ? ` ${piece}` : ''}`
        );

        button.setAttribute('role', 'gridcell');


        // Interaction

        button.addEventListener('click', () => {

          choose(from, piece);

        });

        return button;

      })

    );


    // -----------------------------------------
    // ÉTAT DES BOUTONS
    // -----------------------------------------

    const ended = gameState.status !== 'playing';

    $('resign').disabled = ended;

  }


  // =========================================
  // SÉLECTION DES PIÈCES
  // =========================================

  function choose(to, piece) {

    if (
      busy ||
      gameState?.status !== 'playing' ||
      gameState.turn !== 'w'
    ) return;


    // Une pièce est déjà sélectionnée

    if (selected) {

      const options = (gameState.legalMoves || []).filter(
        (m) => m.from === selected && m.to === to
      );


      // Déplacement possible

      if (options.length) {

        const promotions = options.filter(
          (m) => m.promotion
        );


        // Promotion du pion

        if (promotions.length) {

          pendingPromotion = {
            from: selected,
            to
          };

          showPromotions(promotions);

          return;

        }


        // Déplacement normal

        const move = `${selected}${to}`;

        selected = '';

        void play(move);

        render();

        return;

      }

    }


    // Sélection d'une pièce blanche

    if (piece && piece === piece.toUpperCase()) {

      selected = to;

    } else {

      selected = '';

    }

    promotion.hidden = true;

    render();

  }


  // =========================================
  // PROMOTION
  // =========================================

  function showPromotions(moves) {

    promotion.hidden = false;

    const names = {
      q: '♕',
      r: '♖',
      b: '♗',
      n: '♘'
    };


    promotion.replaceChildren(

      ...moves.map((move) => {

        const button = document.createElement('button');

        button.type = 'button';

        button.textContent = names[move.promotion];

        button.setAttribute(
          'aria-label',
          move.promotion
        );


        button.addEventListener('click', () => {

          if (!pendingPromotion) return;

          const moveNotation =
            `${pendingPromotion.from}${pendingPromotion.to}${move.promotion}`;

          promotion.hidden = true;

          selected = '';
          pendingPromotion = null;

          void play(moveNotation);

        });


        return button;

      })

    );

  }


  // =========================================
  // JOUER UN COUP
  // =========================================

  async function play(move) {

    busy = true;

    messageEl.textContent = '';

    render();

    try {

      const result = await window.host.chessCommand({

        action: 'move',
        move

      });


      if (!result?.ok) {

        messageEl.textContent =
          result?.error || tr().illegal;

      } else {

        gameState = result.state;

      }

    } catch (error) {

      messageEl.textContent =
        error.message || String(error);

    } finally {

      busy = false;

      render();

    }

  }


  // =========================================
  // COMMANDES DU JEU
  // =========================================

  async function command(action) {

    if (busy) return;

    busy = true;

    messageEl.textContent = '';

    try {

      const result = await window.host.chessCommand({
        action
      });


      if (result?.state) {

        gameState = result.state;

      }


      if (!result?.ok) {

        messageEl.textContent =
          result?.error || '';

      } else {

        messageEl.textContent =
          (result.lines || []).join(' ');

      }

    } catch (error) {

      messageEl.textContent =
        error.message || String(error);

    } finally {

      busy = false;

      selected = '';
      pendingPromotion = null;

      promotion.hidden = true;

      render();

    }

  }


  // =========================================
  // ÉVÉNEMENTS DES BOUTONS
  // =========================================

  $('new').addEventListener('click', () => {

    void command('new');

  });


  $('resign').addEventListener('click', () => {

    void command('resign');

  });


  $('help').addEventListener('click', () => {

    messageEl.textContent = tr().helpText;

  });


  $('close').addEventListener('click', () => {

    window.close();

  });


  // =========================================
  // SYNCHRONISATION IPC
  // =========================================

  window.host.onChessState((state) => {

    gameState = state;

    selected = '';
    pendingPromotion = null;

    promotion.hidden = true;

    render();

  });


  // =========================================
  // CONFIGURATION UTILISATEUR
  // =========================================

  const applyConfig = (cfg) => {

    lang = ['fr', 'en', 'ru'].includes(cfg?.lang)
      ? cfg.lang
      : 'fr';


    userName =
      typeof cfg?.userName === 'string' &&
      !/^(?:null|undefined|unknown|user|utilisateur)$/i.test(
        cfg.userName.trim()
      )
        ? cfg.userName.trim().slice(0, 24)
        : '';


    render();

  };


  window.host.onConfig?.(applyConfig);


  window.host.getConfig()
    .then(applyConfig)
    .catch(() => {});


  // =========================================
  // CHARGEMENT DE LA PARTIE
  // =========================================

  window.host.chessGetState()
    .then((result) => {

      if (!result) return;

      if (result.lang) {

        lang = ['fr', 'en', 'ru'].includes(result.lang)
          ? result.lang
          : 'fr';

      }

      gameState = result.state;

      render();

    })
    .catch((error) => {

      messageEl.textContent =
        error.message || String(error);

    });


})();
