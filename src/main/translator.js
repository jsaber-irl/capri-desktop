'use strict';

const fs = require('node:fs/promises');

const FREE_PROVIDER = 'mymemory';
const PROVIDERS = new Set(['mymemory', 'deepl', 'google', 'libretranslate', 'custom']);
const MAX_TEXT = 100000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;

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

async function jsonResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error?.message || `Translation API returned HTTP ${response.status}`);
  return body;
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
    return result;
  }

  if (selected === 'deepl') {
    if (!apiKey) throw new Error('An API key is required for DeepL.');
    const body = await jsonResponse(await fetchWithTimeout(`${apiUrl || 'https://api-free.deepl.com'}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ text: [q], ...(source !== 'auto' ? { source_lang: source.toUpperCase() } : {}), target_lang: target.toUpperCase() }),
    }));
    return body.translations?.[0]?.text || '';
  }
  if (selected === 'google') {
    if (!apiKey) throw new Error('An API key is required for Google Cloud Translation.');
    const body = await jsonResponse(await fetchWithTimeout(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q, target, ...(source !== 'auto' ? { source } : {}) }),
    }));
    return body.data?.translations?.[0]?.translatedText || '';
  }

  if (selected === 'custom' && !apiUrl) throw new Error('A custom translation API URL is required.');
  const endpoint = `${apiUrl || 'https://libretranslate.com'}`.replace(/\/+$/, '') + '/translate';
  const body = await jsonResponse(await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q, source: from, target, format: 'text', api_key: apiKey }),
  }));
  return body.translatedText || '';
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

module.exports = { FREE_PROVIDER, PROVIDERS, translateText, translateSource, readSource, htmlText };
