'use strict';

// Reading a web page for translation: fetch it, keep the readable blocks
// (headings, paragraphs, list items…) and translate them in order. Nothing from
// the page is executed, and only public HTTP(S) addresses are fetched.

const net = require('node:net');
const { translateBatch } = require('./translator');

const MAX_PAGE_BYTES = 3 * 1024 * 1024;
const MAX_BLOCKS = 500;
const MAX_PAGE_CHARS = 60000;
const MIN_BLOCK_CHARS = 2;

const BLOCK_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre',
  'dd', 'dt', 'td', 'th', 'figcaption', 'summary', 'address', 'caption',
  'div', 'section', 'article', 'main', 'header', 'footer',
]);

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', copy: '©', reg: '®', trade: '™', deg: '°',
  euro: '€', middot: '·', bull: '•', times: '×', frac12: '½',
};

function decodeEntities(value) {
  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const point = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point < 0x110000 ? String.fromCodePoint(point) : match;
    }
    const named = ENTITIES[code.toLowerCase()];
    return named === undefined ? match : named;
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textLength(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().length;
}

function pageError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (net.isIPv4(host) || net.isIPv6(host)) {
    if (net.isIPv6(host)) {
      return host === '::1' || host === '::' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd');
    }
    const [a, b] = host.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127);
  }
  return !host.includes('.');
}

function stripPageNoise(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<!doctype[^>]*>/gi, ' ')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, ' ')
    .replace(/<(script|style|noscript|template|svg|canvas|iframe|object|embed|form|nav|aside|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(script|style|iframe|object|embed|form|nav|aside|footer)\b[^>]*\/?>/gi, ' ');
}

function pickRegion(html) {
  const candidates = [
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<div\b[^>]*\brole\s*=\s*["']main["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of candidates) {
    const match = pattern.exec(html);
    if (match && textLength(match[1]) > 200) return match[1];
  }
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  return body ? body[1] : html;
}

// Linear HTML walk that keeps the reading order and the semantic block a text
// belongs to. Inline tags are transparent: their text joins the surrounding block.
function collectBlocks(html) {
  const blocks = [];
  const stack = [];
  const loose = { tag: 'p', text: '' };
  let cursor = 0;
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;

  const push = (tag, text, preformatted) => {
    const normalised = preformatted ? text.trim() : text.replace(/\s+/g, ' ').trim();
    if (normalised.length < MIN_BLOCK_CHARS) return;
    const previous = blocks[blocks.length - 1];
    if (previous && previous.text === normalised) return;
    blocks.push({ tag, text: normalised });
  };
  const flush = (block) => {
    if (block) push(block.tag, block.text, block.tag === 'pre');
  };

  const addText = (raw) => {
    if (!raw) return;
    const target = stack[stack.length - 1];
    const preformatted = target?.tag === 'pre';
    const decoded = decodeEntities(raw);
    const value = preformatted ? decoded.replace(/\r\n?/g, '\n') : decoded.replace(/\s+/g, ' ');
    if (!target) loose.text += value;
    else target.text += value;
  };

  let match;
  while ((match = tagPattern.exec(html))) {
    addText(html.slice(cursor, match.index));
    cursor = tagPattern.lastIndex;
    const closing = match[0][1] === '/';
    const tag = match[1].toLowerCase();
    if (!closing && (tag === 'br' || tag === 'hr')) {
      addText(stack[stack.length - 1]?.tag === 'pre' ? '\n' : ' ');
      continue;
    }
    if (!BLOCK_TAGS.has(tag)) continue;
    if (closing) {
      let depth = -1;
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) { depth = i; break; }
      }
      if (depth === -1) continue;
      while (stack.length > depth) flush(stack.pop());
    } else if (!/\/\s*$/.test(match[0])) {
      stack.push({ tag, text: '' });
    }
  }
  addText(html.slice(cursor));
  while (stack.length) flush(stack.pop());
  flush(loose);
  return blocks;
}

function extractTitle(html, blocks) {
  const raw = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]
    || /<meta\b[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i.exec(html)?.[1]
    || '';
  const title = decodeEntities(raw).replace(/\s+/g, ' ').trim();
  if (title) return title.slice(0, 200);
  const heading = blocks.find((block) => /^h[1-2]$/.test(block.tag));
  return (heading?.text || blocks[0]?.text || '').slice(0, 200);
}

function extractPage(html, pageUrl) {
  const clean = stripPageNoise(html).replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, ' ');
  const region = pickRegion(clean);
  let blocks = collectBlocks(region);
  if (textLength(region) < 120) blocks = collectBlocks(clean);

  const kept = [];
  let chars = 0;
  for (const block of blocks) {
    if (kept.length >= MAX_BLOCKS) break;
    if (chars + block.text.length > MAX_PAGE_CHARS) break;
    kept.push({ tag: block.tag, text: block.text.slice(0, 4000) });
    chars += block.text.length;
  }

  let site = '';
  try { site = new URL(pageUrl).hostname.replace(/^www\./i, ''); } catch { site = ''; }
  const title = extractTitle(html, kept);
  return { title: title || site || 'Page', site, blocks: kept, chars };
}

function decodeBody(buffer, contentType) {
  const charset = /charset\s*=\s*["']?([\w-]+)/i.exec(String(contentType || ''))?.[1];
  try { return new TextDecoder(charset || 'utf-8').decode(buffer); } catch { return buffer.toString('utf8'); }
}

async function readLimitedBody(response, maxBytes, contentType = '') {
  const reader = response.body && typeof response.body.getReader === 'function' ? response.body.getReader() : null;
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    return decodeBody(buffer.subarray(0, maxBytes), contentType);
  }
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    const remaining = maxBytes - total;
    if (chunk.length >= remaining) {
      chunks.push(chunk.subarray(0, remaining));
      total = maxBytes;
      try { await reader.cancel(); } catch { /* the body is already capped */ }
      break;
    }
    chunks.push(chunk);
    total += chunk.length;
  }
  return decodeBody(Buffer.concat(chunks), contentType);
}

async function fetchPage(rawUrl, { fetchImpl = fetch, timeoutMs = 15000, maxBytes = MAX_PAGE_BYTES } = {}) {
  let url;
  try {
    url = new URL(String(rawUrl || '').trim());
  } catch {
    throw pageError('invalid-url', 'This page address is not valid.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw pageError('invalid-url', 'Only HTTP(S) pages can be translated.');
  if (url.username || url.password) throw pageError('invalid-url', 'This page address is not valid.');
  if (isPrivateHost(url.hostname)) throw pageError('private-host', 'Local and private addresses are not opened.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
    'user-agent': 'Capri/2.6 (desktop translation)',
  };
  let response;
  let current = url.href;
  try {
    // Redirects are followed by hand so a public address cannot bounce the
    // request into localhost or a private network.
    for (let hop = 0; hop <= 5; hop += 1) {
      response = await fetchImpl(current, { redirect: 'manual', signal: controller.signal, headers });
      const location = response.headers?.get?.('location');
      if (![301, 302, 303, 307, 308].includes(response.status) || !location) break;
      if (hop === 5) throw pageError('http', 'Too many redirects.');
      let next;
      try { next = new URL(location, current); } catch { throw pageError('invalid-url', 'This redirect address is not valid.'); }
      if (!['http:', 'https:'].includes(next.protocol) || next.username || next.password || isPrivateHost(next.hostname)) {
        throw pageError('private-host', 'This page redirects to a local or private address.');
      }
      current = next.href;
    }
  } catch (error) {
    if (error.code) throw error;
    throw pageError(controller.signal.aborted ? 'timeout' : 'unreachable', String(error?.message || error));
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw pageError('http', `Could not read page (HTTP ${response.status}).`);
  const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
  if (contentType && !/text\/html|application\/xhtml|text\/plain|application\/xml|text\/xml/.test(contentType)) {
    throw pageError('not-html', 'This address is not a readable web page.');
  }
  const html = await readLimitedBody(response, maxBytes, contentType);
  if (!html.trim()) throw pageError('empty-page', 'This page returned no text.');
  return { html, url: response.url || current, contentType };
}

function escapeAttribute(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function pageHtml({ title, url, site, blocks, lang }) {
  const body = [];
  let list = null;
  for (const block of blocks) {
    if (block.tag === 'li') {
      if (!list) { list = []; body.push(list); }
      list.push(`<li>${escapeHtml(block.text)}</li>`);
      continue;
    }
    list = null;
    const tag = /^h[1-6]$/.test(block.tag) ? block.tag : block.tag === 'blockquote' ? 'blockquote' : block.tag === 'pre' ? 'pre' : 'p';
    body.push(`<${tag}>${escapeHtml(block.text)}</${tag}>`);
  }
  const content = body.map((entry) => Array.isArray(entry) ? `<ul>${entry.join('')}</ul>` : entry).join('\n');
  return `<!doctype html>
<html lang="${escapeAttribute(lang || 'fr')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body { margin: 0 auto; max-width: 46rem; padding: 2.5rem 1.25rem 4rem; background: #100b18; color: #f7f0fa; font: 16px/1.7 -apple-system, "Segoe UI", system-ui, sans-serif; }
a { color: #45e6f5; }
h1, h2, h3 { line-height: 1.25; color: #fff; }
h1 { font-size: 1.8rem; } h2 { font-size: 1.35rem; margin-top: 2rem; }
p, li, blockquote { overflow-wrap: anywhere; }
blockquote { margin: 1.4rem 0; padding-left: 1rem; border-left: 3px solid #ff2152; color: #d8cddd; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #171020; padding: 1rem; }
.meta { color: #9a8da4; font-size: .8rem; letter-spacing: .06em; }
</style>
</head>
<body>
<header>
<p class="meta">${escapeHtml(site || '')} — <a href="${escapeAttribute(url)}">${escapeHtml(url)}</a></p>
<h1>${escapeHtml(title)}</h1>
</header>
<article>
${content}
</article>
</body>
</html>`;
}

function safeFileName(value, fallback = 'traduction') {
  const name = String(value || '')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return name || fallback;
}

async function translatePage(rawUrl, options, onProgress = () => {}, deps = {}) {
  const translate = deps.translateBatch || translateBatch;
  const target = String(options?.target || 'fr');
  onProgress({ phase: 'reading' });
  const fetched = await fetchPage(rawUrl, deps);
  onProgress({ phase: 'scanning' });
  const page = extractPage(fetched.html, fetched.url);
  if (!page.blocks.length) {
    throw pageError('empty-page', 'This page contains no text Capri can read.');
  }

  const withoutEmpty = page.blocks.map((block) => block.text);
  const translated = await translate(withoutEmpty, { ...options, target }, (progress) => {
    onProgress({ phase: 'translating', ...progress });
  });
  const blocks = page.blocks.map((block, index) => ({
    tag: block.tag,
    text: translated[index] || block.text,
  }));
  const outputHtml = pageHtml({ title: page.title, url: fetched.url, site: page.site, blocks, lang: target });
  return {
    ok: true,
    kind: 'page',
    url: fetched.url,
    title: page.title,
    site: page.site,
    blocks,
    outputHtml,
    outputText: blocks.map((block) => block.text).join('\n\n'),
    suggestedName: `${safeFileName(page.title || page.site)}.${target}.html`,
    format: 'html',
    stats: { segments: blocks.length, chars: page.chars },
  };
}

module.exports = {
  MAX_PAGE_BYTES,
  decodeEntities,
  escapeHtml,
  extractPage,
  fetchPage,
  isPrivateHost,
  pageHtml,
  safeFileName,
  translatePage,
};
