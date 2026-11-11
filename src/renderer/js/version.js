'use strict';

const MESSAGES = {
  fr: {
    title: 'Mise à jour de Capri', eyebrow: 'CAPRI / ÉTAT DU PROJET', installed: 'VERSION INSTALLÉE', github: 'VERSION DU PROJET GITHUB',
    checkingTitle: 'Vérification de la version', checking: 'Comparaison avec le package.json du projet Capri sur GitHub…',
    availableTitle: 'Une nouvelle version est disponible',
    available: 'Une nouvelle version de Capri-desktop est disponible ! Elle apporte de nouvelles fonctionnalités, corrige des bugs et améliore les performances. Nous vous recommandons d’utiliser la dernière version de Capri depuis le dépôt GitHub officiel.',
    currentTitle: 'Capri est à jour', current: 'Vous utilisez déjà la version la plus récente publiée dans le package.json du projet.',
    aheadTitle: 'Votre version est plus récente', ahead: 'La version installée est plus récente que celle actuellement indiquée dans le package.json du projet GitHub.',
    errorTitle: 'Vérification impossible', error: 'Capri n’a pas pu récupérer la version du projet. Vérifiez votre connexion puis réessayez.',
    repository: 'Ouvrir le dépôt officiel GitHub', check: 'Vérifier à nouveau', close: 'Fermer',
  },
  en: {
    title: 'Capri updates', eyebrow: 'CAPRI / PROJECT STATUS', installed: 'INSTALLED VERSION', github: 'GITHUB PROJECT VERSION',
    checkingTitle: 'Checking project version', checking: 'Comparing with the Capri project package.json on GitHub…',
    availableTitle: 'A new version is available',
    available: 'A new version of Capri-desktop is available! It includes new features, bug fixes, and performance improvements. We recommend using the latest version of Capri from the official GitHub repository.',
    currentTitle: 'Capri is up to date', current: 'You are already using the latest version listed in the project package.json.',
    aheadTitle: 'Your version is newer', ahead: 'The installed version is newer than the version currently listed in the GitHub project package.json.',
    errorTitle: 'Could not check for updates', error: 'Capri could not retrieve the project version. Check your connection and try again.',
    repository: 'Open the official GitHub repository', check: 'Check again', close: 'Close',
  },
  ru: {
    title: 'Обновление Capri', eyebrow: 'CAPRI / СОСТОЯНИЕ ПРОЕКТА', installed: 'УСТАНОВЛЕННАЯ ВЕРСИЯ', github: 'ВЕРСИЯ ПРОЕКТА НА GITHUB',
    checkingTitle: 'Проверка версии проекта', checking: 'Сравниваем с package.json проекта Capri на GitHub…',
    availableTitle: 'Доступна новая версия',
    available: 'Доступна новая версия Capri-desktop! В ней появились новые функции, исправлены ошибки и улучшена производительность. Рекомендуем использовать последнюю версию Capri из официального репозитория GitHub.',
    currentTitle: 'Capri обновлена', current: 'У вас уже установлена последняя версия, указанная в package.json проекта.',
    aheadTitle: 'Ваша версия новее', ahead: 'Установленная версия новее версии, указанной сейчас в package.json проекта на GitHub.',
    errorTitle: 'Не удалось проверить версию', error: 'Capri не удалось получить версию проекта. Проверьте подключение и попробуйте снова.',
    repository: 'Открыть официальный репозиторий GitHub', check: 'Проверить ещё раз', close: 'Закрыть',
  },
};

const element = (id) => document.getElementById(id);
const put = (id, value) => { element(id).textContent = value; };
let words = MESSAGES.fr;

function showState(state) {
  element('result').dataset.state = state;
  if (state === 'checking') {
    put('result-title', words.checkingTitle);
    put('result-message', words.checking);
    return;
  }
  if (state === 'available') {
    put('result-title', words.availableTitle);
    put('result-message', words.available);
  } else if (state === 'ahead') {
    put('result-title', words.aheadTitle);
    put('result-message', words.ahead);
  } else if (state === 'current') {
    put('result-title', words.currentTitle);
    put('result-message', words.current);
  } else {
    put('result-title', words.errorTitle);
    put('result-message', words.error);
  }
}

async function checkVersion() {
  const button = element('check');
  button.disabled = true;
  showState('checking');
  const result = await window.versionPage.check();
  button.disabled = false;
  if (!result?.ok) {
    put('installed-version', `Capri ${result?.installed || '—'}`);
    put('github-version', '—');
    showState('error');
    return;
  }
  put('installed-version', `Capri ${result.installed}`);
  put('github-version', `Capri ${result.latest}`);
  const state = result.updateAvailable ? 'available' : (result.latest === result.installed ? 'current' : 'ahead');
  showState(state);
}

async function init() {
  const cfg = await window.versionPage.getConfig();
  const language = String(cfg.lang || 'fr').toLowerCase().split('-')[0];
  words = MESSAGES[language] || MESSAGES.fr;
  document.documentElement.lang = MESSAGES[language] ? language : 'fr';
  put('title', words.title); put('eyebrow', words.eyebrow); put('installed-label', words.installed); put('github-label', words.github);
  put('repository', words.repository); put('check', words.check); element('close').setAttribute('aria-label', words.close);
  element('close').addEventListener('click', () => window.versionPage.close());
  element('check').addEventListener('click', checkVersion);
  element('repository').addEventListener('click', () => window.versionPage.openRepository());
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') window.versionPage.close(); });
  await checkVersion();
}

init().catch(() => showState('error'));
