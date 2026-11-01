'use strict';

const ENGINES = {
  google: 'https://www.google.com/search',
  bing: 'https://www.bing.com/search',
  duckduckgo: 'https://duckduckgo.com/',
};

function buildWebSearchUrl(query, engine = 'google') {
  const text = String(query || '').trim().slice(0, 240);
  const selected = String(engine || 'google').toLowerCase();
  if (!text || text.includes('\0') || /[\u0000-\u001f]/.test(text)) return null;
  const base = ENGINES[selected];
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set('q', text);
  return url.toString();
}

async function openWebSearch({ query, engine = 'google', openExternal } = {}) {
  const url = buildWebSearchUrl(query, engine);
  if (!url) return { ok: false, error: 'Requête de recherche invalide ou moteur non pris en charge.' };
  if (typeof openExternal !== 'function') return { ok: false, error: 'Ouverture du navigateur indisponible.' };
  try {
    await openExternal(url);
    return { ok: true, url, engine: String(engine || 'google').toLowerCase() };
  } catch (error) {
    return { ok: false, error: error.message || 'La recherche en ligne n’a pas pu être ouverte.' };
  }
}

module.exports = { ENGINES, buildWebSearchUrl, openWebSearch };
