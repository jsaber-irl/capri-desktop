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

const WIKI_LANGS = new Set(['fr', 'en', 'ru']);

// Réponse courte à une question factuelle, avec une source contrôlée et citée.
async function quickWebAnswer({ query, lang = 'en', fetchImpl = globalThis.fetch } = {}) {
  const text = String(query || '').trim();
  const searchText = /\bben\s*yamin\b.*\bnathan(?:yahu|yahou)\b/iu.test(text) ? 'Benjamin Netanyahu' : text;
  const language = WIKI_LANGS.has(lang) ? lang : 'en';
  if (text.length < 2 || text.length > 180 || /[\u0000-\u001f]/u.test(text)) {
    return { ok: false, error: 'La question de recherche est invalide.' };
  }
  if (typeof fetchImpl !== 'function') return { ok: false, error: 'La recherche web intégrée est indisponible.' };

  const endpoint = new URL(`https://${language}.wikipedia.org/w/api.php`);
  const request = async (params) => {
    const url = new URL(endpoint);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json', 'user-agent': 'CapriDesktop/2.x (https://github.com/jsaber-irl/capri-desktop)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
    if (response.url && new URL(response.url).origin !== endpoint.origin) throw new Error('La source a redirigé vers un domaine inattendu.');
    return response.json();
  };

  try {
    const search = await request({ action: 'query', list: 'search', srsearch: searchText, srlimit: '1', utf8: '1', format: 'json' });
    const page = search?.query?.search?.[0];
    if (!page?.title) return { ok: false, error: 'Aucun article pertinent trouvé.' };
    const summary = await request({ action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exchars: '1200', redirects: '1', titles: page.title, utf8: '1', format: 'json' });
    const result = Object.values(summary?.query?.pages || {})[0];
    const extract = String(result?.extract || '').replace(/\s+/gu, ' ').trim().slice(0, 1000);
    if (!extract) return { ok: false, error: 'Aucun résumé disponible pour ce sujet.' };
    const title = String(result.title || page.title).slice(0, 180);
    return { ok: true, title, extract, source: 'Wikipedia', url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /gu, '_'))}` };
  } catch (error) {
    const message = error?.name === 'TimeoutError' ? 'La recherche a dépassé le délai autorisé.' : error?.message || 'La recherche web a échoué.';
    return { ok: false, error: String(message).slice(0, 180) };
  }
}

module.exports = { ENGINES, buildWebSearchUrl, openWebSearch, quickWebAnswer };
