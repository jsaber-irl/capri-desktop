'use strict';

const BROWSERS = new Set(['Safari', 'Firefox', 'Google Chrome']);

function buildVideoSearchUrl(creator) {
  const query = String(creator || '').trim().slice(0, 120);
  if (!query || /[\u0000-\u001f]/.test(query)) return null;
  const normalized = query.replace(/\bmister\s+beast\b|\bmr\.?\s*beast\b/gi, 'MrBeast');
  const url = new URL('https://www.youtube.com/results');
  url.searchParams.set('search_query', `${normalized} latest videos`);
  // YouTube's documented UI filter value orders search results by upload date.
  url.searchParams.set('sp', 'CAISAhAB');
  return url.toString();
}

async function openVideoSearch({ creator, browser = '', platform = process.platform, openExternal, openInBrowser } = {}) {
  const url = buildVideoSearchUrl(creator);
  if (!url) return { ok: false, error: 'Nom de chaîne invalide.' };
  const target = String(browser || '').trim();
  if (target && !BROWSERS.has(target)) return { ok: false, error: 'Navigateur non pris en charge pour cette recherche.' };
  try {
    if (target) {
      if (platform !== 'darwin' || typeof openInBrowser !== 'function') return { ok: false, error: `${target} ne peut pas être ciblé depuis cette plateforme.` };
      await openInBrowser(target, url);
    } else {
      if (typeof openExternal !== 'function') return { ok: false, error: 'Ouverture du navigateur indisponible.' };
      await openExternal(url);
    }
    return { ok: true, url, browser: target || 'default' };
  } catch (error) {
    return { ok: false, error: error.message || 'La recherche YouTube n’a pas pu être ouverte.' };
  }
}

module.exports = { BROWSERS, buildVideoSearchUrl, openVideoSearch };
