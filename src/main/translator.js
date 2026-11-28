'use strict';

const fs = require('node:fs/promises');

const FREE_PROVIDER = 'mymemory';
const PROVIDERS = new Set(['mymemory', 'deepl', 'google', 'libretranslate', 'custom']);
const MAX_TEXT = 100000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;
const MAX_SEGMENTS = 600;
const BATCH_CHARS = 20000;
const MYMEMORY_CHARS = 420;

function translationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
}

function htmlText(html) {
  return cleanText(String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'"));
}

function providerOf(value) {
  return PROVIDERS.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : FREE_PROVIDER;
}

// Google Cloud Translation returns HTML-escaped text; Capri escapes it itself
// when it builds HTML, so the entities are decoded once here.
function decodeProviderEntities(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (match, code) => {
      const point = Number(code);
      return point > 0 && point < 0x110000 ? String.fromCodePoint(point) : match;
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, code) => {
      const point = parseInt(code, 16);
      return Number.isFinite(point) && point > 0 && point < 0x110000 ? String.fromCodePoint(point) : match;
    })
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function jsonResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (response.status === 429) throw translationError('quota', 'The translation service is rate limiting requests.');
  if (!response.ok) throw new Error(body.message || body.error?.message || `Translation API returned HTTP ${response.status}`);
  return body;
}

function providerTarget(provider, target) {
  const code = String(target || '').toUpperCase();
  if (provider === 'deepl') return { EN: 'EN-US', PT: 'PT-PT', ZH: 'ZH' }[code] || code;
  return target;
}

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: options.signal || controller.signal })
    .finally(() => clearTimeout(timer));
}

async function translateText(text, { provider = FREE_PROVIDER, apiKey = '', apiUrl = '', source = 'auto', target = 'fr' } = {}) {
  const q = cleanText(text);
  if (!q) throw new Error('No text to translate.');
  if (!/^[a-z]{2,3}(-[A-Z]{2})?$/i.test(target)) throw new Error('Invalid target language.');
  const selected = providerOf(provider);
  const from = source === 'auto' ? 'auto' : source;

  if (selected === 'mymemory') {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(source === 'auto' ? 'autodetect' : source)}|${encodeURIComponent(target)}`;
    const body = await jsonResponse(await fetchWithTimeout(url));
    const result = body.responseData?.translatedText;
    if (!result) throw new Error('The free translation API returned no translation.');
    if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(result)) {
      throw translationError('quota', 'The free translation service has reached its limit.');
    }
    return result;
  }

  if (selected === 'deepl') {
    if (!apiKey) throw translationError('missing-key', 'An API key is required for DeepL.');
    const body = await jsonResponse(await fetchWithTimeout(`${apiUrl || 'https://api-free.deepl.com'}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ text: [q], ...(source !== 'auto' ? { source_lang: source.toUpperCase() } : {}), target_lang: providerTarget('deepl', target) }),
    }));
    return body.translations?.[0]?.text || '';
  }
  if (selected === 'google') {
    if (!apiKey) throw translationError('missing-key', 'An API key is required for Google Cloud Translation.');
    const body = await jsonResponse(await fetchWithTimeout(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q, target, ...(source !== 'auto' ? { source } : {}) }),
    }));
    return decodeProviderEntities(body.data?.translations?.[0]?.translatedText || '');
  }

  if (selected === 'custom' && !apiUrl) throw translationError('missing-url', 'A custom translation API URL is required.');
  const endpoint = `${apiUrl || 'https://libretranslate.com'}`.replace(/\/+$/, '') + '/translate';
  const body = await jsonResponse(await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q, source: from, target, format: 'text', api_key: apiKey }),
  }));
  return body.translatedText || '';
}

// --- Batch translation -----------------------------------------------------
// A page or a document is made of many small text segments (paragraphs, headings,
// table cells…). Translating them together keeps their order and lets the window
// show real progress instead of a spinner.

function normaliseSegments(texts) {
  if (!Array.isArray(texts)) throw new Error('Invalid translation request.');
  if (texts.length > MAX_SEGMENTS) throw translationError('too-long', 'This document has too many text blocks.');
  return texts.map((value) => String(value ?? ''));
}

function splitForFreeApi(text, limit = MYMEMORY_CHARS) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= limit) return [clean];
  const pieces = [];
  let rest = clean;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf(' ', limit);
    if (cut < Math.floor(limit / 2)) cut = limit;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) pieces.push(rest);
  return pieces.filter(Boolean);
}

function chunkSegments(items, maxItems, maxChars) {
  const chunks = [];
  let current = [];
  let chars = 0;
  for (const item of items) {
    const size = item.text.length;
    if (current.length && (current.length >= maxItems || chars + size > maxChars)) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += size;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function requestSegmentBatch(provider, texts, options) {
  const { apiKey = '', apiUrl = '', source = 'auto', target } = options;
  if (provider === 'deepl') {
    if (!apiKey) throw translationError('missing-key', 'An API key is required for DeepL.');
    const body = await jsonResponse(await fetchWithTimeout(`${apiUrl || 'https://api-free.deepl.com'}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ text: texts, ...(source !== 'auto' ? { source_lang: source.toUpperCase() } : {}), target_lang: providerTarget('deepl', target) }),
    }));
    const results = body.translations?.map((entry) => entry?.text);
    if (!Array.isArray(results) || results.length !== texts.length) throw new Error('The translation service returned an incomplete translation.');
    return results;
  }
  if (provider === 'google') {
    if (!apiKey) throw translationError('missing-key', 'An API key is required for Google Cloud Translation.');
    const body = await jsonResponse(await fetchWithTimeout(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: texts, target, ...(source !== 'auto' ? { source } : {}) }),
    }));
    const results = body.data?.translations?.map((entry) => decodeProviderEntities(entry?.translatedText));
    if (!Array.isArray(results) || results.length !== texts.length) throw new Error('The translation service returned an incomplete translation.');
    return results;
  }
  if (provider === 'custom' && !apiUrl) throw translationError('missing-url', 'A custom translation API URL is required.');
  const endpoint = `${apiUrl || 'https://libretranslate.com'}`.replace(/\/+$/, '') + '/translate';
  const body = await jsonResponse(await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q: texts, source: source === 'auto' ? 'auto' : source, target, format: 'text', api_key: apiKey }),
  }));
  const value = body.translatedText;
  if (Array.isArray(value) && value.length === texts.length) return value;
  if (typeof value === 'string' && texts.length === 1) return [value];
  throw new Error('The translation service returned an incomplete translation.');
}

async function translateBatch(texts, options = {}, onProgress = () => {}) {
  const list = normaliseSegments(texts);
  const target = String(options.target || '');
  if (!/^[a-z]{2,3}(-[A-Za-z]{2})?$/.test(target)) throw new Error('Invalid target language.');
  const provider = providerOf(options.provider);
  const indices = [];
  list.forEach((text, index) => { if (text.trim()) indices.push(index); });
  if (!indices.length) throw new Error('No text to translate.');

  const total = indices.length;
  const results = new Array(list.length).fill('');
  let done = 0;
  let lastReport = 0;
  const report = (force = false) => {
    const now = Date.now();
    if (!force && now - lastReport < 120) return;
    lastReport = now;
    onProgress({ done, total });
  };

  try {
    if (provider === 'mymemory') {
      for (const index of indices) {
        const pieces = splitForFreeApi(list[index]);
        const translated = [];
        for (const piece of pieces) {
          translated.push(await translateText(piece, { ...options, target }));
        }
        results[index] = translated.join(' ').trim();
        done += 1;
        report();
        if (done < total) await new Promise((resolve) => setTimeout(resolve, 120));
      }
    } else {
      const maxItems = provider === 'deepl' ? 45 : 30;
      for (const chunk of chunkSegments(indices.map((index) => ({ index, text: list[index] })), maxItems, BATCH_CHARS)) {
        let values;
        try {
          values = await requestSegmentBatch(provider, chunk.map((item) => item.text), { ...options, target });
        } catch (error) {
          // Older LibreTranslate-compatible servers only accept one `q` per request.
          if (provider !== 'custom' && provider !== 'libretranslate') throw error;
          values = [];
          for (const item of chunk) values.push(await translateText(item.text, { ...options, target }));
        }
        chunk.forEach((item, position) => {
          results[item.index] = String(values[position] ?? '').trim();
        });
        done += chunk.length;
        report();
      }
    }
  } catch (error) {
    if (!error.code) error.code = 'provider-error';
    throw error;
  }

  const missing = results.some((value, index) => list[index].trim() && !value);
  if (missing) throw translationError('incomplete', 'The translation service returned an incomplete translation.');
  report(true);
  return results;
}

async function readSource(source) {
  if (source.kind === 'text') return cleanText(source.value);
  if (source.kind === 'file') {
    const file = String(source.value || '');
    if (!file || file.includes('\0')) throw new Error('Invalid translation file.');
    const stat = await fs.stat(file);
    if (!stat.isFile()) throw new Error('The selected path is not a file.');
    if (stat.size > MAX_FILE_BYTES) throw new Error('The selected file is larger than 5 MiB.');
    const content = await fs.readFile(file, 'utf8');
    return /\.(html?|xhtml)$/i.test(source.value) ? htmlText(content) : cleanText(content);
  }
  if (source.kind === 'url') {
    const url = new URL(source.value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) pages can be translated.');
    const response = await fetchWithTimeout(url, { headers: { accept: 'text/html,text/plain;q=0.9' } });
    if (!response.ok) throw new Error(`Could not read page (HTTP ${response.status}).`);
    return htmlText(await response.text());
  }
  throw new Error('Unsupported translation source.');
}

async function translateSource(source, options) {
  return translateText(await readSource(source), options);
}

module.exports = {
  FREE_PROVIDER,
  PROVIDERS,
  translateError: translationError,
  translateText,
  translateBatch,
  translateSource,
  readSource,
  htmlText,
  splitForFreeApi,
};
