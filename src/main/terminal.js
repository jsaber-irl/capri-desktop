'use strict';

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

const HELP_COMMANDS = [
  ['/help', 'Afficher les commandes disponibles.', 'Show available commands.'],
  ['/clear', 'Effacer l’historique visible.', 'Clear visible history.'],
  ['/history', 'Afficher les commandes exécutées.', 'Show executed commands history.'],
  ['/version', 'Afficher la version de Capri.', 'Show Capri version.'],
  ['/status', 'Afficher l’état général de Capri.', 'Show general Capri status.'],
  ['/open app/<nom>', 'Ouvrir une application connue de Capri.', 'Open a known application.'],
  ['/open file/<chemin>', 'Ouvrir un fichier local existant.', 'Open an existing local file.'],
  ['/download <url>', 'Télécharger une URL HTTP(S) dans Téléchargements.', 'Download an HTTP(S) URL to Downloads.'],
  ['/system info', 'Afficher les informations du système.', 'Show system information.'],
  ['/network status', 'Afficher l’état réseau du système.', 'Show system network status.'],
  ['/get arasaka data', 'Simuler un accès aux données confidentielles Arasaka.', 'Simulate access to confidential Arasaka data.'],
  ['/hack arasaka', 'Lancer une séquence de piratage fictive.', 'Launch a simulated hack sequence.'],
  ['/network scan', 'Simuler l’analyse de nœuds réseau.', 'Simulate scanning network nodes.'],
  ['/netrunner status', 'Afficher le statut du netrunner.', 'Show netrunner status.'],
  ['/ice status', 'Afficher l’état des défenses ICE.', 'Show ICE defense status.'],
  ['/trace origin', 'Simuler une tentative de traçage.', 'Simulate origin trace attempt.'],
  ['/decrypt <data>', 'Simuler le déchiffrement de données.', 'Simulate data decryption.'],
  ['/connect <node>', 'Simuler une connexion à un nœud réseau.', 'Simulate connection to a network node.'],
  ['/disconnect', 'Simuler la déconnexion du nœud actif.', 'Simulate disconnection from active node.'],
  ['/inventory', 'Afficher l’inventaire fictif de Capri.', 'Show fictional Capri inventory.'],
  ['/capri teleport', 'Téléporter la mascotte Capri.', 'Teleport Capri mascot.'],
  ['/capri satellite', 'Faire regarder le satellite par Capri.', 'Make Capri look at the satellite.'],
  ['/capri chat', 'Ouvrir la fenêtre de discussion de Capri.', 'Open Capri chat window.'],
  ['/capri demo', 'Lancer le mode démonstration de Capri.', 'Launch Capri demo mode.'],
  ['/capri stow', 'Replier ou déployer Capri de son biochip.', 'Stow or restore Capri in biochip.'],
  ['/test demoSatellite', 'Tester la reconnexion satellite de Capri.', 'Test Capri satellite reconnection.'],
  ['/music <action>', 'Contrôler le lecteur multimédia actif (status, play, pause, toggle, next, previous, current, volume).', 'Control the active media player.'],
  ['/music spotify <action>', 'Cibler explicitement Spotify (ou deezer).', 'Target Spotify (or deezer) explicitly.'],
  ['/chess', 'Ouvrir une partie d’échecs contre Capri.', 'Open a chess game against Capri.'],
  ['/chess move <coup>', 'Jouer un coup en notation e2e4 ou algébrique.', 'Play a move in UCI or algebraic notation.'],
  ['/chess new | resign | help', 'Recommencer, abandonner ou afficher les commandes.', 'Start a new game, resign, or show help.'],
  ['/document create <nom> "<texte>"', 'Créer un nouveau fichier texte sans remplacer un fichier existant.', 'Create a new text file without overwriting existing files.'],
  ['/search videos <chaîne> [in Safari]', 'Ouvrir une recherche YouTube triée par date.', 'Open a YouTube search sorted by date.'],
];

const HELP = HELP_COMMANDS.map(([name, fr]) => [name, fr]);

const response = (lines, extra = {}) => ({ kind: 'response', lines, ...extra });
const fake = response;
const result = (lines) => ({ kind: 'result', lines });
const error = (line) => ({ kind: 'error', lines: [line] });

function tokenize(line) {
  const tokens = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  for (const match of String(line || '').matchAll(re)) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

async function safeOpenFile(file, shell) {
  const requested = String(file || '').trim();
  if (!requested || requested.includes('\0')) return false;
  const target = path.resolve(requested.startsWith('~') ? path.join(os.homedir(), requested.slice(1)) : requested);
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) return false;
    return !(await shell.openPath(target));
  } catch {
    return false;
  }
}

function createTerminal({
  version = 'unknown',
  lang = 'fr',
  status = () => ({ ok: true }),
  openApp,
  openFile,
  download,
  network = null,
  mascot = null,
  musicControl = null,
  chess = null,
  createTextDocument = null,
  videoSearch = null,
  random = Math.random
} = {}) {
  const history = [];
  let connectedNode = null;

  const getLang = () => (typeof lang === 'function' ? lang() : lang);
  const tr = (fr, en) => (getLang() === 'en' ? en : fr);

  const ARASAKA_RECORDS = [
    [
      '[NET-LOG] Querying node: arasaka.tokyo-nightcity.nc/relic-vault',
      '[CLEARANCE] LEVEL 4 REQUIRED // Corporate Security Protocol',
      '[RECORD 0x4A1F] Relic 2.0 biochip telemetry dump (ENCRYPTED):',
      '  - Construct footprint: Johnny Silverhand [RESTRICTED]',
      '  - Neural synchronization: 89.4%',
      '  - Integrity checksum: SHA256:7f8b9c02d1... OK',
      '[WARNING] Counter-intrusion daemon detected on subnet perimeter.',
      '[SIMULATION] Données fictives issues de l’univers Cyberpunk 2077.'
    ],
    [
      '[NET-LOG] Intercepting subnet: arasaka-tower.heywood.nc',
      '[CLEARANCE] RESTRICTED // Guest proxy tunnel active',
      '[RECORD 0x89C2] Arasaka Security Memo - Sub-orbital transport:',
      '  - Destination: Orbital Station "Crystal Palace"',
      '  - Cargo: Secure transport container #412',
      '  - Status: Redacted under Corporate Secrecy Act art. 14',
      '[SIMULATION] Données fictives issues de l’univers Cyberpunk 2077.'
    ],
    [
      '[NET-LOG] Accessing Mikoshi archival subsystem [BLACKWALL SIM]',
      '[CLEARANCE] SOULKILLER RESTRICTED // Clearance Level: BLACK',
      '[RECORD 0xFF00] Engram repository telemetry:',
      '  - Active construct profiles: 14,291',
      '  - Buffer status: DEEP SLEEP / ARCHIVED',
      '  - Defense: ICE active on all egress channels',
      '[SIMULATION] Données fictives issues de l’univers Cyberpunk 2077.'
    ]
  ];

  async function execute(input) {
    const raw = String(input ?? '').trim();
    if (!raw) return error(tr('Commande vide.', 'Empty command.'));
    if (!raw.startsWith('/')) {
      return error(tr('Les commandes doivent commencer par « / ».', 'Commands must start with "/".'));
    }

    history.push(raw);
    const tokens = tokenize(raw);
    const command = tokens[0].toLowerCase();
    const rest = tokens.slice(1);
    const fullArg = rest.join(' ').trim();

    if (command === '/music') {
      const service = ['spotify', 'deezer'].includes(rest[0]?.toLowerCase()) ? rest.shift().toLowerCase() : null;
      const action = (rest.shift() || 'status').toLowerCase();
      if (!['status', 'current', 'play', 'pause', 'toggle', 'next', 'previous', 'volume', 'volup', 'voldown'].includes(action)) {
        return error(tr('Action musicale inconnue. Utilisez status, play, pause, toggle, next, previous, current ou volume.', 'Unknown music action. Use status, play, pause, toggle, next, previous, current or volume.'));
      }
      const value = action === 'volume' ? Number(rest[0]) : undefined;
      if (action === 'volume' && (!Number.isFinite(value) || value < 0 || value > 100)) return error(tr('Usage : /music volume <0–100>.', 'Usage: /music volume <0–100>.'));
      if (!musicControl) return error(tr('Le contrôle multimédia n’est pas configuré.', 'Media control is not configured.'));
      try {
        const musicResult = await musicControl({ action, service, volume: value });
        const label = musicResult.session ? `${musicResult.session.app}${musicResult.session.title ? ` — ${musicResult.session.title}${musicResult.session.artist ? ` — ${musicResult.session.artist}` : ''}` : ''}` : '';
        if (musicResult.status === 'ambiguous') return error(`${tr('Plusieurs lecteurs sont disponibles :', 'Several players are available:')} ${musicResult.sessions.map((s) => `${s.service} (${s.app})`).join(', ')}. ${tr('Précisez le service ou fermez les autres lecteurs.', 'Specify the service or close other players.')}`);
        if (!musicResult.ok) return error(musicResult.error || tr('Commande musicale impossible.', 'Music command failed.'));
        if (action === 'status' || action === 'current') return result([`${musicResult.session.service} · ${musicResult.session.status || musicResult.status}`, label || tr('Métadonnées indisponibles.', 'Metadata unavailable.')]);
        return result([`${tr('Commande exécutée :', 'Command sent:')} ${action}${label ? ` · ${label}` : ''}`]);
      } catch (err) { return error(`${tr('Erreur multimédia :', 'Media error:')} ${err.message}`); }
    }

    if (command === '/chess') {
      if (!chess) return error(tr('Le mode échecs est indisponible.', 'Chess is unavailable.'));
      const action = (rest.shift() || 'start').toLowerCase();
      const request = action === 'move' ? { action, move: rest.join('') } : { action };
      const outcome = chess(request);
      if (outcome && typeof outcome.then === 'function') {
        try { const done = await outcome; return done.ok ? response(done.lines || []) : error(done.error || tr('Coup impossible.', 'Chess command failed.')); }
        catch (err) { return error(`${tr('Erreur échecs :', 'Chess error:')} ${err.message}`); }
      }
      return outcome?.ok ? response(outcome.lines || []) : error(outcome?.error || tr('Commande échecs impossible.', 'Chess command failed.'));
    }

    if (command === '/document') {
      if (rest[0]?.toLowerCase() !== 'create' || !rest[1] || rest.length < 3) return error(tr('Usage : /document create <nom> "<texte>".', 'Usage: /document create <name> "<text>".'));
      if (!createTextDocument) return error(tr('La création de documents est indisponible.', 'Document creation is unavailable.'));
      try {
        const created = await createTextDocument(rest[1], rest.slice(2).join(' '));
        return created.ok ? response([tr(`Document créé et vérifié : ${created.file}`, `Document created and verified: ${created.file}`)]) : error(`${created.error || tr('Échec de la création.', 'Document creation failed.')} ${created.file || ''}`.trim());
      } catch (err) { return error(`${tr('Échec de la création :', 'Creation failed:')} ${err.message}`); }
    }

    if (command === '/search' && rest[0]?.toLowerCase() === 'videos') {
      const args = rest.slice(1);
      const browserIndex = args.findIndex((part, index) => index > 0 && /^in$/i.test(part) && /^(safari|firefox|chrome)$/i.test(args[index + 1] || ''));
      const browser = browserIndex >= 0 ? ({ safari: 'Safari', firefox: 'Firefox', chrome: 'Google Chrome' }[args[browserIndex + 1].toLowerCase()]) : '';
      const creator = (browserIndex >= 0 ? args.slice(0, browserIndex) : args).join(' ').trim();
      if (!creator) return error(tr('Usage : /search videos <chaîne> [in Safari].', 'Usage: /search videos <channel> [in Safari].'));
      if (!videoSearch) return error(tr('La recherche vidéo n’est pas disponible.', 'Video search is unavailable.'));
      try {
        const found = await videoSearch({ creator, browser });
        if (!found?.ok) return error(found?.error || tr('La recherche n’a pas pu être ouverte.', 'The search could not be opened.'));
        return response([tr(`Recherche YouTube triée par date ouverte pour « ${creator} »${browser ? ` dans ${browser}` : ''}. Vérifie les résultats : Capri ne peut pas confirmer le classement de YouTube sans accès à ses données.`, `Date-sorted YouTube search opened for “${creator}”${browser ? ` in ${browser}` : ''}. Check the results: Capri cannot verify YouTube’s ranking without access to its data.`)]);
      } catch (err) { return error(`${tr('Erreur de recherche vidéo :', 'Video search error:')} ${err.message}`); }
    }

    // 1. General commands
    if (command === '/test') {
      if (rest.join(' ').toLowerCase() !== 'demosatellite') return error(tr('Test inconnu. Utilisez /test demoSatellite.', 'Unknown test. Use /test demoSatellite.'));
      mascot?.('demoSatellite');
      return response([tr('[TEST] Démarrage de CapriSatelliteTest. Suivez les étapes dans cet historique.', '[TEST] Starting CapriSatelliteTest. Follow its progress in this history.')]);
    }

    if (command === '/help') {
      const isEn = getLang() === 'en';
      const lines = [
        tr('=== TERMINAL CAPRI // COMMANDES DISPONIBLES ===', '=== CAPRI TERMINAL // AVAILABLE COMMANDS ==='),
        ...HELP_COMMANDS.map(([name, fr, en]) => `${name.padEnd(24)} ${(isEn ? en : fr)}`)
      ];
      return response(lines);
    }

    if (command === '/test') {
      if (rest.join(' ').toLowerCase() !== 'demosatellite') return error(tr('Test inconnu. Utilisez /test demoSatellite.', 'Unknown test. Use /test demoSatellite.'));
      mascot?.('demoSatellite');
      return response([tr('[TEST] Démarrage de CapriSatelliteTest. Suivez les étapes dans cet historique.', '[TEST] Starting CapriSatelliteTest. Follow its progress in this history.')]);
    }

    if (command === '/clear') {
      return { kind: 'clear', lines: [] };
    }

    if (command === '/history') {
      if (!history.length) return response([tr('Historique vide.', 'History is empty.')]);
      return response(history.map((item, index) => `${String(index + 1).padStart(2, '0')}  ${item}`));
    }

    if (command === '/version') {
      return response([`Capri ${version}`]);
    }

    if (command === '/status') {
      try {
        const data = status ? status() : {};
        return response([JSON.stringify(data, null, 2)]);
      } catch (err) {
        return error(`${tr('Erreur statut :', 'Status error:')} ${err.message}`);
      }
    }

    // 2. System and file commands
    if (command === '/system' && rest[0]?.toLowerCase() === 'info') {
      return result([
        `platform: ${process.platform}`,
        `arch: ${process.arch}`,
        `release: ${os.release()}`,
        `node: ${process.versions.node}`,
        `memory: ${(os.freemem() / (1024 ** 3)).toFixed(1)}GB free / ${(os.totalmem() / (1024 ** 3)).toFixed(1)}GB total`,
        `status: operational`
      ]);
    }

    if (command === '/network' && rest[0]?.toLowerCase() === 'status') {
      if (network) {
        return result([await network()]);
      }
      return result([
        tr('réseau : simulation locale active (environnement sécurisé)', 'network: local simulation active (secure sandbox)'),
        `mode: offline-safe`,
        `interfaces: ${Object.keys(os.networkInterfaces()).filter((k) => !k.startsWith('lo')).join(', ') || 'loopback'}`
      ]);
    }

    if (command === '/open') {
      const match = /^(app|file)\/(.+)$/i.exec(fullArg);
      if (!match) {
        return error(tr('Usage : /open app/<nom> ou /open file/<chemin>.', 'Usage: /open app/<name> or /open file/<path>.'));
      }
      const targetType = match[1].toLowerCase();
      const targetValue = match[2].trim();

      if (targetType === 'app') {
        if (!openApp) {
          return error(tr('Ouverture d’applications indisponible sur cette plateforme.', 'Opening applications is unavailable on this platform.'));
        }
        try {
          const opened = await openApp(targetValue);
          if (opened && typeof opened === 'object' && opened.status === 'ambiguous') {
            const choices = (opened.candidates || []).map((item) => item.name).join(', ');
            return error(tr(`Plusieurs applications correspondent : ${choices}. Précisez laquelle.`, `Several applications match: ${choices}. Please specify one.`));
          }
          if (opened && typeof opened === 'object' && opened.status === 'not_found') {
            const choices = (opened.suggestions || []).map((item) => item.name).join(', ');
            return error(choices
              ? tr(`Application « ${targetValue} » introuvable. Voulais-tu dire : ${choices} ?`, `Application "${targetValue}" not found. Did you mean: ${choices}?`)
              : tr(`Application « ${targetValue} » introuvable.`, `Application "${targetValue}" not found.`));
          }
          if (opened && typeof opened === 'object' && opened.status === 'error') {
            return error(`${tr('Échec de la recherche :', 'Application search failed:')} ${opened.error || ''}`);
          }
          const ok = opened === true || opened?.ok === true;
          return ok
            ? response([tr(`Application ouverte : ${opened.name || targetValue}`, `Application opened: ${opened.name || targetValue}`)])
            : error(opened?.error || tr('Application introuvable ou non autorisée.', 'Application not found or not allowed.'));
        } catch (err) {
          return error(`${tr('Échec de l’ouverture :', 'Open failed:')} ${err.message}`);
        }
      }

      if (targetType === 'file') {
        if (!openFile) {
          return error(tr('Ouverture de fichiers indisponible.', 'Opening files is unavailable.'));
        }
        try {
          const ok = await openFile(targetValue);
          return ok
            ? response([tr(`Fichier ouvert : ${targetValue}`, `File opened: ${targetValue}`)])
            : error(tr('Fichier introuvable ou chemin non autorisé.', 'File not found or path not allowed.'));
        } catch (err) {
          return error(`${tr('Échec de l’ouverture :', 'Open failed:')} ${err.message}`);
        }
      }
    }

    if (command === '/download') {
      const targetUrl = validUrl(rest[0] || '');
      if (!targetUrl || !download) {
        return error(tr('URL HTTP(S) valide requise.', 'A valid HTTP(S) URL is required.'));
      }
      try {
        const file = await download(targetUrl);
        return response([tr(`Téléchargement terminé : ${file}`, `Download complete: ${file}`)]);
      } catch (err) {
        return error(`${tr('Téléchargement échoué :', 'Download failed:')} ${err.message}`);
      }
    }

    // 3. Cyberpunk fictional commands
    if (command === '/get' && fullArg.toLowerCase() === 'arasaka data') {
      const idx = Math.floor(Math.abs(random()) * ARASAKA_RECORDS.length) % ARASAKA_RECORDS.length;
      const lines = ARASAKA_RECORDS[idx];
      return response(lines);
    }

    if (command === '/hack' && fullArg.toLowerCase() === 'arasaka') {
      mascot?.('glitch');
      const stages = [
        '[01/05] Netrunner breach: scanning Arasaka ICE perimeter...',
        '[02/05] Daemon payload injected: Ping & Weapon Glitch',
        '[03/05] Bypassing Arasaka Black ICE countermeasures: [████████░░] 80%',
        '[04/05] Neural bridge locked // Access granted: Data shard extracted',
        '[05/05] BREACH COMPLETE // simulation terminée (aucun système réel affecté).'
      ];
      return response(stages, { progress: true });
    }

    if (command === '/network' && rest[0]?.toLowerCase() === 'scan') {
      return response([
        'TARGET SUBNET: NIGHT-CITY-GRID // 192.168.2077.0/24',
        '-------------------------------------------------------',
        'NODE-ID        STATUS     LATENCY   DAEMON       ICE',
        'NC-GATEWAY-01  OPEN       12ms      LISTENING    STANDARD',
        'ARASAKA-EXT-04 FILTERED   48ms      MASKED       BLACK-ICE',
        'TRAUMA-NET-02  OPEN       8ms       ACTIVE       MILSPEC',
        'NIGHT-CORP-09  GHOST      --        UNKNOWN      QUANTUM',
        '-------------------------------------------------------',
        '[SCAN COMPLETE] 4 simulated nodes discovered // simulation'
      ]);
    }

    if (command === '/netrunner' && rest[0]?.toLowerCase() === 'status') {
      return response([
        '================ NETRUNNER STATUS ================',
        'OPERATOR   : CAPRI // CONSTRUCT',
        'CYBERDECK  : Militech "Pareline" Mk.4 (Virtual)',
        'RAM BUFFER : 14/16 GB available (87%)',
        'ICE STATUS : SECURE (Local sandbox)',
        'NEURAL LINK: 99.8% // Bio-monitor normal',
        'CLEARANCE  : NIGHT CITY OVERLAY',
        'STATUS     : READY // Netrunner console operational (simulation)'
      ]);
    }

    if (command === '/ice' && rest[0]?.toLowerCase() === 'status') {
      return response([
        '================ ICE DEFENSE MONITOR ================',
        'WALL STATUS : INTACT // LAYERS 1-4 ACTIVE',
        'DAEMON ICE  : Blackwall protocol simulation',
        'INTRUSION   : 0 active unauthorized attempts',
        'INTEGRITY   : 100% // Hardened against external vectors',
        'SANDBOX     : LOCAL ONLY // No external attack surface',
        'NOTICE      : All defense simulations are local and harmless.'
      ]);
    }

    if (command === '/trace' && rest[0]?.toLowerCase() === 'origin') {
      return response([
        '[TRACE] Initiating reverse-packet geolocation trace...',
        '[HOP 1] 10.244.12.1 (Night City West - Kabuki District)',
        '[HOP 2] 172.16.89.44 (Heywood Proxy Relay #3)',
        '[HOP 3] 192.0.2.13 (Pacifica Ghost Subnet)',
        '[RESULT] Origin masked by multi-layered neural proxy.',
        '[NOTICE] Simulation complete: No real network activity performed.'
      ], { progress: true });
    }

    if (command === '/decrypt') {
      if (!rest.length) {
        return error(tr('Données à déchiffrer manquantes. Usage : /decrypt <data>', 'Data to decrypt is missing. Usage: /decrypt <data>'));
      }
      return response([
        `[CIPHER-ENGINE] Analyzing payload: "${fullArg}"`,
        '[DECRYPTION] Brute-forcing quantum matrix key: [██████████] 100%',
        '[PARSING] Cipher algorithm: NEURAL-7 / MILITECH-AES',
        `[OUTPUT] Decoded fragment: "${fullArg}"`,
        '[STATUS] Decryption sequence completed (simulation).'
      ]);
    }

    if (command === '/connect') {
      if (!rest[0]) {
        return error(tr('Nœud manquant. Usage : /connect <node>', 'Node is missing. Usage: /connect <node>'));
      }
      connectedNode = fullArg;
      return response([
        `[UPLINK] Handshake initiated with node: "${connectedNode}"`,
        '[PROTOCOL] Cyberdeck link established via virtual socket.',
        `[SESSION] Connected to "${connectedNode}" (simulation active).`
      ]);
    }

    if (command === '/disconnect') {
      const prev = connectedNode;
      connectedNode = null;
      return response([
        prev
          ? `[DOWNLINK] Terminating neural connection to "${prev}"... Link severed safely.`
          : tr('Aucune connexion active. Le terminal est déjà en mode local.', 'No active connection. Terminal is already in local mode.')
      ]);
    }

    if (command === '/inventory') {
      return response([
        '================ CYBERDECK INVENTORY ================',
        '[TOOL]    Capri Netrunner Terminal v0.5.1',
        '[CHIP]    Arasaka Datashard "Project Relic v2" (Encrypted)',
        '[DAEMON]  Ping v3.1, Overheat v1.4, Optics Reboot v2.0',
        '[HARDW]   Neural Interface Port (Virtual)',
        '[ACCESS]  Local desktop overlay clearance',
        '[NOTE]    All items are fictional and part of the Capri universe.'
      ]);
    }

    // 4. Mascot control commands
    if (command === '/capri' || command === '/teleport' || command === '/satellite' || command === '/demo' || command === '/chat' || command === '/stow') {
      const action = (command === '/capri' ? rest[0]?.toLowerCase() : command.slice(1)) || '';
      if (action === 'teleport') {
        mascot?.('teleport');
        return response([tr('Téléportation de Capri déclenchée !', 'Capri teleportation triggered!')]);
      }
      if (action === 'satellite') {
        mascot?.('satellite');
        return response([tr('Capri regarde le satellite.', 'Capri is looking at the satellite.')]);
      }
      if (action === 'chat') {
        mascot?.('chat');
        return response([tr('Panneau de discussion de Capri ouvert.', 'Capri discussion panel opened.')]);
      }
      if (action === 'demo') {
        mascot?.('demo');
        return response([tr('Mode démonstration de Capri lancé.', 'Capri demonstration mode started.')]);
      }
      if (action === 'stow' || action === 'hide' || action === 'show') {
        mascot?.('stow');
        return response([tr('Visibilité de Capri modifiée dans son biochip.', 'Capri visibility toggled in biochip.')]);
      }
      return error(tr('Action Capri inconnue. Disponibles : teleport, satellite, chat, demo, stow.', 'Unknown Capri action. Available: teleport, satellite, chat, demo, stow.'));
    }

    return error(`${tr('Commande inconnue :', 'Unknown command:')} ${command}`);
  }

  return {
    execute,
    history: () => [...history],
    getConnectedNode: () => connectedNode,
  };
}

module.exports = {
  HELP,
  HELP_COMMANDS,
  tokenize,
  validUrl,
  safeOpenFile,
  createTerminal,
};
