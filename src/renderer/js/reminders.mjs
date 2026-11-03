// Reminders she keeps for you. You ask in her chat, in any of her languages ("rappelle-moi dans
// 20 min de sortir le linge", "remind me at 6pm to call mom", "напомни через 15 минут выключить
// духовку"): parseReminder reads when and what straight off your message, so it works the same on
// the smallest model. They're kept in her settings and survive a restart; one that came due while
// she was off, she brings up when she's back.

const TRIGGER = /(rappelle[- ]?(?:moi|nous)|fais[- ]moi penser|pense à me (?:le )?(?:rappeler|dire)|n['’]oublie pas de me (?:le )?(?:rappeler|dire)|mets[- ]moi un rappel|remind me|set (?:a|an) (?:reminder|alarm)|recu[eé]rd(?:a|e)me|recordarme|av[ií]same|pon(?:me)? un recordatorio|me lembr[ae]|lembr[ae][- ]me|me avis[ae]|cri[ae] um lembrete|напомни(?:те)?(?: мне)?|поставь напоминание)/i;

// small numbers said in words (in 5 of her languages)
const WORDS = {
  un: 1, une: 1, a: 1, an: 1, one: 1, uno: 1, una: 1, um: 1, uma: 1, один: 1, одна: 1, одну: 1,
  deux: 2, two: 2, dos: 2, dois: 2, duas: 2, два: 2, две: 2,
  trois: 3, three: 3, tres: 3, três: 3, три: 3,
  quatre: 4, four: 4, cuatro: 4, quatro: 4, четыре: 4,
  cinq: 5, five: 5, cinco: 5, пять: 5,
  dix: 10, ten: 10, diez: 10, dez: 10, десять: 10,
  quinze: 15, fifteen: 15, quince: 15, пятнадцать: 15,
  vingt: 20, twenty: 20, veinte: 20, vinte: 20, двадцать: 20,
  trente: 30, thirty: 30, treinta: 30, trinta: 30, тридцать: 30,
  quarante: 40, forty: 40, cuarenta: 40, quarenta: 40, сорок: 40,
  cinquante: 50, fifty: 50, cincuenta: 50, cinquenta: 50, пятьдесят: 50,
};
const NUM = `(\\d+(?:[.,]\\d+)?|${Object.keys(WORDS).sort((a, b) => b.length - a.length).join('|')})`;
const UNIT = '(secondes?|seconds?|secs?|segundos?|секунд[уы]?|сек|s|minutes?|minutos?|mins?|mn|минут[уы]?|мин|m|heures?|hours?|hrs?|horas?|час(?:а|ов)?|ч|h)';
const SOON = '(?<![\\p{L}])(?:dans|in|en|em|daqui a|dentro de|через)';
// "dans 20 min", "in 1 hour and 30 minutes", "через 2 часа"
const IN = new RegExp(`${SOON}\\s+${NUM}\\s*${UNIT}(?![\\p{L}])(?:\\s*(?:et|and|y|e|и)?\\s*${NUM}\\s*${UNIT}(?![\\p{L}]))?`, 'iu');
// "dans 1h30"
const IN_HM = new RegExp(`${SOON}\\s+(\\d{1,2})\\s*h\\s*(\\d{1,2})(?!\\d)`, 'iu');
// "dans une demi-heure", "in half an hour", "через полчаса", "dans un quart d'heure"
const IN_HALF = new RegExp(`${SOON}\\s+(?:une |a |an |um |uma )?(demi[- ]heure|half an hour|media hora|meia hora|полчаса|quart d['’]heure|quarter of an hour|cuarto de hora|четверть часа)`, 'iu');
// "через час", "через минуту"
const IN_ONE = /через\s+(час|минуту)(?![\p{L}])/iu;
// "à 18h30", "at 6:30 pm", "a las 18:00", "às 18h", "в 18:00", or a bare "18h30" / "18:30" / "6pm"
const AT = /(?:(?:à|a|at|a las|a la|às|as|в|к)\s+)?(?<![\d:])(\d{1,2})(?:\s*(?:h|:|\.)\s*(\d{2})?|\s*(?:heures?|hours?|horas?|час(?:а|ов)?)\b)?\s*(a\.?m\.?|p\.?m\.?)?(?![\d\p{L}])/iu;
// words, start and end, in any alphabet (\b only knows ASCII: not "amanhã", not Cyrillic)
const word = (list, flags = 'iu') => new RegExp(`(?<![\\p{L}])(?:${list})(?![\\p{L}])`, flags);
const NOON = word('(?:(?:à|at|a|al|ao|в)\\s+)?(?:midi|noon|mediod[ií]a|meio-dia|полдень)');
const MIDNIGHT = word('(?:(?:à|at|a|al|в)\\s+)?(?:minuit|midnight|medianoche|meia-noite|полночь)');
const TOMORROW = word('demain|tomorrow|amanh[ãa]|завтра|(?<!de la\\s)mañana');
const PM = word("ce soir|du soir|de l['’]après-midi|cet après-midi|tonight|this evening|in the evening|this afternoon|in the afternoon|de la tarde|de la noche|esta tarde|esta noche|da tarde|da noite|hoje à noite|вечера|дня");
const AM = word('du matin|ce matin|in the morning|de la mañana|da manhã|de manhã|утра');
const POLITE = word("s['’]il te pla[iî]t|stp|svp|please|pls|plz|por favor|пожалуйста", 'giu');
// "annule le rappel : Sortir la pizza", "cancel the reminder: call mom", "отмени напоминание"
// le texte après les deux points (optionnel) est ce qu'on cherche à annuler
const CANCEL = /(?:annul[ae]?|annuler|annulation|cancel(?:lation)?|supprimer|delete|remove|отмен[иа]|удалить)\s+(?:le\s+|un\s+|la\s+|ce\s+)?(?:rappel|reminder|напоминание)(?:\s*:?\s*(.+))?/i;
// what comes before what to remind you of, once the rest is gone
const LEAD = new RegExp("^(?:[\\s,:;.!?-]|d['’]|qu['’]|(?:capri|de que|de|que|pour|à|to|that|about|of|for|para|pra|me|о|об|что|чтобы|мне)(?![\\p{L}]))+", 'iu');

const MAX_MS = 7 * 24 * 3600 * 1000;

function number(word) {
  if (!word) return NaN;
  const n = Number(word.replace(',', '.'));
  return Number.isFinite(n) ? n : WORDS[word.toLowerCase()] ?? NaN;
}

function unitMs(unit) {
  const u = unit.toLowerCase();
  if (/^(s|sec|secs|seconde|secondes|second|seconds|segundo|segundos|секунд|секунду|секунды|сек)$/.test(u)) return 1000;
  if (/^(h|hr|hrs|heure|heures|hour|hours|hora|horas|час|часа|часов|ч)$/.test(u)) return 3600 * 1000;
  return 60 * 1000;
}

// When, read off text: { at (ms), spans: the parts of the text that said it }, or null.
export function parseWhen(text, now = Date.now()) {
  let m = IN_HM.exec(text);
  if (m) return { at: now + (Number(m[1]) * 60 + Number(m[2])) * 60000, spans: [m] };
  m = IN.exec(text);
  if (m) {
    let ms = number(m[1]) * unitMs(m[2]);
    if (m[3] && m[4]) ms += number(m[3]) * unitMs(m[4]);
    if (Number.isFinite(ms) && ms > 0) return { at: now + ms, spans: [m] };
  }
  m = IN_HALF.exec(text);
  if (m) return { at: now + (/quart|quarter|cuarto|четверть/i.test(m[1]) ? 15 : 30) * 60000, spans: [m] };
  m = IN_ONE.exec(text);
  if (m) return { at: now + (/час/i.test(m[1]) ? 60 : 1) * 60000, spans: [m] };

  // a time of day, today or tomorrow
  const spans = [];
  let h = null, min = 0;
  const noon = NOON.exec(text) || MIDNIGHT.exec(text);
  if (noon) {
    h = NOON.test(noon[0]) ? 12 : 0;
    spans.push(noon);
  } else {
    m = AT.exec(text);
    if (m && Number(m[1]) <= 23 && (m[2] === undefined || Number(m[2]) <= 59)) {
      // a bare number only counts as a time with a "h", ":", am/pm or "at" in front
      const said = /[h:.]|heure|hour|hora|час|am|pm|a\.m|p\.m/i.test(m[0].slice(String(m[1]).length)) || /^\s*(à|a|at|a las|a la|às|as|в|к)\s/i.test(m[0]);
      if (said) {
        h = Number(m[1]);
        min = Number(m[2] || 0);
        const ampm = (m[3] || '').toLowerCase().replace(/\./g, '');
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        if (!ampm && h < 12) {
          if (PM.test(text)) h += 12;
          else if (!AM.test(text) && !TOMORROW.test(text) && h > 0) {
            // "at 6", said in the afternoon: the next 6 o'clock to come
            const at6 = new Date(now);
            at6.setHours(h, min, 0, 0);
            if (at6.getTime() <= now && at6.getTime() + 12 * 3600000 > now) h += 12;
          }
        }
        spans.push(m);
      }
    }
  }
  if (h === null) return null;
  const d = new Date(now);
  d.setHours(h, min, 0, 0);
  const tomorrow = TOMORROW.exec(text);
  if (tomorrow) {
    d.setDate(d.getDate() + 1);
    spans.push(tomorrow);
  } else if (d.getTime() <= now) {
    d.setDate(d.getDate() + 1); // already past today: tomorrow
  }
  return { at: d.getTime(), spans };
}

// A cancellation asked for in text: { text: the reminder text to look for (may be ''), or null if
// it isn't asking to cancel one.
export function parseCancel(text) {
  const m = CANCEL.exec(text);
  if (!m) return null;
  const what = (m[1] || '').trim();
  return { text: what };
}

// A reminder asked for in text: { at (ms, or null if it doesn't say when), text: what to remind
// you of ('' if nothing) }, or null if it isn't asking for one.
export function parseReminder(text, now = Date.now()) {
  const trigger = TRIGGER.exec(text);
  if (!trigger) return null;
  const when = parseWhen(text, now);
  let what = text;
  for (const m of [trigger, ...(when?.spans || [])]) what = what.replace(m[0], ' ');
  what = what.replace(PM, ' ').replace(AM, ' ').replace(TOMORROW, ' ').replace(POLITE, ' ');
  what = what.replace(/\s+/g, ' ').replace(LEAD, '').replace(/[\s,;:.!?]+$/, '').trim().slice(0, 140);
  const at = when && when.at - now >= 5000 && when.at - now <= MAX_MS ? when.at : null;
  return { at, text: what };
}

// When a reminder is for, as she says it: the time, with the day if it isn't today.
// Pass `seconds` to include seconds (the due panel shows the exact time: 13:22:30).
export function clock(at, lang = 'en', seconds = false) {
  const d = new Date(at);
  const sameDay = d.toDateString() === new Date().toDateString();
  const opts = { hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}) };
  return new Intl.DateTimeFormat(lang, sameDay ? opts : { weekday: 'short', ...opts }).format(d);
}

// The ones she keeps: [{ id, at, text, made }], saved in her settings (main.js shows them in her
// menu, where you can cancel one). onDue(reminder) when one comes due, one at a time.
export class Reminders {
  constructor({ host, list = [] }) {
    this.host = host;
    this.list = Array.isArray(list) ? list : [];
    this.onDue = null;
    this.firing = new Set(); // ids being shown right now
    this.timer = null;
    console.log('[reminders] initialized', { count: this.list.length, reminders: this.list });
  }

  start() {
    if (this.timer) {
      console.log('[reminders] polling already started');
      return;
    }
    if (!this.onDue) {
      console.log('[reminders] polling not started: onDue callback is not set');
      return;
    }
    this.timer = setInterval(() => this.check(), 5000);
    this.timer.unref?.();
    console.log('[reminders] polling started');
  }

  // the list as saved (after one was cancelled from her menu)
  sync(list) {
    if (Array.isArray(list)) this.list = list;
  }

  get upcoming() {
    return [...this.list].sort((a, b) => a.at - b.at);
  }

  add(at, text) {
    const r = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at, text, made: null };
    this.list = [...this.list, r];
    this.save();
    return r;
  }

  // Annule le rappel dont le texte contient `text` (insensible à la casse), ou le plus ancien
  // rappel à venir si `text` est vide. Retourne le rappel annulé, ou null.
  cancelByText(text) {
    const needle = String(text || '').trim().toLowerCase();
    let target = null;
    if (needle) {
      target = this.upcoming.find((r) => !r.made && String(r.text || '').toLowerCase().includes(needle));
    }
    if (!target) target = this.upcoming.find((r) => !r.made);
    if (!target) return null;
    this.remove(target.id);
    return target;
  }

  remove(id) {
    this.firing.delete(id);
    this.list = this.list.filter((r) => r.id !== id);
    this.save();
  }

  snooze(id, ms) {
    this.firing.delete(id);
    this.list = this.list.map((r) => (r.id === id ? { ...r, at: Date.now() + ms } : r));
    this.save();
  }

  save() {
    this.host.setConfig({ reminders: this.list });
  }

  check() {
    if (!this.onDue) return;
    const now = Date.now();
    const due = this.upcoming.find((r) => !r.made && !this.firing.has(r.id) && r.at <= now);
    if (!due) return;
    console.log('[reminders] reminder due', { id: due.id, text: due.text, at: due.at, now });
    this.firing.add(due.id);
    try {
      due.made = Date.now();
      this.save();
      console.log('[reminders] calling onDue', { id: due.id });
      this.onDue(due);
    } finally {
      this.firing.delete(due.id);
      // le rappel a sonné : on le retire de la liste (il n'encombre plus le menu ni la config)
      this.remove(due.id);
      console.log('[reminders] reminder removed after onDue', { id: due.id });
    }
  }
}