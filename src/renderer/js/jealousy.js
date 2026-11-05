import { lifeLines } from './lines-life.js';

const SNOOZE_MS = 10 * 60 * 1000;
const CLOSE_DELAY_MS = 5000;
const STORE = 'capri.jealousy';

const RIVALS = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
  copilot: 'Copilot',
  perplexity: 'Perplexity',
  deepseek: 'DeepSeek',
  grok: 'Grok',
  lechat: 'Le Chat',
  characterai: 'Character.AI',
  metaai: 'Meta AI',
};

function storedSnooze(storage, now) {
  try {
    const until = Number(storage?.getItem(STORE) || 0);
    return Number.isFinite(until) && until > now ? until : 0;
  } catch {
    return 0;
  }
}

export class Jealousy {
  constructor({ host, panel, heart, capri, lang = () => 'en', storage = globalThis.localStorage, now = Date.now }) {
    this.host = host;
    this.panel = panel;
    this.heart = heart;
    this.capri = capri;
    this.lang = lang;
    this.storage = storage;
    this.now = now;
    this.enabled = true;
    this.closePages = true;
    this.snoozedUntil = storedSnooze(storage, now());
    this.latest = null;
    this.signature = '';
    this.target = null;
    this.closeTimer = null;
    this.snoozeTimer = null;
    if (this.snoozedUntil) this.startSnoozeTimer(this.snoozedUntil - now());
  }

  configure(cfg) {
    const wasClosing = this.closePages;
    this.enabled = cfg.jealous !== false;
    this.closePages = cfg.closePages !== false;
    if (!this.enabled) {
      this.clearCloseTimer();
      this.target = null;
      this.signature = '';
      if (this.panel.current?.jealousy) this.panel.hide();
      this.heart.clearJealousy?.();
      return;
    }
    if (!this.closePages) this.clearCloseTimer();
    else if (!wasClosing) this.signature = '';
    this.process(this.latest);
  }

  onWindows(data) {
    this.latest = data;
    this.process(data);
  }

  process(data) {
    if (!data || !this.enabled) {
      this.target = null;
      if (!this.enabled) this.signature = '';
      this.clearCloseTimer();
      return;
    }
    const ai = Array.isArray(data.ai) ? data.ai : [];
    const pages = Array.isArray(data.pages) ? data.pages : [];
    const key = pages[0] || ai[0] || '';
    const currentTarget = { id: data.fg, key, page: pages.includes(key), download: data.dl === true };
    const signature = key ? `${data.fg}:${key}:${currentTarget.page}:${currentTarget.download}` : '';
    if (!key) {
      this.signature = '';
      this.target = null;
      this.clearCloseTimer();
      return;
    }
    if (signature === this.signature) {
      if (this.target) Object.assign(this.target, currentTarget);
      return;
    }
    this.signature = signature;
    this.clearCloseTimer();
    this.target = currentTarget;
    if (this.now() < this.snoozedUntil) return;

    this.heart.event('jealousy', RIVALS[key] || key);
    this.capri.react('huff');
    const warned = this.showWarning(key);

    if (!this.closePages || (!this.target.page && !this.target.download)) return;
    if (this.target.download) {
      this.closeTarget(this.target);
      return;
    }
    if (!warned) return;
    const target = this.target;
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      if (this.enabled && this.closePages && this.target === target) this.closeTarget(target);
    }, CLOSE_DELAY_MS);
  }

  showWarning(key) {
    const t = lifeLines(this.lang()).ring.jealousy;
    return this.panel.say({
      kind: 'info',
      jealousy: true,
      face: 'annoyed',
      line: t.line.replace('{name}', RIVALS[key] || key),
      hold: null,
      actions: [{ id: 'jealousy-snooze', label: t.wait, primary: true }],
      onAction: (id) => {
        if (id !== 'jealousy-snooze') return;
        this.relieve();
      },
    });
  }

  relieve() {
    if (!this.target || !this.enabled || this.now() < this.snoozedUntil) return false;
    this.clearCloseTimer();
    this.snoozedUntil = this.now() + SNOOZE_MS;
    try {
      this.storage?.setItem(STORE, String(this.snoozedUntil));
    } catch (error) {
      console.error('[capri] could not save jealousy pause:', error.message);
    }
    if (this.panel.current?.jealousy) this.panel.hide();
    this.startSnoozeTimer(SNOOZE_MS);
    return true;
  }

  startSnoozeTimer(ms) {
    clearTimeout(this.snoozeTimer);
    this.snoozeTimer = setTimeout(() => {
      this.snoozeTimer = null;
      this.snoozedUntil = 0;
      try {
        this.storage?.removeItem(STORE);
      } catch (error) {
        console.error('[capri] could not clear jealousy pause:', error.message);
      }
      this.signature = '';
      this.process(this.latest);
    }, Math.max(0, ms));
  }

  async closeTarget(target) {
    if (!this.enabled || !this.closePages || this.target !== target) return;
    try {
      const result = await this.host.closePage(target.id, target.key);
      if (!result?.ok && result?.reason !== 'front') {
        console.error(`[capri] could not close rival page (${result?.reason || 'unknown'}).`);
      }
    } catch (error) {
      console.error('[capri] could not close rival page:', error.message);
    }
  }

  clearCloseTimer() {
    clearTimeout(this.closeTimer);
    this.closeTimer = null;
  }

  stop() {
    this.clearCloseTimer();
    clearTimeout(this.snoozeTimer);
    this.snoozeTimer = null;
  }
}

export { CLOSE_DELAY_MS, SNOOZE_MS };
