import { lifeLines } from './lines-life.js';

const SNOOZE_MS = 10 * 60 * 1000;
const PAGE_PREVIEW_MS = 1200;
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
    return Number.isFinite(until) && until > now && until <= now + SNOOZE_MS ? until : 0;
  } catch {
    return 0;
  }
}

function pageDetails(data, isPage) {
  if (!isPage) return { pageTitle: '', pageUrl: '' };
  const pageTitle = typeof data.rivalTitle === 'string'
    ? data.rivalTitle.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 180).trim()
    : '';
  let pageUrl = '';
  if (typeof data.rivalUrl === 'string') {
    try {
      const url = new URL(data.rivalUrl);
      if (['http:', 'https:'].includes(url.protocol)) pageUrl = `${url.origin}${url.pathname}`.slice(0, 240);
    } catch {
      pageUrl = '';
    }
  }
  return { pageTitle, pageUrl };
}

export class Jealousy {
  constructor({
    host, panel, heart, capri, lang = () => 'en', storage = globalThis.localStorage, now = Date.now,
    setTimer = setTimeout, clearTimer = clearTimeout,
  }) {
    this.host = host;
    this.panel = panel;
    this.heart = heart;
    this.capri = capri;
    this.lang = lang;
    this.storage = storage;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.enabled = true;
    this.closePages = true;
    this.snoozedUntil = storedSnooze(storage, now());
    this.latest = null;
    this.signature = '';
    this.target = null;
    this.snoozeTimer = null;
    this.closeTimer = null;
    if (this.snoozedUntil) this.startSnoozeTimer(this.snoozedUntil - now());
  }

  configure(cfg) {
    const wasClosing = this.closePages;
    this.enabled = cfg.jealous !== false;
    this.closePages = cfg.closePages !== false;
    if (!this.enabled) {
      this.clearTimer(this.closeTimer);
      this.closeTimer = null;
      this.target = null;
      this.signature = '';
      if (this.panel.current?.jealousy) this.panel.hide();
      this.heart.clearJealousy?.();
      return;
    }
    if (wasClosing !== this.closePages) {
      this.signature = '';
      if (!this.closePages) {
        this.clearTimer(this.closeTimer);
        this.closeTimer = null;
      }
    }
    this.process(this.latest);
  }

  onWindows(data) {
    this.latest = data;
    this.process(data);
  }

  process(data) {
    if (!data || !this.enabled) {
      this.clearTimer(this.closeTimer);
      this.closeTimer = null;
      this.target = null;
      if (!this.enabled) this.signature = '';
      return;
    }
    const ai = Array.isArray(data.ai) ? data.ai : [];
    const pages = Array.isArray(data.pages) ? data.pages : [];
    const apps = Array.isArray(data.apps) ? data.apps : [];
    const key = pages[0] || ai[0] || '';
    const page = pages.includes(key);
    const download = data.dl === true;
    const currentTarget = {
      id: data.fg, key, page, application: apps.includes(key), download,
      ...pageDetails(data, page || download),
    };
    const signature = key
      ? `${data.fg}:${key}:${currentTarget.page}:${currentTarget.download}:${currentTarget.pageUrl || currentTarget.pageTitle}`
      : '';
    if (!key) {
      this.clearTimer(this.closeTimer);
      this.closeTimer = null;
      this.signature = '';
      this.target = null;
      return;
    }
    if (signature === this.signature) {
      if (this.target) Object.assign(this.target, currentTarget);
      return;
    }
    this.clearTimer(this.closeTimer);
    this.closeTimer = null;
    this.signature = signature;
    this.target = currentTarget;
    if (this.now() < this.snoozedUntil) return;

    this.heart.event('jealousy', RIVALS[key] || key);
    this.capri.react('huff');
    const shown = this.showWarning(key, currentTarget);
    if (shown && this.closePages && (currentTarget.page || currentTarget.download)) {
      this.closeTimer = this.setTimer(() => {
        this.closeTimer = null;
        this.closeTarget(currentTarget);
      }, PAGE_PREVIEW_MS);
    }
  }

  showWarning(key, target) {
    const t = lifeLines(this.lang()).ring.jealousy;
    const closesTab = this.closePages && (target.page || target.download);
    const actions = [{ id: 'jealousy-snooze', label: t.wait, primary: !target.page && !target.application && !target.download }];
    if (this.closePages && target.application) {
      actions.unshift({ id: 'jealousy-confirm-close', label: t.confirmCloseApp, primary: true });
    }
    return this.panel.say({
      kind: 'info',
      jealousy: true,
      face: 'annoyed',
      line: (closesTab ? (target.download ? t.download : t.pageLine) : target.application ? t.applicationLine : t.line)
        .replace('{name}', RIVALS[key] || key),
      quote: [target.pageTitle, target.pageUrl].filter(Boolean).join('\n'),
      hold: null,
      actions,
      onAction: (id) => {
        if (id === 'jealousy-snooze') this.relieve();
        if (id === 'jealousy-confirm-close') this.closeTarget(target);
      },
    });
  }

  relieve() {
    if (!this.target || !this.enabled || this.now() < this.snoozedUntil) return false;
    this.clearTimer(this.closeTimer);
    this.closeTimer = null;
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
    this.snoozeTimer = this.setTimer(() => {
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
    if (!this.enabled || !this.closePages || this.now() < this.snoozedUntil ||
        this.target !== target || (!target.page && !target.application && !target.download)) return;
    try {
      const result = await this.host.closePage(target.id, target.key, true);
      if (!result?.ok && result?.reason !== 'front') {
        console.error(`[capri] could not close rival page (${result?.reason || 'unknown'}).`);
      }
    } catch (error) {
      console.error('[capri] could not close rival page:', error.message);
    }
  }

  stop() {
    this.clearTimer(this.closeTimer);
    this.closeTimer = null;
    this.clearTimer(this.snoozeTimer);
    this.snoozeTimer = null;
  }
}

export { PAGE_PREVIEW_MS, SNOOZE_MS };
