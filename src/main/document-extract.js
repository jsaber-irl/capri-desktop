'use strict';

// Text extraction for document formats that are not plain text. PDFs are read
// with pdf.js, modern Office/OpenDocument/EPUB archives with their XML parts,
// and legacy binary formats through an installed local converter. Nothing is
// uploaded: extraction happens on this computer before translation.

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const AdmZip = require('adm-zip');
const { devLog } = require('./logger');

const PDF_EXTENSIONS = new Set(['.pdf']);
const ZIP_EXTENSIONS = new Set([
  '.docx', '.docm', '.dotx', '.odt', '.ods', '.odp', '.epub',
  '.pptx', '.pptm', '.xlsx', '.xlsm',
]);
const WORD_EXTENSIONS = new Set(['.docx', '.docm', '.dotx']);
const SHEET_EXTENSIONS = new Set(['.xlsx', '.xlsm']);
const SLIDE_EXTENSIONS = new Set(['.pptx', '.pptm']);
const ODF_EXTENSIONS = new Set(['.odt', '.ods', '.odp']);
const LEGACY_EXTENSIONS = new Set(['.doc', '.ppt', '.xls']);
const BINARY_EXTENSIONS = new Set([...PDF_EXTENSIONS, ...ZIP_EXTENSIONS, ...LEGACY_EXTENSIONS]);

function documentError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function tidy(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanPath(value) {
  return String(value ?? '')
    .replace(/\0/g, '')
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/[.,;:!?]+$/g, '')
    .trim();
}

function expandHome(value, home) {
  if (value === '~') return home;
  if (/^~[\\/]/.test(value)) return path.join(home, value.slice(2));
  return value;
}

/**
 * Resolves a path typed in the chat or a relative path in the picker. A
 * location ("bureau", "documents"…) is tried first, then the current folder,
 * the user's usual folders and the home directory.
 */
async function resolveDocumentPath(value, {
  cwd = process.cwd(),
  home = os.homedir(),
  desktop = path.join(home, 'Desktop'),
  documents = path.join(home, 'Documents'),
  downloads = path.join(home, 'Downloads'),
  location = '',
  exists = (candidate) => {
    try { return fsSync.statSync(candidate).isFile(); } catch { return false; }
  },
} = {}) {
  const cleaned = cleanPath(value);
  if (!cleaned) return '';
  const expanded = expandHome(cleaned, home);
  if (path.isAbsolute(expanded)) {
    devLog('[translation:document] chemin absolu', expanded);
    return path.normalize(expanded);
  }

  const named = {
    desktop: desktop, bureau: desktop,
    documents: documents, document: documents,
    downloads: downloads, téléchargements: downloads, telechargements: downloads,
    home: home, maison: home,
  }[String(location || '').toLowerCase()] || '';
  const candidates = [];
  const add = (candidate) => {
    const resolved = path.resolve(candidate);
    if (!candidates.includes(resolved)) candidates.push(resolved);
  };
  if (named) add(path.join(named, expanded));
  add(path.resolve(cwd, expanded));
  if (desktop) add(path.join(desktop, expanded));
  if (documents) add(path.join(documents, expanded));
  if (downloads) add(path.join(downloads, expanded));
  if (home) add(path.join(home, expanded));

  for (const candidate of candidates) {
    if (exists(candidate)) {
      devLog('[translation:document] chemin relatif résolu', { input: cleaned, location: location || '-', resolved: candidate });
      return candidate;
    }
  }
  const fallback = path.resolve(cwd, expanded);
  devLog('[translation:document] chemin relatif introuvable', { input: cleaned, location: location || '-', tried: candidates, fallback });
  return fallback;
}

function zipEntryText(zip, name) {
  const entry = zip.getEntry(name);
  return entry ? entry.getData().toString('utf8') : '';
}

function stripOfficeXml(xml, { paragraph = /<\/w:p>/g, breaks = true } = {}) {
  let value = String(xml || '')
    .replace(/<w:instrText\b[^>]*>[\s\S]*?<\/w:instrText>/gi, '')
    .replace(/<w:delText\b[^>]*>[\s\S]*?<\/w:delText>/gi, '')
    .replace(/<w:tab\b[^>]*\/>/gi, '\t')
    .replace(/<w:br\b[^>]*\/>/gi, '\n')
    .replace(/<w:cr\b[^>]*\/>/gi, '\n')
    .replace(paragraph, '\n');
  if (breaks) value = value.replace(/<\/a:p>/gi, '\n').replace(/<a:br\b[^>]*\/>/gi, '\n');
  return tidy(decodeXml(value.replace(/<[^>]+>/g, ' ')));
}

function docxText(zip) {
  const xml = zipEntryText(zip, 'word/document.xml');
  if (!xml) throw documentError('unsupported-format', 'Ce fichier Word ne contient pas de texte lisible.');
  return stripOfficeXml(xml);
}

function pptxText(zip) {
  const slides = zip.getEntries()
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName))
    .sort((a, b) => Number(/(\d+)\.xml$/i.exec(a.entryName)?.[1]) - Number(/(\d+)\.xml$/i.exec(b.entryName)?.[1]));
  const pages = slides.map((entry, index) => {
    const text = stripOfficeXml(entry.getData().toString('utf8'));
    return text ? `— Diapositive ${index + 1} —\n${text}` : '';
  }).filter(Boolean);
  return tidy(pages.join('\n\n'));
}

function xlsxText(zip) {
  const sharedXml = zipEntryText(zip, 'xl/sharedStrings.xml');
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)].map((match) => tidy(decodeXml(
    [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map((part) => part[1]).join('')
      .replace(/<[^>]+>/g, ' '),
  )));
  const sheets = zip.getEntries()
    .filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.entryName))
    .sort((a, b) => Number(/(\d+)\.xml$/i.exec(a.entryName)?.[1]) - Number(/(\d+)\.xml$/i.exec(b.entryName)?.[1]));
  const output = [];
  for (const [sheetIndex, entry] of sheets.entries()) {
    const xml = entry.getData().toString('utf8');
    const rows = [];
    for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)) {
      const cells = [];
      for (const cell of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
        const attrs = cell[1] || '';
        const body = cell[2] || '';
        const type = /\bt="([^"]+)"/i.exec(attrs)?.[1] || '';
        const inline = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map((part) => part[1]).join('');
        const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/i.exec(body)?.[1] || '';
        if (type === 's') {
          const index = Number(raw);
          cells.push(shared[index] || '');
        } else if (type === 'inlineStr') {
          cells.push(tidy(decodeXml(inline)));
        } else {
          cells.push(tidy(decodeXml(raw)));
        }
      }
      if (cells.some(Boolean)) rows.push(cells.join('\t'));
    }
    if (rows.length) output.push(`— Feuille ${sheetIndex + 1} —\n${rows.join('\n')}`);
  }
  return tidy(output.join('\n\n'));
}

function odtText(zip) {
  const xml = zipEntryText(zip, 'content.xml');
  if (!xml) throw documentError('unsupported-format', 'Ce fichier OpenDocument ne contient pas de texte lisible.');
  const cleaned = xml
    .replace(/<text:tab\b[^>]*\/>/gi, '\t')
    .replace(/<text:line-break\b[^>]*\/>/gi, '\n')
    .replace(/<\/(?:text:p|text:h|table:table-cell|table:table-row)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return tidy(decodeXml(cleaned));
}

function epubText(zip) {
  const container = zipEntryText(zip, 'META-INF/container.xml');
  const rootPath = /<rootfile\b[^>]*full-path="([^"]+)"/i.exec(container)?.[1]
    || zip.getEntries().find((entry) => /\.opf$/i.test(entry.entryName))?.entryName
    || '';
  if (!rootPath) throw documentError('unsupported-format', 'Ce livre EPUB ne contient pas de contenu lisible.');
  const root = zipEntryText(zip, rootPath);
  const baseDir = path.posix.dirname(rootPath);
  const title = tidy(decodeXml(/<dc:title\b[^>]*>([\s\S]*?)<\/dc:title>/i.exec(root)?.[1] || ''));
  const manifest = new Map();
  for (const item of root.matchAll(/<item\b[^>]*>/gi)) {
    const tag = item[0];
    const id = /\bid="([^"]+)"/i.exec(tag)?.[1];
    const href = /\bhref="([^"]+)"/i.exec(tag)?.[1];
    if (id && href) manifest.set(id, href);
  }
  const spine = [...root.matchAll(/<itemref\b[^>]*idref="([^"]+)"/gi)].map((match) => match[1]);
  const order = spine.length ? spine : [...manifest.keys()];
  const chapters = [];
  for (const id of order) {
    const href = manifest.get(id);
    if (!href) continue;
    let name = '';
    try {
      name = path.posix.normalize(path.posix.join(baseDir, decodeURIComponent(href.split('#')[0])));
    } catch {
      name = path.posix.normalize(path.posix.join(baseDir, href.split('#')[0]));
    }
    const html = zipEntryText(zip, name);
    if (!html) continue;
    const text = tidy(decodeXml(html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\b[^>]*>/gi, '\n')
      .replace(/<\/(?:p|div|h[1-6]|li|blockquote|section|article|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')));
    if (text) chapters.push(text);
  }
  return { text: tidy(chapters.join('\n\n')), title: title || '' };
}

async function execFileText(file, args, { timeout = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    cp.execFile(file, args, { timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = String(stderr || '');
        reject(error);
      } else resolve(String(stdout || ''));
    });
  });
}

async function convertWithTextutil(file) {
  if (process.platform !== 'darwin') return null;
  try {
    const output = await execFileText('/usr/bin/textutil', ['-convert', 'txt', '-stdout', file]);
    devLog('[translation:document] textutil', { file, chars: output.length });
    return output;
  } catch (error) {
    devLog('[translation:document] textutil échec', { file, error: error.message, stderr: String(error.stderr || '').slice(0, 400) });
    return null;
  }
}

async function convertWithLibreOffice(file) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'capri-document-'));
  try {
    const binary = process.platform === 'darwin'
      ? '/Applications/LibreOffice.app/Contents/MacOS/soffice'
      : 'soffice';
    await execFileText(binary, ['--headless', '--convert-to', 'txt:Text', '--outdir', temp, file], { timeout: 180000 });
    const output = path.join(temp, `${path.basename(file, path.extname(file))}.txt`);
    const text = await fs.readFile(output, 'utf8').catch(() => '');
    devLog('[translation:document] LibreOffice', { file, chars: text.length });
    return text || null;
  } catch (error) {
    devLog('[translation:document] LibreOffice indisponible', { file, error: error.message });
    return null;
  } finally {
    fs.rm(temp, { recursive: true, force: true }).catch(() => {});
  }
}

async function legacyText(file, ext) {
  const textutil = await convertWithTextutil(file);
  if (textutil != null) return textutil;
  const libre = await convertWithLibreOffice(file);
  if (libre != null) return libre;
  throw documentError(
    'converter-missing',
    `Le format ${ext.slice(1).toUpperCase()} demande un convertisseur local. Installe LibreOffice, ou enregistre le fichier en DOCX, PPTX, XLSX, ODT ou PDF.`,
  );
}

async function pdfText(file, readFile) {
  let pdfjs;
  try {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch (error) {
    // A packaged asar can refuse dynamic ESM import on some Electron builds;
    // the CommonJS require path reads the same build.
    try {
      pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs');
    } catch (fallbackError) {
      devLog('[translation:document] pdf.js indisponible', { error: error.message, fallback: fallbackError.message });
      throw documentError('unsupported-format', 'Le lecteur PDF local est indisponible.');
    }
  }
  const data = new Uint8Array(await readFile(file));
  const task = pdfjs.getDocument({
    data,
    verbosity: 0,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const document = await task.promise;
  const pages = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let output = '';
      let previousY = null;
      for (const item of content.items) {
        if (!item || typeof item.str !== 'string') continue;
        const y = Array.isArray(item.transform) ? item.transform[5] : null;
        if (previousY !== null && y !== null && Math.abs(y - previousY) > 2) {
          output += '\n';
        } else if (output && !/[\s\n]$/.test(output) && item.str) {
          output += ' ';
        }
        output += item.str;
        if (y !== null) previousY = y;
      }
      if (output.trim()) pages.push(tidy(output));
    }
    return pages.join('\n\n');
  } finally {
    await document.destroy().catch(() => {});
  }
}

function isBinaryDocument(ext) {
  return BINARY_EXTENSIONS.has(String(ext || '').toLowerCase());
}

/**
 * Returns { text, title?, converter } for a document. Text formats are handled
 * by translation-document.js; this module only covers the binary containers.
 */
async function extractDocumentText(file, ext, { readFile = fs.readFile } = {}) {
  const extension = String(ext || path.extname(file)).toLowerCase();
  if (!isBinaryDocument(extension)) return { text: '', converter: 'none' };

  devLog('[translation:document] extraction', { file, ext: extension });
  if (PDF_EXTENSIONS.has(extension)) {
    const text = await pdfText(file, readFile);
    return { text: tidy(text), converter: 'pdfjs' };
  }
  if (ZIP_EXTENSIONS.has(extension)) {
    const buffer = await readFile(file);
    let zip;
    try {
      zip = new AdmZip(buffer);
    } catch (error) {
      throw documentError('unsupported-format', 'Ce document est endommagé ou son format n’est pas reconnu.');
    }
    if (WORD_EXTENSIONS.has(extension)) return { text: docxText(zip), converter: 'docx' };
    if (SLIDE_EXTENSIONS.has(extension)) return { text: pptxText(zip), converter: 'pptx' };
    if (SHEET_EXTENSIONS.has(extension)) return { text: xlsxText(zip), converter: 'xlsx' };
    if (ODF_EXTENSIONS.has(extension)) return { text: odtText(zip), converter: 'odt' };
    if (extension === '.epub') {
      const result = epubText(zip);
      return { ...result, converter: 'epub' };
    }
  }
  if (LEGACY_EXTENSIONS.has(extension)) {
    const text = await legacyText(file, extension);
    return { text: tidy(text), converter: 'local' };
  }
  throw documentError('unsupported-format', 'Ce format de document n’est pas pris en charge.');
}

module.exports = {
  BINARY_EXTENSIONS,
  LEGACY_EXTENSIONS,
  ODF_EXTENSIONS,
  PDF_EXTENSIONS,
  SHEET_EXTENSIONS,
  SLIDE_EXTENSIONS,
  WORD_EXTENSIONS,
  ZIP_EXTENSIONS,
  decodeXml,
  extractDocumentText,
  isBinaryDocument,
  resolveDocumentPath,
  tidy,
};
