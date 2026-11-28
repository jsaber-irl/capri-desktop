'use strict';

// Local document translation. The source file is never modified: Capri reads it,
// translates its text blocks, and builds a self-contained preview (local images
// inlined as data URLs) that the translation window displays in a sandboxed frame.

const fs = require('node:fs/promises');
const path = require('node:path');
const { translateBatch } = require('./translator');
const { decodeEntities, escapeHtml, safeFileName } = require('./translation-page');
const { extractDocumentText, isBinaryDocument, resolveDocumentPath } = require('./document-extract');
const { devLog } = require('./logger');

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_DOCUMENT_SEGMENTS = 400;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MARKER_OPEN = '\uE000';
const MARKER_CLOSE = '\uE001';

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'xmp', 'pre', 'code', 'kbd', 'samp']);
const BLOCK_TAGS = new Set([
  'html', 'head', 'body', 'title', 'meta', 'link', 'base',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre',
  'dd', 'dt', 'td', 'th', 'figcaption', 'summary', 'address', 'caption',
  'div', 'section', 'article', 'main', 'header', 'footer', 'aside', 'nav',
  'ul', 'ol', 'dl', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'form', 'fieldset',
  'button', 'label', 'figure', 'details', 'summary',
]);

function documentError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function marker(id) {
  return `${MARKER_OPEN}${id}${MARKER_CLOSE}`;
}

function tokenizeHtml(html) {
  const tokens = [];
  const pattern = /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][a-zA-Z0-9:-]*)\s*>|<([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(html))) {
    if (match.index > cursor) tokens.push({ type: 'text', raw: html.slice(cursor, match.index) });
    cursor = pattern.lastIndex;
    if (match[0].startsWith('<!--') || match[0].startsWith('<!')) {
      tokens.push({ type: 'raw', html: match[0] });
      continue;
    }
    const closing = Boolean(match[1]);
    const tag = (match[1] || match[2] || '').toLowerCase();
    if (!closing && RAW_TEXT_TAGS.has(tag)) {
      const closePattern = new RegExp(`</${tag}\\s*>`, 'gi');
      closePattern.lastIndex = cursor;
      const close = closePattern.exec(html);
      const end = close ? closePattern.lastIndex : html.length;
      tokens.push({ type: 'raw', html: html.slice(match.index, end) });
      cursor = end;
      pattern.lastIndex = end;
      continue;
    }
    tokens.push({
      type: 'tag',
      raw: match[0],
      tag,
      closing,
      selfClosing: /\/\s*>$/.test(match[0]) || VOID_TAGS.has(tag),
    });
  }
  if (cursor < html.length) tokens.push({ type: 'text', raw: html.slice(cursor) });
  return tokens;
}

// Splits an HTML document into raw markup and translatable units. A unit is a run
// of text plus its inline tags, so a sentence with <strong> keeps its emphasis.
function htmlUnits(html) {
  const tokens = tokenizeHtml(html);
  const pieces = [];
  let unit = null;
  let nextId = 0;

  const closeUnit = () => {
    if (!unit) return;
    if (!unit.plain.trim()) {
      for (const part of unit.parts) {
        if (part.type === 'tag') pieces.push({ type: 'raw', html: part.html });
        else if (part.value.trim()) pieces.push({ type: 'raw', html: escapeHtml(part.value) });
      }
    } else {
      pieces.push(unit);
    }
    unit = null;
  };
  const ensureUnit = () => {
    if (!unit) unit = { type: 'unit', parts: [], source: '', plain: '' };
    return unit;
  };

  for (const token of tokens) {
    if (token.type === 'text') {
      const value = decodeEntities(token.raw).replace(/\s+/g, ' ');
      const target = ensureUnit();
      target.parts.push({ type: 'text', value });
      target.source += value;
      target.plain += value;
      continue;
    }
    if (token.type === 'raw') {
      closeUnit();
      pieces.push({ type: 'raw', html: token.html });
      continue;
    }
    if (BLOCK_TAGS.has(token.tag) || token.tag === 'br' || token.tag === 'hr') {
      closeUnit();
      pieces.push({ type: 'raw', html: token.raw });
      continue;
    }
    const target = ensureUnit();
    const id = nextId;
    nextId += 1;
    target.parts.push({ type: 'tag', id, html: token.raw });
    target.source += marker(id);
  }
  closeUnit();
  return pieces;
}

function restoreUnit(unit, translated) {
  const text = String(translated ?? '');
  if (!text.trim()) return null;
  const expected = unit.parts.filter((part) => part.type === 'tag').map((part) => part.id);
  const seen = [];
  let invalid = false;
  let output = '';
  let cursor = 0;
  const pattern = new RegExp(`${MARKER_OPEN}(\\d+)${MARKER_CLOSE}`, 'g');
  let match;
  while ((match = pattern.exec(text))) {
    output += escapeHtml(text.slice(cursor, match.index));
    cursor = pattern.lastIndex;
    const id = Number(match[1]);
    seen.push(id);
    const part = unit.parts.find((entry) => entry.type === 'tag' && entry.id === id);
    if (!part) { invalid = true; break; }
    output += part.html;
  }
  output += escapeHtml(text.slice(cursor));
  if (/[\uE000\uE001]/.test(output) || seen.length !== expected.length) invalid = true;
  if (expected.some((id) => seen.filter((entry) => entry === id).length !== 1)) invalid = true;
  return invalid ? null : output;
}

function htmlUnitSources(pieces) {
  return pieces.filter((piece) => piece.type === 'unit').map((piece) => piece.source);
}

async function translateHtmlDocument(html, translate, options, onProgress = () => {}) {
  const pieces = htmlUnits(html);
  const units = pieces.filter((piece) => piece.type === 'unit');
  if (!units.length) throw documentError('empty-document', 'This document contains no text Capri can read.');
  if (units.length > MAX_DOCUMENT_SEGMENTS) throw documentError('too-long', 'This document has too many text blocks.');

  const translated = await translate(units.map((unit) => unit.source), options, onProgress);
  const restored = units.map((unit, index) => restoreUnit(unit, translated[index]));

  const failed = [];
  restored.forEach((value, index) => { if (value === null) failed.push(index); });
  if (failed.length) {
    // A provider that altered the inline-tag markers still gets its text used,
    // but that block loses its inline formatting rather than showing garbage.
    const fallback = await translate(failed.map((index) => units[index].plain.trim()), options);
    failed.forEach((unitIndex, position) => {
      restored[unitIndex] = escapeHtml(String(fallback[position] || '').trim());
    });
  }

  let unitIndex = 0;
  const output = pieces.map((piece) => {
    if (piece.type === 'raw') return piece.html;
    const value = restored[unitIndex] ?? '';
    unitIndex += 1;
    return value;
  }).join('');
  return { html: output, units: units.length };
}

// --- Markdown ---------------------------------------------------------------

function markdownPlaceholders(text) {
  const protectedParts = [];
  const stash = (value) => {
    protectedParts.push(value);
    return marker(protectedParts.length - 1);
  };
  let source = String(text)
    .replace(/`[^`]*`/g, stash)
    .replace(/\]\(\s*([^)\s]+)/g, (match, url) => `](${stash(url)}`);
  return {
    source,
    restore(value) {
      const output = String(value ?? '');
      let invalid = false;
      const seen = [];
      const restoredText = output.replace(new RegExp(`${MARKER_OPEN}(\\d+)${MARKER_CLOSE}`, 'g'), (match, id) => {
        const index = Number(id);
        const part = protectedParts[index];
        if (part === undefined) { invalid = true; return ''; }
        seen.push(index);
        return part;
      });
      if (/[\uE000\uE001]/.test(restoredText)) invalid = true;
      if (seen.length !== protectedParts.length || new Set(seen).size !== protectedParts.length) invalid = true;
      return invalid ? null : restoredText;
    },
  };
}

async function translateMarkdown(markdown, translate, options, onProgress = () => {}) {
  const lines = String(markdown || '').split(/\r?\n/);
  const items = [];
  let inFence = false;
  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return; }
    if (inFence || !line.trim()) return;
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) return;
    if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('|')) return;
    const match = /^(\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)?)([\s\S]*)$/.exec(line);
    const prefix = match?.[1] || '';
    const text = match?.[2] || line;
    if (!text.trim()) return;
    const protectedText = markdownPlaceholders(text);
    items.push({ index, prefix, plain: text, ...protectedText });
  });
  if (!items.length) throw documentError('empty-document', 'This document contains no text Capri can read.');
  if (items.length > MAX_DOCUMENT_SEGMENTS) throw documentError('too-long', 'This document has too many text blocks.');

  const translated = await translate(items.map((item) => item.source), options, onProgress);
  const output = [...lines];
  items.forEach((item, position) => {
    const restoredText = item.restore(translated[position]);
    output[item.index] = `${item.prefix}${restoredText ?? item.plain}`;
  });
  return output.join('\n');
}

function markdownInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const html = [];
  let list = null;
  let code = null;
  const flushList = () => {
    if (list) { html.push(`</${list}>`); list = null; }
  };
  for (const line of lines) {
    const fence = /^\s*(```|~~~)/.exec(line);
    if (fence) {
      if (code) { html.push(`<pre><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`); code = null; }
      else { flushList(); code = { lines: [] }; }
      continue;
    }
    if (code) { code.lines.push(line); continue; }
    if (!line.trim()) { flushList(); continue; }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${markdownInline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { flushList(); html.push('<hr>'); continue; }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const wanted = bullet ? 'ul' : 'ol';
      if (list !== wanted) { flushList(); html.push(`<${wanted}>`); list = wanted; }
      html.push(`<li>${markdownInline((bullet || numbered)[1])}</li>`);
      continue;
    }
    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) { flushList(); html.push(`<blockquote>${markdownInline(quote[1])}</blockquote>`); continue; }
    flushList();
    html.push(`<p>${markdownInline(line)}</p>`);
  }
  flushList();
  if (code) html.push(`<pre><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
  return html.join('\n');
}

// --- Plain text / RTF -------------------------------------------------------

function stripRtf(rtf) {
  return String(rtf || '')
    .replace(/\\'([0-9a-f]{2})/gi, (_match, hex) => Buffer.from(hex, 'hex').toString('latin1'))
    .replace(/\\u(-?\d+)\??/g, (_match, code) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCharCode(value < 0 ? value + 65536 : value) : '';
    })
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\line\b/g, '\n')
    .replace(/\\tab\b/g, '\t')
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function translatePlainText(text, translate, options, onProgress = () => {}) {
  const paragraphs = String(text || '').split(/\n{2,}/).map((entry) => entry.trim()).filter(Boolean);
  if (!paragraphs.length) throw documentError('empty-document', 'This document contains no text Capri can read.');
  if (paragraphs.length > MAX_DOCUMENT_SEGMENTS) throw documentError('too-long', 'This document has too many text blocks.');
  const translated = await translate(paragraphs, options, onProgress);
  return translated.map((entry, index) => entry || paragraphs[index]).join('\n\n');
}

// --- Preview ----------------------------------------------------------------

const MIME_TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.bmp': 'image/bmp', '.avif': 'image/avif',
};

const PREVIEW_STYLE = `<style>
html { background: #fff; }
body { margin: 0 auto; max-width: 52rem; padding: 24px 26px 48px; color: #191320; background: #fff; font: 15px/1.6 -apple-system, "Segoe UI", system-ui, sans-serif; }
img { max-width: 100%; height: auto; }
table { max-width: 100%; border-collapse: collapse; }
td, th { padding: .35em .55em; border: 1px solid #d7d0dc; vertical-align: top; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; }
a { color: #b0123a; }
h1, h2, h3 { line-height: 1.25; }
blockquote { margin-left: 0; padding-left: 1rem; border-left: 3px solid #d7d0dc; color: #4b4252; }
</style>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline' https:; font-src data: https:;">`;

function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src|action)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '')
    .replace(/<form\b/gi, '<div')
    .replace(/<\/form>/gi, '</div>');
}

async function inlineImages(html, baseDir, readFile) {
  const tags = html.match(/<img\b[^>]*>/gi) || [];
  let output = html;
  for (const tag of tags) {
    const src = /\ssrc\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2]
      || /\ssrc\s*=\s*([^\s>]+)/i.exec(tag)?.[1];
    if (!src || /^(?:data:|https?:|blob:)/i.test(src)) {
      if (!src || !/^https:/i.test(src)) {
        output = output.replace(tag, () => tag.replace(/\ssrcset\s*=\s*(["']).*?\1/gi, ''));
      }
      continue;
    }
    let file = '';
    try { file = decodeURIComponent(src.split('#')[0].split('?')[0]); } catch { continue; }
    if (!file || file.startsWith('/') || /^[a-z]+:/i.test(file)) continue;
    const resolved = path.resolve(baseDir, file);
    if (!resolved.startsWith(`${path.resolve(baseDir)}${path.sep}`)) continue;
    const mime = MIME_TYPES[path.extname(resolved).toLowerCase()];
    if (!mime) continue;
    try {
      const stat = await readFile(resolved);
      const buffer = Buffer.isBuffer(stat) ? stat : Buffer.from(stat);
      if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) continue;
      const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
      const rewritten = tag
        .replace(/\ssrcset\s*=\s*(["']).*?\1/gi, '')
        .replace(/\ssrc\s*=\s*(["']).*?\1/i, ` src="${dataUrl}"`)
        .replace(/\ssrc\s*=\s*([^\s>]+)/i, ` src="${dataUrl}"`);
      output = output.replace(tag, () => rewritten);
    } catch { /* a missing image keeps its alt text */ }
  }
  return output;
}

async function buildPreviewHtml(html, { baseDir = '', readFile = fs.readFile } = {}) {
  let clean = sanitizeHtml(html);
  if (baseDir) clean = await inlineImages(clean, baseDir, readFile);
  if (/<head\b[^>]*>/i.test(clean)) {
    clean = clean.replace(/<head\b[^>]*>/i, (match) => `${match}\n${PREVIEW_STYLE}`);
  } else {
    clean = `${PREVIEW_STYLE}\n${clean}`;
  }
  return clean;
}

function textPreviewHtml(text, title) {
  return `<!doctype html><html><head><meta charset="utf-8">${PREVIEW_STYLE}<title>${escapeHtml(title || '')}</title></head>
<body><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 'JetBrains Mono',monospace;color:#191320">${escapeHtml(text)}</pre></body></html>`;
}

// --- Entry point ------------------------------------------------------------

const DOCUMENT_KINDS = new Set([
  '.html', '.htm', '.xhtml', '.md', '.markdown', '.txt', '.csv', '.tsv', '.json', '.xml',
  '.yaml', '.yml', '.toml', '.css', '.js', '.mjs', '.ts', '.log', '.srt', '.vtt', '.tex', '.rtf',
  '.pdf', '.doc', '.docx', '.docm', '.dotx', '.odt', '.ods', '.odp', '.epub',
  '.ppt', '.pptx', '.pptm', '.xls', '.xlsx', '.xlsm',
]);

function titleFromHtml(html) {
  const raw = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]
    || /<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i.exec(html)?.[1]
    || '';
  return decodeEntities(raw.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 200);
}

async function translateDocument(file, options, onProgress = () => {}, deps = {}) {
  const translate = deps.translateBatch || translateBatch;
  const readFile = deps.readFile || fs.readFile;
  const target = String(options?.target || 'fr');
  const requested = String(file || '');
  if (!requested || requested.includes('\0')) throw documentError('invalid-file', 'This file cannot be read.');
  const source = await resolveDocumentPath(requested);
  const ext = path.extname(source).toLowerCase();
  if (!DOCUMENT_KINDS.has(ext)) throw documentError('unsupported-format', 'This file type is not supported.');
  devLog('[translation:document] ouverture', { file: source, ext, binary: isBinaryDocument(ext) });

  onProgress({ phase: 'reading' });
  const stat = await fs.stat(source).catch(() => null);
  if (!stat || !stat.isFile()) throw documentError('missing-file', 'This file could not be found.');
  if (stat.size > MAX_DOCUMENT_BYTES) throw documentError('too-large', 'This file is larger than 25 MiB.');

  const binary = isBinaryDocument(ext);
  let content = '';
  let extractedTitle = '';
  let converter = '';
  if (binary) {
    onProgress({ phase: 'scanning' });
    const extracted = await extractDocumentText(source, ext, { readFile });
    content = String(extracted?.text || '');
    extractedTitle = String(extracted?.title || '');
    converter = String(extracted?.converter || '');
    devLog('[translation:document] texte extrait', { converter, chars: content.length, title: extractedTitle });
    if (!content.trim()) throw documentError('empty-document', 'No readable text was found in this document.');
  } else {
    const buffer = await readFile(source);
    if (Buffer.isBuffer(buffer) && buffer.includes(0)) throw documentError('unsupported-format', 'This file is not a text document.');
    content = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);
  }
  onProgress({ phase: 'scanning' });

  const base = path.basename(source);
  const stem = path.basename(source, ext);
  const baseDir = path.dirname(source);
  let outputText = '';
  let outputHtml = '';
  let previewHtml = '';
  let title = extractedTitle || stem;
  let format = 'txt';
  let suggestedExt = binary ? 'txt' : (ext.replace(/^\./, '') || 'txt');
  let segments = 0;
  let note = '';
  let simple = false;

  if (['.html', '.htm', '.xhtml'].includes(ext)) {
    const result = await translateHtmlDocument(content, translate, options, (progress) => {
      onProgress({ phase: 'translating', ...progress });
    });
    segments = result.units;
    title = titleFromHtml(result.html) || stem;
    previewHtml = await buildPreviewHtml(result.html, { baseDir, readFile });
    outputHtml = previewHtml;
    outputText = decodeEntities(sanitizeHtml(result.html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    format = 'html';
    suggestedExt = 'html';
  } else if (['.md', '.markdown'].includes(ext)) {
    outputText = await translateMarkdown(content, translate, options, (progress) => {
      onProgress({ phase: 'translating', ...progress });
    });
    const firstHeading = /^\s*#\s+(.+)$/m.exec(outputText)?.[1] || stem;
    title = firstHeading.replace(/[*_`]/g, '').trim().slice(0, 200) || stem;
    outputHtml = `<!doctype html><html><head><meta charset="utf-8">${PREVIEW_STYLE}<title>${escapeHtml(title)}</title></head><body>${markdownToHtml(outputText)}</body></html>`;
    previewHtml = outputHtml;
    format = 'md';
    suggestedExt = 'md';
  } else {
    const plain = ext === '.rtf' ? stripRtf(content) : content;
    if (ext === '.rtf') { simple = true; note = 'rtf'; }
    if (binary) { simple = true; note = 'extract'; }
    outputText = await translatePlainText(plain, translate, options, (progress) => {
      onProgress({ phase: 'translating', ...progress });
    });
    title = extractedTitle || stem;
    previewHtml = textPreviewHtml(outputText, title);
    outputHtml = previewHtml;
    format = 'txt';
    suggestedExt = binary || ext === '.rtf' ? 'txt' : (ext.replace(/^\./, '') || 'txt');
    devLog('[translation:document] terminé', { file: source, converter, chars: outputText.length });
  }

  return {
    ok: true,
    kind: 'document',
    filename: base,
    title,
    previewHtml,
    outputHtml,
    outputText,
    format,
    suggestedName: `${safeFileName(stem)}.${target}.${suggestedExt}`,
    note,
    simple,
    stats: { segments, bytes: stat.size },
  };
}

module.exports = {
  DOCUMENT_KINDS,
  MAX_DOCUMENT_BYTES,
  buildPreviewHtml,
  markdownToHtml,
  sanitizeHtml,
  stripRtf,
  titleFromHtml,
  translateDocument,
  translateHtmlDocument,
  translateMarkdown,
  htmlUnits,
  restoreUnit,
};
