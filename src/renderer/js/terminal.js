const COMMANDS = {
  fr: {
    welcome: 'Canal Capri établi. Tape /help pour afficher les commandes.',
    help: [
      '/open <application|site>  ouvrir une application ou un site',
      '/download <url>            simuler un téléchargement',
      '/status                    afficher l’état de Capri',
      '/network status            analyser le réseau de Night City',
      '/get arasaka data          récupérer des données fictives',
      '/scan <district>           scanner un quartier',
      '/jackin                    établir une connexion au cyberspace',
      '/chat                      ouvrir le chat écrit',
      '/call                      démarrer ou arrêter un appel vocal',
      '/report                    afficher le rapport de mission',
      '/guide                     ouvrir le guide de Capri',
      '/setup                     configurer le chat de Capri',
      '/customize                 personnaliser Capri',
      '/version                   afficher la version de Capri',
      '/test demoSatellite        tester l’animation satellite',
      '/clear                     effacer l’historique',
      '/help                      afficher cette aide',
      '/exit                      fermer le terminal',
    ],
    empty: 'Commande inconnue. Tape /help pour voir les commandes.',
    missing: 'Paramètre manquant.',
    opening: (target) => `Ouverture de ${target}…`,
    opened: (target) => `${target} ouvert.`,
    notFound: (target) => `Aucune application ou site trouvé pour « ${target} ».`,
    downloading: (url) => `Téléchargement simulé de ${url}…`,
    downloaded: 'Simulation terminée : aucun fichier réel n’a été téléchargé.',
    status: 'Capri est en ligne. Tous les systèmes sont opérationnels.',
    network: 'Réseau de Night City : 7 relais actifs, 2 ICE détectés, 0 brèche ouverte.',
    arasaka: 'Connexion au serveur Arasaka… accès simulé autorisé. Données récupérées : PROJET-K [factice].',
    scan: (district) => `Scan de ${district || 'Night City'} : trafic élevé, présence Trauma Team, aucune menace réelle.`,
    jackin: 'Liaison cyberspace établie. ICE autour de Capri : décoratif. Déconnexion automatique.',
    error: (message) => `Erreur : ${message}`,
  },
  en: {
    welcome: 'Capri command channel established. Type /help for commands.',
    help: [
      '/open <application|site>  open an application or website',
      '/download <url>            simulate a download',
      '/status                    show Capri status',
      '/network status            scan Night City network',
      '/get arasaka data          retrieve fake corporate data',
      '/scan <district>           scan a district',
      '/jackin                    connect to cyberspace',
      '/chat                      open the text chat',
      '/call                      start or stop a voice call',
      '/report                    show the mission report',
      '/guide                     open Capri’s guide',
      '/setup                     configure Capri’s chat',
      '/customize                 customize Capri',
      '/version                   show Capri’s version',
      '/test demoSatellite        test the satellite animation',
      '/clear                     clear the history',
      '/help                      show this help',
      '/exit                      close the terminal',
    ],
    empty: 'Unknown command. Type /help to see the available commands.',
    missing: 'Missing argument.',
    opening: (target) => `Opening ${target}…`,
    opened: (target) => `${target} opened.`,
    notFound: (target) => `No application or website found for “${target}”.`,
    downloading: (url) => `Simulating download of ${url}…`,
    downloaded: 'Simulation complete: no real file was downloaded.',
    status: 'Capri is online. All systems operational.',
    network: 'Night City network: 7 relays online, 2 ICE signatures detected, 0 breaches.',
    arasaka: 'Connecting to Arasaka server… simulated access granted. Data retrieved: PROJECT-K [fake].',
    scan: (district) => `Scanning ${district || 'Night City'}: heavy traffic, Trauma Team presence, no real threat.`,
    jackin: 'Cyberspace link established. ICE around Capri: decorative. Auto-disconnect enabled.',
    error: (message) => `Error: ${message}`,
  },
};

const text = (value) => String(value || '').trim();

export class Terminal {
  constructor({ element, host, lang = 'en', onCommand = async () => {} }) {
    this.element = element;
    this.host = host;
    this.lang = lang;
    this.onCommand = onCommand;
    this.screen = element.querySelector('.terminal__screen');
    this.form = element.querySelector('.terminal__form');
    this.input = element.querySelector('.terminal__input');
    this.closeButton = element.querySelector('.terminal__close');
    this.toggleButton = element.querySelector('.terminal__toggle');
    this.header = element.querySelector('.terminal__header');
    this.commands = [];
    this.drag = null;
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const command = text(this.input.value);
      if (!command) return;
      this.input.value = '';
      this.run(command);
    });
    this.closeButton.addEventListener('click', () => this.close());
    this.toggleButton.addEventListener('click', () => this.toggle());
    this.element.addEventListener('click', (event) => event.stopPropagation());
    this.header.addEventListener('pointerdown', (event) => this.startDrag(event));
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.close();
    });
  }

  get visible() {
    return !this.element.hidden;
  }

  setLang(lang) {
    this.lang = lang;
  }

  strings() {
    return COMMANDS[this.lang] || COMMANDS.en;
  }

  open() {
    this.element.hidden = false;
    if (!this.commands.length) this.write(this.strings().welcome, 'system');
    this.host.focusOverlay(true);
    this.input.focus();
  }

  close() {
    this.element.hidden = true;
    this.host.focusOverlay(false);
  }

  toggle() {
    const collapsed = this.element.classList.toggle('is-collapsed');
    this.toggleButton.textContent = collapsed ? '+' : '−';
    this.toggleButton.setAttribute('aria-label', collapsed ? 'Expand terminal' : 'Reduce terminal');
    this.toggleButton.setAttribute('aria-expanded', String(!collapsed));
    if (!collapsed) this.input.focus();
  }

  startDrag(event) {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = this.element.getBoundingClientRect();
    this.drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    this.element.style.transform = 'none';
    this.element.classList.add('is-dragging');
    this.header.setPointerCapture(event.pointerId);
    this.header.addEventListener('pointermove', this.moveDrag);
    this.header.addEventListener('pointerup', this.endDrag, { once: true });
    this.header.addEventListener('pointercancel', this.endDrag, { once: true });
  }

  moveDrag = (event) => {
    if (!this.drag) return;
    const left = Math.max(0, Math.min(innerWidth - this.element.offsetWidth, this.drag.left + event.clientX - this.drag.x));
    const top = Math.max(0, Math.min(innerHeight - this.element.offsetHeight, this.drag.top + event.clientY - this.drag.y));
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  };

  endDrag = () => {
    this.drag = null;
    this.element.classList.remove('is-dragging');
    this.header.removeEventListener('pointermove', this.moveDrag);
  };

  write(line, kind = 'output') {
    const entry = document.createElement('div');
    entry.className = `terminal__entry terminal__entry--${kind}`;
    entry.textContent = line;
    this.screen.append(entry);
    this.screen.scrollTop = this.screen.scrollHeight;
  }

  async run(raw) {
    this.commands.push(raw);
    this.write(`> ${raw}`, 'command');
    const tokens = raw.split(/\s+/);
    const name = tokens[0];
    const subcommand = tokens.slice(1, 3).join(' ').toLowerCase();
    const [_, ...parts] = tokens;
    const arg = parts.join(' ');
    const t = this.strings();
    switch (name.toLowerCase()) {
      case '/help':
        t.help.forEach((line) => this.write(line));
        break;
      case '/clear':
        this.screen.replaceChildren();
        break;
      case '/status':
        this.write(t.status);
        break;
      case '/network':
        this.write(subcommand === 'status' ? t.network : t.empty, subcommand === 'status' ? 'output' : 'error');
        break;
      case '/get':
        this.write(subcommand === 'arasaka data' ? t.arasaka : t.empty, subcommand === 'arasaka data' ? 'output' : 'error');
        break;
      case '/scan':
        this.write(t.scan(arg));
        break;
      case '/jackin':
        this.write(t.jackin);
        break;
      case '/chat':
      case '/talk':
        this.close();
        await this.onCommand('chat');
        break;
      case '/call':
      case '/voice':
        this.close();
        await this.onCommand('call');
        break;
      case '/report':
        this.close();
        await this.onCommand('report');
        break;
      case '/guide':
        this.close();
        await this.onCommand('guide');
        break;
      case '/setup':
        this.close();
        await this.onCommand('setup');
        break;
      case '/customize':
        this.close();
        await this.onCommand('customize');
        break;
      case '/version':
        this.close();
        await this.onCommand('version');
        break;
      case '/test':
        if (subcommand !== 'demosatellite') {
          this.write(t.empty, 'error');
          break;
        }
        this.close();
        await this.onCommand('demoSatellite');
        break;
      case '/exit':
      case '/quit':
        this.close();
        break;
      case '/download':
        if (!arg) {
          this.write(t.missing, 'error');
          break;
        }
        try {
          const url = new URL(arg);
          if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL must use http or https');
          this.write(t.downloading(url.toString()));
          this.write(t.downloaded);
        } catch (error) {
          this.write(t.error(error.message), 'error');
        }
        break;
      case '/open':
        await this.openTarget(arg, t);
        break;
      default:
        this.write(t.empty, 'error');
    }
  }

  async openTarget(target, t) {
    if (!target) {
      this.write(t.missing, 'error');
      return;
    }
    this.write(t.opening(target));
    try {
      const url = /^https?:\/\//i.test(target) ? target : null;
      if (url) {
        const ok = await this.host.openSite(url);
        this.write(ok ? t.opened(target) : t.error('could not open website'), ok ? 'output' : 'error');
        return;
      }
      const item = await this.host.findLaunch(target);
      if (!item) {
        this.write(t.notFound(target), 'error');
        return;
      }
      const result = await this.host.launch(item);
      this.write(result.ok ? t.opened(item.name) : t.error(result.error), result.ok ? 'output' : 'error');
    } catch (error) {
      this.write(t.error(error.message), 'error');
    }
  }
}
