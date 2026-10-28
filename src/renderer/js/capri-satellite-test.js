import { SATELLITE_WAIT_MS } from './satellite-wait.js';

// The terminal and scripts/demo.js both dispatch this test into the running renderer. It goes
// through Chat.runManagedRequest, the same timed request wrapper used by real model responses.
export class CapriSatelliteTest {
  constructor({ chat, panel, log = () => {}, duration = SATELLITE_WAIT_MS + 3000, threshold = SATELLITE_WAIT_MS, isAnimating = () => false }) {
    this.chat = chat;
    this.panel = panel;
    this.log = log;
    this.duration = duration;
    this.threshold = threshold;
    this.isAnimating = isAnimating;
    this.running = null;
  }

  run() {
    if (this.running) return this.running;
    this.running = this.execute().finally(() => { this.running = null; });
    return this.running;
  }

  async execute() {
    const prefix = '[CapriSatelliteTest]';
    const say = (message) => {
      console.log(`${prefix} ${message}`);
      this.log(`${prefix} ${message}`);
    };
    say('Test satellite appelé');
    say('Initialisation de la démonstration');
    const chatPanel = Boolean(this.panel.current?.chat);
    if (chatPanel) {
      this.panel.chatTurn({ quote: 'CapriSatelliteTest — simulation de requête en attente…', face: 'look' });
    } else if (!this.panel.say({ kind: 'work', face: 'look', line: 'CapriSatelliteTest — simulation de requête en attente…', hold: null })) {
      this.panel.hide();
      this.panel.say({ kind: 'work', face: 'look', line: 'CapriSatelliteTest — simulation de requête en attente…', hold: null });
    }
    say('Démarrage de la simulation');
    let pending = null;
    try {
      pending = this.chat.runManagedRequest(() => new Promise((resolve) => {
        setTimeout(() => resolve('La réponse de démonstration est arrivée du satellite.'), this.duration);
      }));
      await new Promise((resolve) => setTimeout(resolve, this.threshold + 80));
      const ui = this.panel.satelliteWaitText?.() || '';
      if (!this.panel.satelliteWaitVisible || !ui.includes('Night City') || !ui.includes('Connexion au satellite...')) {
        throw new Error('Le dialogue satellite ou son indicateur de chargement n’a pas été affiché.');
      }
      const animationDeadline = performance.now() + 2500;
      while (!this.isAnimating() && performance.now() < animationDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (!this.isAnimating()) throw new Error('L’animation satellite de Capri ne s’est pas déclenchée.');
      say('Animation satellite déclenchée; dialogue et indicateur visibles');
      const result = await pending;
      say(`Réception de la réponse : ${result}`);
      if (this.panel.current?.chat) {
        this.panel.chatTurn({ quote: 'CapriSatelliteTest', face: 'smug' });
        this.panel.stream(result, { done: true });
      } else if (!this.panel.say({ kind: 'done', face: 'smug', line: result, hold: 7000 })) {
        this.panel.hide();
        this.panel.say({ kind: 'done', face: 'smug', line: result, hold: 7000 });
      }
      say('Fin du test satellite');
      return { ok: true, result };
    } catch (error) {
      await pending?.catch(() => {}); // let the shared request manager finish its normal cleanup
      this.panel.hideSatelliteWait?.();
      const line = `Échec du test satellite : ${error.message}`;
      if (this.panel.current?.chat) {
        this.panel.chatTurn({ quote: 'CapriSatelliteTest', face: 'aside' });
        this.panel.stream(line, { done: true });
      } else if (!this.panel.say({ kind: 'error', face: 'aside', line, hold: 8000 })) {
        this.panel.hide();
        this.panel.say({ kind: 'error', face: 'aside', line, hold: 8000 });
      }
      say(`Erreur : ${error.message}`);
      return { ok: false, error: error.message };
    }
  }
}
