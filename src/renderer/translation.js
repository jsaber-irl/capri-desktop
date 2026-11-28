'use strict';

const api = window.host;
const $ = (id) => document.getElementById(id);
const devLog = (...args) => { if (api?.isDev) console.log(...args); };

const COPY = {
  fr: {
    brand: 'TRADUCTION',
    tabPage: 'Page web', tabDocument: 'Document',
    activePage: 'Page active', manualTitle: 'Adresse de la page', webAddress: 'Adresse de la page',
    chooseFile: 'Choisis un document', chooseFileHint: 'PDF, Word, ODT, EPUB, PowerPoint, Excel, HTML, Markdown, texte…',
    localOnly: 'Le fichier reste sur ton ordinateur.',
    change: 'Changer', translateTo: 'Traduire vers', translate: 'Traduire',
    settings: 'Réglages', provider: 'Service', sourceLang: 'Langue source', auto: 'Détection automatique',
    apiKey: 'Clé API (si le service en demande)', apiUrl: 'Adresse du service', saveSettings: 'Enregistrer',
    save: 'Enregistrer…', open: 'Ouvrir',
    lineIdlePage: 'Je regarde ce que tu veux traduire…',
    lineIdleDoc: 'Montre-moi le document et je m’occupe du reste.',
    lineDetected: 'Je vois « {title} ». Je m’en occupe ?',
    lineManual: 'Je n’arrive pas à lire ton navigateur. Colle-moi l’adresse de la page.',
    lineManualEdit: 'J’ai l’adresse. Lance la traduction quand tu veux.',
    lineChatUrl: '« {host} ». Je te la traduis ?',
    lineFile: '« {name} ». Je le garde tel quel, promis.',
    lineScanPage: 'Je parcours la page pour en comprendre le contenu.',
    lineScanDoc: 'Je lis ton document, sans toucher à l’original.',
    lineTranslating: 'Je m’occupe de la traduction !',
    lineDonePage: 'Voilà, ta traduction est prête.',
    lineDoneDoc: 'C’est prêt. Jette un œil à l’aperçu.',
    lineSaved: 'Enregistré. Il est à toi.',
    lineOpened: 'Je l’ouvre pour toi.',
    lineSettings: 'C’est noté.',
    lineSettingsError: 'Je n’ai pas pu enregistrer ces réglages.',
    errGeneric: 'Je n’ai pas pu aller au bout. Tu peux réessayer.',
    errUnreachable: 'Je n’arrive pas à accéder à cette page. Tu peux essayer avec un autre lien.',
    errTimeout: 'Cette page met trop de temps à répondre. On réessaie ?',
    errInvalidUrl: 'Cette adresse ne me semble pas valide. Tu peux vérifier le lien ?',
    errPrivate: 'Je ne touche pas aux adresses locales ou privées.',
    errNotHtml: 'Cette adresse ne ressemble pas à une page que je peux lire.',
    errEmptyPage: 'Je ne trouve pas de texte à traduire ici. La page se charge peut-être trop tard.',
    errNoUrl: 'Il me faut une adresse de page pour commencer.',
    errNoFile: 'Choisis d’abord un document.',
    errMissingKey: 'Il me manque une clé pour ce service. Tu peux l’ajouter dans les réglages.',
    errMissingUrl: 'Indique l’adresse du service de traduction dans les réglages.',
    errQuota: 'Le service gratuit me fait patienter. Réessaie dans un moment ou change de service.',
    errTooLarge: 'Ce document est trop gros pour moi.',
    errUnsupported: 'Je ne sais pas encore lire ce format. PDF, Word, ODT, EPUB, PowerPoint, Excel, HTML et texte fonctionnent.',
    errConverter: 'Ce format ancien a besoin de LibreOffice. Installe-le, ou enregistre le fichier en DOCX, PPTX, XLSX, ODT ou PDF.',
    errPermission: 'Je n’ai pas la permission de lire ton navigateur. Autorise-la dans Permissions macOS, ou colle l’adresse à la main.',
    errNoBrowser: 'Reviens sur ta page dans le navigateur, puis relance la détection.',
    errNoWindow: 'Ton navigateur n’a pas de fenêtre ouverte, on dirait.',
    openPermissions: 'Autoriser dans Permissions macOS',
    permissionOpened: 'Fenêtre Permissions macOS ouverte sur ton navigateur.',
    errIncomplete: 'La traduction est revenue incomplète. On réessaie ?',
    errProvider: 'Le service de traduction ne m’a pas répondu correctement.',
    scanning: 'Analyse en cours…',
    reading: 'Lecture…',
    translatingShort: 'Traduction…',
    pageMeta: '{site} · {n} blocs',
    docMeta: '{name} · {n} blocs',
    fileMeta: '{ext} · {size}',
    noteRtf: 'Le RTF perd sa mise en forme dans l’aperçu.',
    noteExtract: 'Le texte du document est extrait et traduit ; la mise en forme d’origine est simplifiée.',
    savedToast: 'Enregistré : {name}',
    activeTab: 'onglet actif',
    detecting: 'Je regarde ce que tu as à l’écran…',
  },
  en: {
    brand: 'TRANSLATION',
    tabPage: 'Web page', tabDocument: 'Document',
    activePage: 'Active page', manualTitle: 'Page address', webAddress: 'Page address',
    chooseFile: 'Choose a document', chooseFileHint: 'PDF, Word, ODT, EPUB, PowerPoint, Excel, HTML, Markdown, text…',
    localOnly: 'The file stays on your computer.',
    change: 'Change', translateTo: 'Translate into', translate: 'Translate',
    settings: 'Settings', provider: 'Service', sourceLang: 'Source language', auto: 'Detect automatically',
    apiKey: 'API key (if the service needs one)', apiUrl: 'Service address', saveSettings: 'Save',
    save: 'Save…', open: 'Open',
    lineIdlePage: 'Let me see what you want translated…',
    lineIdleDoc: 'Show me the document and I’ll handle the rest.',
    lineDetected: 'I see “{title}”. Want me to take it?',
    lineManual: 'I can’t read your browser. Paste the page address for me.',
    lineManualEdit: 'Got the address. Translate whenever you’re ready.',
    lineChatUrl: '“{host}”. Shall I translate it?',
    lineFile: '“{name}”. I’ll leave the original untouched, promise.',
    lineScanPage: 'I’m going through the page to understand it.',
    lineScanDoc: 'I’m reading your document without touching the original.',
    lineTranslating: 'Working on the translation!',
    lineDonePage: 'There, your translation is ready.',
    lineDoneDoc: 'Done. Take a look at the preview.',
    lineSaved: 'Saved. It’s yours.',
    lineOpened: 'Opening it for you.',
    lineSettings: 'Noted.',
    lineSettingsError: 'I couldn’t save those settings.',
    errGeneric: 'I couldn’t finish that. Want to try again?',
    errUnreachable: 'I can’t reach this page. You can try another link.',
    errTimeout: 'This page is taking too long to answer. Try again?',
    errInvalidUrl: 'That address doesn’t look valid. Mind checking the link?',
    errPrivate: 'I don’t open local or private addresses.',
    errNotHtml: 'That address doesn’t look like a page I can read.',
    errEmptyPage: 'I can’t find any text to translate here. The page may load too late.',
    errNoUrl: 'I need a page address to start.',
    errNoFile: 'Choose a document first.',
    errMissingKey: 'I’m missing a key for this service. You can add it in settings.',
    errMissingUrl: 'Tell me the translation service address in settings.',
    errQuota: 'The free service is making me wait. Try again shortly or switch services.',
    errTooLarge: 'This document is too big for me.',
    errUnsupported: 'I can’t read this format yet. PDF, Word, ODT, EPUB, PowerPoint, Excel, HTML and text work.',
    errConverter: 'This legacy format needs LibreOffice. Install it, or save the file as DOCX, PPTX, XLSX, ODT or PDF.',
    errPermission: 'I don’t have permission to read your browser. Allow it in macOS Permissions, or paste the address.',
    errNoBrowser: 'Go back to your page in the browser, then run detection again.',
    errNoWindow: 'Your browser doesn’t seem to have a window open.',
    openPermissions: 'Allow in macOS Permissions',
    permissionOpened: 'macOS Permissions opened on your browser.',
    errIncomplete: 'The translation came back incomplete. Try again?',
    errProvider: 'The translation service didn’t answer properly.',
    scanning: 'Scanning…',
    reading: 'Reading…',
    translatingShort: 'Translating…',
    pageMeta: '{site} · {n} blocks',
    docMeta: '{name} · {n} blocks',
    fileMeta: '{ext} · {size}',
    noteRtf: 'RTF formatting is simplified in the preview.',
    noteExtract: 'The document text is extracted and translated; its original formatting is simplified.',
    savedToast: 'Saved: {name}',
    activeTab: 'active tab',
    detecting: 'Let me look at your screen…',
  },
  ru: {
    brand: 'ПЕРЕВОД',
    tabPage: 'Страница', tabDocument: 'Документ',
    activePage: 'Активная страница', manualTitle: 'Адрес страницы', webAddress: 'Адрес страницы',
    chooseFile: 'Выбери документ', chooseFileHint: 'PDF, Word, ODT, EPUB, PowerPoint, Excel, HTML, Markdown, текст…',
    localOnly: 'Файл остаётся на твоём компьютере.',
    change: 'Заменить', translateTo: 'Перевести на', translate: 'Перевести',
    settings: 'Настройки', provider: 'Сервис', sourceLang: 'Язык оригинала', auto: 'Определить автоматически',
    apiKey: 'Ключ API (если нужен сервису)', apiUrl: 'Адрес сервиса', saveSettings: 'Сохранить',
    save: 'Сохранить…', open: 'Открыть',
    lineIdlePage: 'Смотрю, что нужно перевести…',
    lineIdleDoc: 'Покажи документ, остальное я возьму на себя.',
    lineDetected: 'Вижу «{title}». Заняться ей?',
    lineManual: 'Не могу прочитать твой браузер. Вставь адрес страницы.',
    lineManualEdit: 'Адрес есть. Запускай перевод, когда будешь готов.',
    lineChatUrl: '«{host}». Перевести?',
    lineFile: '«{name}». Оригинал не трону, обещаю.',
    lineScanPage: 'Просматриваю страницу, чтобы понять её содержимое.',
    lineScanDoc: 'Читаю документ, не трогая оригинал.',
    lineTranslating: 'Занимаюсь переводом!',
    lineDonePage: 'Готово, твой перевод здесь.',
    lineDoneDoc: 'Готово. Загляни в предпросмотр.',
    lineSaved: 'Сохранено. Теперь это твоё.',
    lineOpened: 'Открываю для тебя.',
    lineSettings: 'Записала.',
    lineSettingsError: 'Не удалось сохранить эти настройки.',
    errGeneric: 'Не получилось довести до конца. Попробуем ещё раз?',
    errUnreachable: 'Не могу открыть эту страницу. Попробуй другую ссылку.',
    errTimeout: 'Страница слишком долго не отвечает. Ещё раз?',
    errInvalidUrl: 'Этот адрес кажется неверным. Проверишь ссылку?',
    errPrivate: 'Локальные и приватные адреса я не открываю.',
    errNotHtml: 'Похоже, по этому адресу нет страницы, которую я могу прочитать.',
    errEmptyPage: 'Не нахожу здесь текста для перевода. Возможно, страница ещё не загрузилась.',
    errNoUrl: 'Мне нужен адрес страницы, чтобы начать.',
    errNoFile: 'Сначала выбери документ.',
    errMissingKey: 'Мне не хватает ключа для этого сервиса. Его можно добавить в настройках.',
    errMissingUrl: 'Укажи адрес сервиса перевода в настройках.',
    errQuota: 'Бесплатный сервис просит подождать. Попробуй чуть позже или смени сервис.',
    errTooLarge: 'Этот документ слишком большой для меня.',
    errUnsupported: 'Этот формат я пока не читаю. PDF, Word, ODT, EPUB, PowerPoint, Excel, HTML и текст работают.',
    errConverter: 'Для этого старого формата нужен LibreOffice. Установи его или сохрани файл в DOCX, PPTX, XLSX, ODT или PDF.',
    errPermission: 'У меня нет разрешения читать твой браузер. Разреши это в Permissions macOS или вставь адрес вручную.',
    errNoBrowser: 'Вернись на страницу в браузере и запусти определение снова.',
    errNoWindow: 'Похоже, у браузера нет открытого окна.',
    openPermissions: 'Разрешить в Permissions macOS',
    permissionOpened: 'Окно Permissions macOS открыто для твоего браузера.',
    errIncomplete: 'Перевод пришёл неполным. Попробуем ещё раз?',
    errProvider: 'Сервис перевода ответил неправильно.',
    scanning: 'Сканирую…',
    reading: 'Читаю…',
    translatingShort: 'Перевожу…',
    pageMeta: '{site} · {n} блоков',
    docMeta: '{name} · {n} блоков',
    fileMeta: '{ext} · {size}',
    noteRtf: 'Форматирование RTF упрощено в предпросмотре.',
    noteExtract: 'Текст документа извлекается и переводится; исходное форматирование упрощается.',
    savedToast: 'Сохранено: {name}',
    activeTab: 'активная вкладка',
    detecting: 'Смотрю, что у тебя на экране…',
  },
};

const LANGUAGES = [
  ['fr', 'Français'], ['en', 'English'], ['de', 'Deutsch'], ['es', 'Español'],
  ['it', 'Italiano'], ['pt', 'Português'], ['ja', '日本語'], ['zh', '中文'],
  ['ru', 'Русский'], ['ar', 'العربية'], ['nl', 'Nederlands'], ['pl', 'Polski'],
  ['tr', 'Türkçe'], ['ko', '한국어'],
];

const PROVIDER_NAMES = {
  mymemory: 'MYMEMORY', deepl: 'DEEPL', google: 'GOOGLE', libretranslate: 'LIBRETRANSLATE', custom: 'CUSTOM',
};

const ERROR_KEYS = {
  'invalid-url': 'errInvalidUrl',
  'invalid-source': 'errGeneric',
  'unreachable': 'errUnreachable',
  'timeout': 'errTimeout',
  'http': 'errUnreachable',
  'private-host': 'errPrivate',
  'not-html': 'errNotHtml',
  'empty-page': 'errEmptyPage',
  'empty-document': 'errEmptyPage',
  'missing-key': 'errMissingKey',
  'missing-url': 'errMissingUrl',
  'missing-file': 'errNoFile',
  'quota': 'errQuota',
  'too-large': 'errTooLarge',
  'too-long': 'errTooLarge',
  'unsupported-format': 'errUnsupported',
  'converter-missing': 'errConverter',
  'permission': 'errPermission',
  'no-browser': 'errNoBrowser',
  'no-window': 'errNoWindow',
  'incomplete': 'errIncomplete',
  'provider-error': 'errProvider',
  'unsupported': 'errUnsupported',
};

const state = {
  mode: 'page',
  lang: 'fr',
  phase: 'idle',
  page: null,
  file: null,
  result: null,
  requestId: '',
  busy: false,
  lastProvider: 'mymemory',
  permission: null,
};

const els = {
  app: $('app'), line: $('line'), face: $('face'), modes: $('modes'),
  pageMode: $('pageMode'), docMode: $('docMode'),
  workspace: $('workspace'), pageSource: $('pageSource'), docSource: $('docSource'),
  pageCard: $('pageCard'), pageTitle: $('pageTitle'), pageHost: $('pageHost'), siteMark: $('siteMark'),
  pageUrl: $('pageUrl'), detect: $('detect'), openPermissions: $('openPermissions'),
  pickFile: $('pickFile'), changeFile: $('changeFile'), fileCard: $('fileCard'),
  fileExt: $('fileExt'), fileName: $('fileName'), fileMeta: $('fileMeta'),
  targetLang: $('targetLang'), sourceLang: $('sourceLang'), go: $('go'),
  progress: $('progress'), progressFill: $('progressFill'), progressText: $('progressText'),
  provider: $('provider'), apiKey: $('apiKey'), apiUrl: $('apiUrl'), saveSettings: $('saveSettings'), settingsNote: $('settingsNote'),
  result: $('result'), resultTitle: $('resultTitle'), resultMeta: $('resultMeta'),
  pageResult: $('pageResult'), docPreview: $('docPreview'), resultNote: $('resultNote'),
  back: $('back'), saveResult: $('saveResult'), openResult: $('openResult'),
  close: $('close'), engine: $('engine'), toast: $('toast'), brandLabel: $('brandLabel'),
};

let toastTimer = 0;
let previewUrl = '';

function t(key, vars = {}) {
  const text = COPY[state.lang]?.[key] ?? COPY.fr[key] ?? key;
  return String(text).replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])));
}

function shortHost(value) {
  try { return new URL(value).hostname.replace(/^www\./i, ''); } catch { return ''; }
}

function formatSize(bytes) {
  const size = Number(bytes) || 0;
  if (!size) return '—';
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function setFace(face) {
  els.face.src = `../../assets/capri/face-${face}.png`;
  $('faceWrap').classList.toggle('is-busy', state.phase === 'scanning' || state.phase === 'translating');
  $('faceWrap').classList.toggle('is-done', state.phase === 'done');
}

function setLine(text, face = 'calm') {
  els.line.textContent = text;
  setFace(face);
}

function setPhase(phase) {
  state.phase = phase;
  els.app.dataset.state = phase;
  els.progress.hidden = !['scanning', 'translating'].includes(phase);
  if (phase === 'scanning') {
    els.progressFill.style.animation = '';
    els.progressFill.style.width = '38%';
    els.progressText.textContent = t(els.app.dataset.mode === 'document' ? 'reading' : 'scanning');
  }
  if (phase === 'idle' || phase === 'error' || phase === 'done') {
    els.progressFill.style.animation = '';
    els.progressFill.style.width = '0';
  }
  setBusy(['scanning', 'translating'].includes(phase));
}

function setBusy(busy) {
  state.busy = busy;
  els.go.disabled = busy;
  els.detect.disabled = busy;
  els.pickFile.disabled = busy;
  els.changeFile.disabled = busy;
  els.pageMode.disabled = busy;
  els.docMode.disabled = busy;
  els.pageUrl.disabled = busy;
  els.targetLang.disabled = busy;
}

function applyStatic() {
  document.documentElement.lang = state.lang;
  els.brandLabel.textContent = t('brand');
  for (const node of document.querySelectorAll('[data-i18n]')) {
    const key = node.dataset.i18n;
    if (COPY[state.lang]?.[key] || COPY.fr[key]) node.textContent = t(key);
  }
  els.sourceLang.querySelector('option[value="auto"]').textContent = t('auto');
}

function showToast(message, tone = 'ok') {
  if (!message) return;
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.dataset.tone = tone;
  els.toast.hidden = false;
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 4200);
}

function buildLanguages() {
  els.targetLang.replaceChildren(...LANGUAGES.map(([code, label]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = label;
    return option;
  }));
  const saved = localStorage.getItem('capri.translation.target');
  const fallback = LANGUAGES.some(([code]) => code === state.lang) ? state.lang : 'en';
  els.targetLang.value = LANGUAGES.some(([code]) => code === saved) ? saved : fallback;
}

function targetLabel() {
  return LANGUAGES.find(([code]) => code === els.targetLang.value)?.[1] || els.targetLang.value;
}

function setEngine() {
  els.engine.textContent = PROVIDER_NAMES[els.provider.value] || els.provider.value.toUpperCase();
  els.engine.title = els.provider.value === 'mymemory' ? 'MyMemory (gratuit)' : els.provider.value;
}

function renderPageCard() {
  const url = els.pageUrl.value.trim();
  const host = state.page?.detected ? shortHost(state.page.url) : shortHost(url);
  const detected = Boolean(state.page?.detected);
  els.pageCard.dataset.state = detected ? 'detected' : 'manual';
  if (detected) {
    els.pageTitle.textContent = state.page.title || host || t('activePage');
    els.pageHost.textContent = host ? `${host} · ${t('activeTab')}` : '—';
  } else {
    els.pageTitle.textContent = host || t('manualTitle');
    els.pageHost.textContent = host ? t('webAddress') : t('lineManual');
  }
  els.siteMark.textContent = (host || '◎').slice(0, 1).toUpperCase();
}

function renderFileCard() {
  if (!state.file) {
    els.fileCard.hidden = true;
    els.pickFile.hidden = false;
    return;
  }
  els.fileCard.hidden = false;
  els.pickFile.hidden = true;
  els.fileExt.textContent = state.file.ext || 'FILE';
  els.fileName.textContent = state.file.name;
  els.fileMeta.textContent = t('fileMeta', {
    ext: (state.file.ext || '?').toUpperCase(),
    size: formatSize(state.file.size),
  });
}

function idleLine() {
  if (state.mode === 'document') {
    return state.file ? t('lineFile', { name: state.file.name }) : t('lineIdleDoc');
  }
  if (state.page?.detected) return t('lineDetected', { title: state.page.title || shortHost(state.page.url) });
  return els.pageUrl.value.trim() ? t('lineManualEdit') : t('lineManual');
}

function setMode(next) {
  if (state.busy) return;
  state.mode = next;
  els.app.dataset.mode = next;
  els.pageMode.classList.toggle('is-active', next === 'page');
  els.docMode.classList.toggle('is-active', next === 'document');
  els.pageSource.hidden = next !== 'page';
  els.docSource.hidden = next !== 'document';
  setLine(idleLine(), 'calm');
}

async function detectPage({ silent = false } = {}) {
  if (state.busy) return;
  if (!silent) setLine(t('detecting'), 'look');
  const before = els.pageUrl.value;
  const result = await api.translationActivePage?.();
  devLog('[translation] détection page', result?.ok ? { ok: true, host: (() => { try { return new URL(result.url).hostname; } catch { return ''; } })() } : { ok: false, code: result?.code, reason: result?.reason });
  if (state.busy || els.pageUrl.value !== before) return;
  if (result?.ok) {
    state.permission = null;
    els.openPermissions.hidden = true;
    state.page = { url: result.url, title: result.title || '', detected: true };
    els.pageUrl.value = result.url;
    renderPageCard();
    setLine(t('lineDetected', { title: result.title || shortHost(result.url) }), 'smug');
    return;
  }
  state.permission = result?.code === 'permission' && result.targetId
    ? { targetId: result.targetId, browser: result.browser || '', app: result.targetApp || '' }
    : null;
  els.openPermissions.hidden = !state.permission;
  state.page = null;
  renderPageCard();
  let line = t('lineManual');
  if (result?.code === 'permission') line = t('errPermission');
  else if (result?.code === 'no-browser') line = t('errNoBrowser');
  else if (!silent && result?.code === 'no-window') line = t('errNoWindow');
  else if (!silent && result?.code !== 'unsupported') line = t('lineManual');
  setLine(line, 'aside');
  if (!silent && !els.pageUrl.value.trim()) els.pageUrl.focus();
}

async function openMacPermissions() {
  const targetId = state.permission?.targetId;
  if (!targetId) return;
  els.openPermissions.disabled = true;
  try {
    const result = await api.translationOpenPermissions?.(targetId);
    if (result?.ok) showToast(t('permissionOpened'));
    else showToast(result?.error || t('errPermission'), 'error');
  } catch (error) {
    showToast(String(error?.message || error), 'error');
  } finally {
    els.openPermissions.disabled = false;
  }
}

function resetResult() {
  state.result = null;
  els.result.hidden = true;
  els.workspace.hidden = false;
  els.modes.hidden = false;
  els.pageResult.replaceChildren();
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = ''; }
  els.docPreview.removeAttribute('src');
  els.docPreview.hidden = true;
  els.resultNote.hidden = true;
  els.saveResult.disabled = false;
  els.openResult.disabled = false;
}

function renderPageBlocks(blocks) {
  const fragment = document.createDocumentFragment();
  for (const block of blocks) {
    const heading = /^h([1-6])$/.exec(block.tag || '');
    const element = document.createElement(block.tag === 'pre' ? 'pre' : 'p');
    if (heading) element.className = `result__h result__h--${heading[1]}`;
    else if (block.tag === 'li') element.className = 'result__li';
    else if (block.tag === 'blockquote') element.className = 'result__quote';
    else if (block.tag === 'pre') element.className = 'result__pre';
    else element.className = 'result__p';
    element.textContent = block.text;
    fragment.append(element);
  }
  els.pageResult.replaceChildren(fragment);
}

function renderResult(result) {
  state.result = result;
  els.workspace.hidden = true;
  els.modes.hidden = true;
  els.result.hidden = false;
  setPhase('done');
  els.pageResult.scrollTop = 0;

  if (result.kind === 'document') {
    els.resultTitle.textContent = result.filename || result.title || '—';
    els.resultMeta.textContent = t('docMeta', {
      name: result.title || result.filename || '',
      n: result.stats?.segments || 0,
    }) + ` → ${targetLabel()}`;
    els.pageResult.hidden = true;
    els.docPreview.hidden = false;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(new Blob([result.previewHtml || ''], { type: 'text/html' }));
    els.docPreview.src = previewUrl;
    if (result.note === 'rtf' || result.note === 'extract') {
      els.resultNote.textContent = t(result.note === 'rtf' ? 'noteRtf' : 'noteExtract');
      els.resultNote.hidden = false;
    } else {
      els.resultNote.hidden = true;
    }
    setLine(t('lineDoneDoc'), 'laugh');
  } else {
    els.resultTitle.textContent = result.title || result.url || '—';
    els.resultMeta.textContent = t('pageMeta', {
      site: result.site || shortHost(result.url),
      n: result.blocks?.length || 0,
    }) + ` → ${targetLabel()}`;
    els.resultNote.hidden = true;
    els.docPreview.hidden = true;
    els.docPreview.removeAttribute('srcdoc');
    els.pageResult.hidden = false;
    renderPageBlocks(result.blocks || []);
    setLine(t('lineDonePage'), 'laugh');
  }
}

function fail(result) {
  devLog('[translation] échec', { code: result?.code, error: result?.error, reason: result?.reason });
  resetResult();
  setPhase('error');
  const key = ERROR_KEYS[result?.code]
    || (/API key|clé API/i.test(String(result?.error || '')) ? 'errMissingKey' : 'errGeneric');
  setLine(t(key), 'aside');
}

function ensureHttpUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

async function translate() {
  if (state.busy) return;
  let source;
  if (state.mode === 'page') {
    const url = ensureHttpUrl(els.pageUrl.value);
    if (!url) {
      setPhase('error');
      setLine(t('errNoUrl'), 'aside');
      els.pageUrl.focus();
      return;
    }
    els.pageUrl.value = url;
    source = { kind: 'page', value: url };
  } else {
    if (!state.file) {
      setPhase('error');
      setLine(t('errNoFile'), 'aside');
      return;
    }
    source = { kind: 'document', value: state.file.path, ...(state.file.location ? { location: state.file.location } : {}) };
  }

  state.requestId = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `tr-${Date.now()}`;
  resetResult();
  setPhase('scanning');
  setLine(state.mode === 'document' ? t('lineScanDoc') : t('lineScanPage'), 'look');

  const started = Date.now();
  try {
    const result = await api.translationTranslate({
      requestId: state.requestId,
      source,
      options: {
        provider: els.provider.value,
        apiUrl: els.apiUrl.value.trim(),
        source: els.sourceLang.value,
        target: els.targetLang.value,
      },
    });
    const wait = Math.max(0, 1500 - (Date.now() - started));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    if (!result?.ok) {
      fail(result);
      return;
    }
    localStorage.setItem('capri.translation.target', els.targetLang.value);
    renderResult(result);
  } catch (error) {
    fail({ code: 'error', error: String(error?.message || error) });
  }
}

async function chooseFile() {
  if (state.busy) return;
  const result = await api.translationChooseFile?.();
  if (!result?.ok) return;
  devLog('[translation] fichier choisi', { path: result.path, ext: result.ext, size: result.size });
  state.file = { path: result.path, name: result.name, ext: result.ext, size: result.size };
  renderFileCard();
  setLine(t('lineFile', { name: result.name }), 'smug');
}

async function pickAndMode() {
  await chooseFile();
}

async function saveResult() {
  if (!state.result) return;
  els.saveResult.disabled = true;
  const result = await api.translationSave?.({ format: state.result.format });
  els.saveResult.disabled = false;
  if (result?.ok) {
    setLine(t('lineSaved'), 'laugh');
    showToast(t('savedToast', { name: result.name || result.path }));
  } else if (!result?.canceled) {
    showToast(result?.error || t('errGeneric'), 'error');
  }
}

async function openResult() {
  if (!state.result) return;
  els.openResult.disabled = true;
  const result = await api.translationOpenResult?.();
  els.openResult.disabled = false;
  if (result?.ok) setLine(t('lineOpened'), 'laugh');
  else showToast(result?.error || t('errGeneric'), 'error');
}

function backToSource() {
  resetResult();
  setPhase('idle');
  setLine(idleLine(), 'calm');
}

async function saveSettings() {
  const result = await api.translationSetSettings?.({
    provider: els.provider.value,
    apiKey: els.apiKey.value,
    apiUrl: els.apiUrl.value,
  });
  if (result?.ok) {
    els.apiKey.value = '';
    els.settingsNote.textContent = t('lineSettings');
    els.settingsNote.hidden = false;
    setEngine();
    setLine(t('lineSettings'), 'smug');
  } else {
    els.settingsNote.textContent = result?.error || t('lineSettingsError');
    els.settingsNote.hidden = false;
    showToast(t('lineSettingsError'), 'error');
  }
}

function loadSource(source) {
  if (state.busy) return;
  if (!source || typeof source !== 'object') return;
  devLog('[translation] source reçue', {
    kind: source.kind,
    location: source.location || '',
    host: source.kind === 'url' || source.kind === 'page'
      ? (() => { try { return new URL(source.value).hostname; } catch { return ''; } })()
      : undefined,
  });
  if (source.kind === 'active-page') {
    state.page = null;
    els.pageUrl.value = '';
    renderPageCard();
    setMode('page');
    detectPage();
    return;
  }
  if (source.kind === 'file' && source.value) {
    const filePath = String(source.value);
    const name = filePath.split(/[\\/]/).pop() || filePath;
    const ext = (/\.([a-z0-9]+)$/i.exec(name)?.[1] || '').toLowerCase();
    state.file = { path: filePath, name, ext, size: 0, location: source.location || '' };
    renderFileCard();
    setMode('document');
    setLine(t('lineFile', { name }), 'smug');
    return;
  }
  if (source.kind === 'url' && source.value) {
    state.page = null;
    els.pageUrl.value = String(source.value);
    renderPageCard();
    setMode('page');
    const url = ensureHttpUrl(source.value);
    if (url) setLine(t('lineChatUrl', { host: shortHost(url) }), 'smug');
    return;
  }
  if (state.mode === 'page') detectPage();
}

function applySettings(settings) {
  if (!settings) return;
  state.lang = COPY[settings.lang] ? settings.lang : 'fr';
  state.lastProvider = settings.provider || 'mymemory';
  els.provider.value = state.lastProvider;
  els.apiUrl.value = settings.apiUrl || '';
  els.apiKey.value = '';
  applyStatic();
  setEngine();
  buildLanguages();
  renderPageCard();
}

// --- wiring -----------------------------------------------------------------

els.pageMode.addEventListener('click', () => setMode('page'));
els.docMode.addEventListener('click', () => setMode('document'));
els.pageUrl.addEventListener('input', () => {
  if (state.busy) return;
  state.page = state.page?.detected ? null : state.page;
  renderPageCard();
});
els.pageUrl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); translate(); }
});
els.detect.addEventListener('click', () => detectPage());
els.openPermissions.addEventListener('click', openMacPermissions);
els.pickFile.addEventListener('click', pickAndMode);
els.changeFile.addEventListener('click', chooseFile);
els.go.addEventListener('click', translate);
els.back.addEventListener('click', backToSource);
els.saveResult.addEventListener('click', saveResult);
els.openResult.addEventListener('click', openResult);
els.targetLang.addEventListener('change', () => localStorage.setItem('capri.translation.target', els.targetLang.value));
els.provider.addEventListener('change', setEngine);
els.saveSettings.addEventListener('click', saveSettings);
els.close.addEventListener('click', () => api.translationClose?.());

let permissionRetry = 0;
window.addEventListener('focus', () => {
  if (!state.permission || state.busy || state.mode !== 'page') return;
  const now = Date.now();
  if (now - permissionRetry < 1500) return;
  permissionRetry = now;
  detectPage({ silent: true });
});

api.onTranslationProgress?.((update) => {
  if (!update || update.requestId !== state.requestId) return;
  devLog('[translation] progression', update);
  if (update.phase === 'translating') {
    els.app.dataset.state = 'translating';
    state.phase = 'translating';
    els.progress.hidden = false;
    els.progressFill.style.animation = 'none';
    const percent = update.total ? Math.min(100, Math.round((update.done / update.total) * 100)) : 0;
    els.progressFill.style.width = `${Math.max(percent, 4)}%`;
    els.progressText.textContent = `${t('translatingShort')} ${percent} %`;
    els.line.textContent = t('lineTranslating');
  } else if (update.phase === 'scanning' || update.phase === 'reading') {
    els.progressText.textContent = update.phase === 'reading' ? t('reading') : t('scanning');
  }
});

api.onTranslationSource?.((source) => loadSource(source));

(async () => {
  applyStatic();
  buildLanguages();
  renderPageCard();
  renderFileCard();
  setMode('page');
  setPhase('idle');
  const settings = await api.translationSettings?.();
  applySettings(settings);
  setLine(idleLine(), 'calm');
  if (state.mode === 'page' && !els.pageUrl.value.trim()) detectPage({ silent: true });
})();
