'use strict';

const MESSAGES = {
  fr: {
    title: 'Mise à jour de Capri', eyebrow: 'CAPRI / CANAL SÉCURISÉ', installed: 'VERSION INSTALLÉE', github: 'DERNIÈRE VERSION SIGNÉE',
    status: { idle: 'Prête à vérifier', checking: 'Recherche des mises à jour', 'up-to-date': 'Capri est à jour', ahead: 'La version installée est plus récente', available: 'Mise à jour disponible', downloading: 'Téléchargement', verifying: 'Vérification de l’intégrité', ready: 'Prête à installer', installing: 'Installation en cours', success: 'Mise à jour installée', error: 'Mise à jour impossible', disabled: 'Mises à jour désactivées' },
    detail: { idle: 'Le manifeste GitHub sera vérifié avec la clé Ed25519 intégrée.', checking: 'Récupération du manifeste signé sur GitHub Releases…', 'up-to-date': 'Votre installation correspond à la dernière version stable publiée.', ahead: 'La version installée est plus récente que la dernière publication stable.', available: 'Le paquet compatible sera téléchargé seulement en mode automatique ou après votre demande.', downloading: 'Téléchargement du paquet officiel…', verifying: 'Comparaison du SHA-512 avec le manifeste authentifié…', ready: 'Le paquet est vérifié. Capri attend votre confirmation avant de l’installer.', installing: 'Capri va se fermer pour appliquer la mise à jour.', success: 'La nouvelle version a démarré après la mise à jour.', disabled: 'Aucune communication ni vérification automatique n’a lieu dans ce mode.', error: 'La vérification ou l’installation a échoué. Consultez le détail ci-dessous puis réessayez.' },
    mode: 'Mode de mise à jour', automatic: 'Automatique — vérifier et télécharger, installation après confirmation', manual: 'Manuel — vérifier et télécharger uniquement à la demande', disabled: 'Désactivé — aucune communication avec GitHub', lastCheck: 'Dernière vérification :', never: 'Aucune vérification depuis ce lancement', notes: 'Notes de version', releaseDate: 'Publication :', check: 'Vérifier les mises à jour', download: 'Télécharger la mise à jour', install: 'Installer et redémarrer', repository: 'Dépôt officiel GitHub', close: 'Fermer',
    unsupported: 'Les mises à jour intégrées ciblent macOS ARM64/Intel et Windows x64. Cette plateforme ou architecture n’est pas prise en charge.', dev: 'L’installation intégrée est disponible dans les applications empaquetées, pas en mode développement.',
  },
  en: {
    title: 'Capri updates', eyebrow: 'CAPRI / SECURE UPDATE CHANNEL', installed: 'INSTALLED VERSION', github: 'LATEST SIGNED VERSION',
    status: { idle: 'Ready to check', checking: 'Checking for updates', 'up-to-date': 'Capri is up to date', ahead: 'Installed version is newer', available: 'Update available', downloading: 'Downloading', verifying: 'Verifying integrity', ready: 'Ready to install', installing: 'Installing', success: 'Update installed', error: 'Update failed', disabled: 'Updates disabled' },
    detail: { idle: 'The GitHub manifest will be verified with Capri’s embedded Ed25519 public key.', checking: 'Fetching the signed manifest from GitHub Releases…', 'up-to-date': 'Your installation matches the latest stable published version.', ahead: 'The installed version is newer than the latest stable release.', available: 'The compatible package downloads automatically in Automatic mode, or when you request it.', downloading: 'Downloading the official package…', verifying: 'Checking SHA-512 against the authenticated manifest…', ready: 'The package is verified. Capri waits for your confirmation before installing it.', installing: 'Capri will close to apply the update.', success: 'The new version started after the update.', disabled: 'No GitHub communication or automatic checks happen in this mode.', error: 'The check or installation failed. Review the details below and retry.' },
    mode: 'Update mode', automatic: 'Automatic — check and download; install only after confirmation', manual: 'Manual — check and download only when requested', disabled: 'Disabled — no communication with GitHub', lastCheck: 'Last check:', never: 'No check during this launch', notes: 'Release notes', releaseDate: 'Published:', check: 'Check for updates', download: 'Download update', install: 'Install and restart', repository: 'Official GitHub repository', close: 'Close',
    unsupported: 'Integrated updates target macOS ARM64/Intel and Windows x64. This platform or architecture is not supported.', dev: 'Integrated installation is available in packaged apps, not development mode.',
  },
  ru: {
    title: 'Обновление Capri', eyebrow: 'CAPRI / ЗАЩИЩЁННЫЙ КАНАЛ', installed: 'УСТАНОВЛЕННАЯ ВЕРСИЯ', github: 'ПОСЛЕДНЯЯ ПОДПИСАННАЯ ВЕРСИЯ',
    status: { idle: 'Готова к проверке', checking: 'Проверка обновлений', 'up-to-date': 'Capri обновлена', ahead: 'Установленная версия новее', available: 'Доступно обновление', downloading: 'Загрузка', verifying: 'Проверка целостности', ready: 'Готово к установке', installing: 'Установка', success: 'Обновление установлено', error: 'Ошибка обновления', disabled: 'Обновления отключены' },
    detail: { idle: 'Манифест GitHub будет проверен встроенным открытым ключом Ed25519.', checking: 'Получаем подписанный манифест из GitHub Releases…', 'up-to-date': 'Установлена последняя стабильная опубликованная версия.', ahead: 'Установленная версия новее последнего стабильного релиза.', available: 'Совместимый пакет загрузится автоматически в режиме «Автоматически» или по вашему запросу.', downloading: 'Загружаем официальный пакет…', verifying: 'Сверяем SHA-512 с аутентифицированным манифестом…', ready: 'Пакет проверен. Capri ждёт подтверждения перед установкой.', installing: 'Capri закроется для установки обновления.', success: 'После обновления запущена новая версия.', disabled: 'В этом режиме Capri не связывается с GitHub и не проверяет обновления.', error: 'Не удалось проверить или установить обновление. Проверьте подробности и попробуйте снова.' },
    mode: 'Режим обновления', automatic: 'Автоматически — проверять и загружать, устанавливать после подтверждения', manual: 'Вручную — проверять и загружать только по запросу', disabled: 'Отключено — без связи с GitHub', lastCheck: 'Последняя проверка:', never: 'В этой сессии проверок не было', notes: 'Что нового', releaseDate: 'Опубликовано:', check: 'Проверить обновления', download: 'Загрузить обновление', install: 'Установить и перезапустить', repository: 'Официальный репозиторий GitHub', close: 'Закрыть',
    unsupported: 'Встроенные обновления доступны для macOS ARM64/Intel и Windows x64. Эта платформа или архитектура не поддерживается.', dev: 'Встроенная установка доступна в собранных приложениях, но не в режиме разработки.',
  },
};

const el = (id) => document.getElementById(id);
const put = (id, value) => { el(id).textContent = value; };
let words = MESSAGES.fr;
let currentState = null;

function displayState(state = {}) {
  currentState = state;
  const mode = MESSAGES[state.language] ? MESSAGES[state.language] : words;
  const status = state.status || 'idle';
  const result = el('result');
  result.dataset.state = status;
  put('installed-version', `Capri ${state.installed || '—'}`);
  put('github-version', `Capri ${state.latest || '—'}`);
  put('result-title', words.status[status] || words.status.error);
  let message = state.error || words.detail[status] || words.detail.error;
  if (!state.supported) message = words.unsupported;
  else if (!state.packaged && status === 'ready') message = words.dev;
  put('result-message', message);
  const progress = el('progress');
  progress.hidden = status !== 'downloading' && status !== 'verifying';
  progress.value = Number(state.progress) || 0;
  if (status === 'downloading' && state.total) put('result-message', `${message} ${Math.round(progress.value * 100)}% (${formatBytes(state.downloaded)} / ${formatBytes(state.total)})`);
  const download = el('download'); download.hidden = status !== 'available' && !(status === 'error' && Boolean(state.latest)); download.disabled = !state.supported || state.mode === 'disabled';
  const install = el('install'); install.hidden = status !== 'ready'; install.disabled = !state.installable;
  el('check').disabled = status === 'checking' || status === 'downloading' || status === 'verifying' || state.mode === 'disabled' || !state.supported;
  el('mode').value = state.mode || 'automatic';
  put('last-check', state.checkedAt ? `${words.lastCheck} ${new Date(state.checkedAt).toLocaleString()}` : words.never);
  const notes = String(state.releaseNotes || '').trim();
  el('notes-panel').hidden = !notes;
  put('release-notes', notes);
  if (state.publishedAt) put('release-date', `${words.releaseDate} ${new Date(state.publishedAt).toLocaleDateString()}`);
  else put('release-date', '');
}
function formatBytes(bytes) { const value = Number(bytes) || 0; return value < 1024 * 1024 ? `${Math.round(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }

async function checkVersion() { el('check').disabled = true; const result = await window.versionPage.check(); if (result?.status) displayState({ ...currentState, ...result }); else if (!result?.ok) displayState({ ...currentState, status: 'error', error: result?.error || words.detail.error }); }
async function downloadUpdate() { el('download').disabled = true; const result = await window.versionPage.download(); if (!result?.ok) displayState({ ...currentState, status: 'error', error: result?.error || words.detail.error }); }
async function installUpdate() { el('install').disabled = true; const result = await window.versionPage.install(); if (!result?.ok && !result?.canceled) displayState({ ...currentState, status: 'error', error: result?.error || words.detail.error }); else if (result?.canceled) displayState(currentState); }

async function init() {
  const cfg = await window.versionPage.getConfig();
  const language = String(cfg.lang || 'fr').toLowerCase().split('-')[0];
  words = MESSAGES[language] || MESSAGES.fr;
  document.documentElement.lang = MESSAGES[language] ? language : 'fr';
  for (const [id, key] of [['title','title'],['eyebrow','eyebrow'],['installed-label','installed'],['github-label','github'],['mode-label','mode'],['mode-automatic','automatic'],['mode-manual','manual'],['mode-disabled','disabled'],['notes-title','notes'],['check','check'],['download','download'],['install','install'],['repository','repository']]) put(id, words[key]);
  el('close').setAttribute('aria-label', words.close); el('close').addEventListener('click', () => window.versionPage.close());
  el('check').addEventListener('click', checkVersion); el('download').addEventListener('click', downloadUpdate); el('install').addEventListener('click', installUpdate);
  el('repository').addEventListener('click', () => window.versionPage.openRepository());
  el('mode').addEventListener('change', async (event) => { const result = await window.versionPage.setMode(event.target.value); if (!result?.ok) displayState({ ...currentState, status: 'error', error: result?.error }); });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') window.versionPage.close(); });
  window.versionPage.onState(displayState);
  displayState(await window.versionPage.state());
}

init().catch(() => displayState({ status: 'error' }));
