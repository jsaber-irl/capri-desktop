'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { extractPage, isPrivateHost, translatePage } = require('../src/main/translation-page');
const {
  buildPreviewHtml,
  markdownToHtml,
  stripRtf,
  translateDocument,
  translateHtmlDocument,
  translateMarkdown,
} = require('../src/main/translation-document');
const {
  MAC_BROWSERS, createActivePageReader, createBrowserTracker, frontmostApp, frontmostAppSync, macScript, parseMacResult,
} = require('../src/main/active-page');
const { extractDocumentText, resolveDocumentPath } = require('../src/main/document-extract');
const { translateBatch } = require('../src/main/translator');

test('a page yields its title and readable blocks without scripts, navigation or footer', () => {
  const html = `<!doctype html><html><head><title>Bonjour le monde</title><style>p{color:red}</style></head>
    <body><nav>Menu du site</nav><main><h1>Un titre</h1><p>Un <strong>paragraphe</strong> utile.</p>
    <ul><li>Premier point</li><li>Second point</li></ul><script>alert(1)</script></main>
    <footer>Pied de page</footer></body></html>`;
  const page = extractPage(html, 'https://www.example.com/article');
  assert.equal(page.title, 'Bonjour le monde');
  assert.equal(page.site, 'example.com');
  assert.deepEqual(page.blocks.map((block) => block.tag), ['h1', 'p', 'li', 'li']);
  assert.equal(page.blocks[1].text, 'Un paragraphe utile.');
  const all = page.blocks.map((block) => block.text).join(' ');
  assert.doesNotMatch(all, /Menu du site|Pied de page|alert/);
});

test('private and local addresses are never fetched', () => {
  for (const host of ['localhost', '127.0.0.1', '10.0.0.4', '192.168.1.10', '172.20.1.2', '169.254.1.1', 'printer.local', '[::1]']) {
    assert.equal(isPrivateHost(host), true, host);
  }
  assert.equal(isPrivateHost('example.com'), false);
  assert.equal(isPrivateHost('sub.example.co.uk'), false);
});

test('HTML document translation keeps inline tags, images and structure', async () => {
  const html = '<html><head><title>Hello</title></head><body><p>Hello <strong>world</strong>!</p><img src="images/a.png" alt="A"></body></html>';
  const translate = async (texts) => texts.map((text) => `X ${text}`);
  const result = await translateHtmlDocument(html, translate);
  assert.match(result.html, /<strong>world<\/strong>/);
  assert.match(result.html, /X Hello/);
  assert.match(result.html, /<img src="images\/a.png"/);
  assert.equal(result.units, 2);
});

test('HTML code and preformatted blocks are preserved without translation', async () => {
  const html = '<html><body><p>Bonjour</p><pre><code>const x = 1;</code></pre></body></html>';
  const translate = async (texts) => texts.map((text) => `X ${text}`);
  const result = await translateHtmlDocument(html, translate);
  assert.match(result.html, /<pre><code>const x = 1;<\/code><\/pre>/);
  assert.match(result.html, /X Bonjour/);
});

test('a provider that drops inline markers still gets clean text instead of broken HTML', async () => {
  const html = '<p>Bonjour <em>toi</em>.</p>';
  const translate = async () => ['Salut sans balises'];
  const result = await translateHtmlDocument(html, translate);
  assert.match(result.html, /Salut sans balises/);
  assert.doesNotMatch(result.html, /[\uE000\uE001]|<em>/);
});

test('Markdown translation keeps headings, code fences and link targets', async () => {
  const markdown = '# Titre\n\nUn **beau** [lien](https://example.com/page).\n\n```js\nconst x = 1;\n```\n';
  const translate = async (texts) => texts.map((text) => text.replace('Titre', 'Title').replace('beau', 'nice'));
  const output = await translateMarkdown(markdown, translate);
  assert.match(output, /^# Title/m);
  assert.match(output, /Un \*\*nice\*\* \[lien\]\(https:\/\/example\.com\/page\)\./);
  assert.match(output, /```js\nconst x = 1;\n```/);
});

test('Markdown preview escapes embedded HTML', () => {
  const preview = markdownToHtml('<script>alert(1)</script>');
  assert.doesNotMatch(preview, /<script>/);
  assert.match(preview, /&lt;script&gt;/);
});

test('RTF is reduced to its readable text', () => {
  assert.equal(stripRtf('{\\rtf1\\ansi Bonjour\\par Monde}'), 'Bonjour\nMonde');
});

test('document preview strips scripts and inlines local images', async () => {
  const preview = await buildPreviewHtml(
    '<html><head></head><body><img src="pic.png" alt=""><script>alert(1)</script></body></html>',
    { baseDir: '/tmp/capri-doc', readFile: async () => Buffer.from([137, 80, 78, 71]) },
  );
  assert.match(preview, /data:image\/png;base64/);
  assert.doesNotMatch(preview, /<script>alert/);
  assert.match(preview, /Content-Security-Policy/);
});

test('active-page AppleScript targets one authorised browser and parses URL and title', async () => {
  const chrome = MAC_BROWSERS.find((browser) => browser.key === 'chrome');
  const safari = MAC_BROWSERS.find((browser) => browser.key === 'safari');
  assert.match(macScript(chrome), /active tab of front window/);
  assert.match(macScript(safari), /current tab of front window/);
  assert.match(macScript(safari), /Safari/);
  assert.match(macScript(safari), /name of current tab of front window/);
  assert.doesNotMatch(macScript(safari), /title of current tab/);

  const reader = createActivePageReader({
    platform: 'darwin',
    execFile: (_file, _args, _options, callback) => callback(null, `https://example.com/help${String.fromCharCode(31)}Aide`, ''),
  });
  const result = await reader.read({ bundle: 'com.google.Chrome' });
  assert.equal(result.ok, true);
  assert.equal(result.url, 'https://example.com/help');
  assert.equal(result.title, 'Aide');
  assert.equal(result.targetId, 'chrome');
});

test('active-page finds the frontmost browser without System Events and reports permission with its target', async () => {
  const bundle = await frontmostApp({
    platform: 'darwin',
    execFile: (file, args, _options, callback) => {
      if (file === 'lsappinfo' && args[0] === 'front') return callback(null, 'ASN:0x0-0x1:\n', '');
      return callback(null, '    bundleID="com.apple.Safari"\n', '');
    },
  });
  assert.equal(bundle, 'com.apple.Safari');

  const denied = createActivePageReader({
    platform: 'darwin',
    execFile: (file, _args, _options, callback) => {
      if (file === 'pgrep') return callback(null, '123', '');
      return callback(Object.assign(new Error('Not authorized (-1743)'), { stderr: '' }), '', '');
    },
  });
  const result = await denied.read({ bundle: 'com.apple.Safari' });
  assert.equal(result.code, 'permission');
  assert.equal(result.targetId, 'safari');
  assert.equal(result.targetApp, 'Safari');

  const notBrowser = createActivePageReader({ platform: 'darwin', execFile: () => {} });
  assert.equal((await notBrowser.read({ bundle: 'com.apple.finder' })).code, 'no-browser');

  const syncBundle = frontmostAppSync({
    platform: 'darwin',
    execFileSync: (file, args) => (file === 'lsappinfo' && args[0] === 'front' ? 'ASN:0x0-0x1:\n' : 'bundleID="com.google.Chrome"'),
  });
  assert.equal(syncBundle, 'com.google.Chrome');
  const tracker = createBrowserTracker({
    platform: 'darwin',
    execFileSync: (file, args) => (file === 'lsappinfo' && args[0] === 'front' ? 'ASN:0x0-0x1:\n' : 'bundleID="com.apple.Safari"'),
  });
  assert.equal(tracker.capture(), 'com.apple.Safari');
  assert.equal(tracker.current(), 'com.apple.Safari');

  assert.equal(parseMacResult('unsupported').code, 'unsupported');
  assert.equal(parseMacResult('no-window').code, 'no-window');
  const local = parseMacResult(`file:///etc/passwd${String.fromCharCode(31)}Local`);
  assert.equal(local.ok, false);
  assert.equal(local.code, 'no-url');
});

test('Windows active-page helper reads its JSON response and never invents a URL', async () => {
  const calls = [];
  const reader = createActivePageReader({
    platform: 'win32',
    execFile: (file, args, _options, callback) => {
      calls.push({ file, args });
      callback(null, JSON.stringify({ status: 'ok', browser: 'chrome', url: 'https://example.com/', title: 'Example' }), '');
    },
  });
  const result = await reader.read();
  assert.equal(result.ok, true);
  assert.equal(result.url, 'https://example.com/');
  assert.ok(calls[0].args.some((arg) => arg.endsWith('active-page.ps1')));

  const missing = createActivePageReader({
    platform: 'win32',
    execFile: (_file, _args, _options, callback) => callback(null, JSON.stringify({ status: 'unavailable', permission: true }), ''),
  });
  assert.equal((await missing.read()).ok, false);
  assert.equal((await missing.read()).code, 'permission');
});

test('batch translation keeps segment order and reports progress', async () => {
  const original = global.fetch;
  const bodies = [];
  global.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return new Response(JSON.stringify({
      translations: JSON.parse(options.body).text.map((text) => ({ text: `T:${text}` })),
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const progress = [];
    const output = await translateBatch(['one', 'two', ''], {
      provider: 'deepl', apiKey: 'key', target: 'fr',
    }, (update) => progress.push(update));
    assert.deepEqual(output, ['T:one', 'T:two', '']);
    assert.deepEqual(bodies[0].text, ['one', 'two']);
    assert.equal(progress.at(-1).done, 2);
    assert.equal(progress.at(-1).total, 2);
  } finally {
    global.fetch = original;
  }
});

test('a local HTML document is translated into a self-contained preview without touching the source', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'capri-translation-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'notes.html');
  const source = '<html><head><title>Notes</title></head><body><h1>Bonjour</h1><p>Un <strong>texte</strong>.</p><img src="pic.png" alt="photo"></body></html>';
  await fs.writeFile(file, source, 'utf8');
  await fs.writeFile(path.join(directory, 'pic.png'), Buffer.from([137, 80, 78, 71]));
  const before = await fs.readFile(file, 'utf8');

  const result = await translateDocument(file, { target: 'fr' }, () => {}, {
    translateBatch: async (texts) => texts.map((text) => `Traduit ${text}`),
  });
  assert.equal(result.ok, true);
  assert.equal(result.format, 'html');
  assert.match(result.previewHtml, /Traduit Bonjour/);
  assert.match(result.previewHtml, /data:image\/png;base64/);
  assert.match(result.outputText, /Traduit/);
  assert.equal(await fs.readFile(file, 'utf8'), before);
});

test('page translation reports scan and translation progress and returns ordered blocks', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const html = '<html><head><title>Actualité</title></head><body><main><h1>Une nouvelle</h1><p>Le contenu de la page.</p></main></body></html>';
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  };
  const phases = [];
  const result = await translatePage('https://example.com/news', { target: 'fr' }, (update) => phases.push(update.phase), {
    fetchImpl,
    translateBatch: async (texts, _options, progress) => {
      progress?.({ done: texts.length, total: texts.length });
      return texts.map((text) => `FR ${text}`);
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.title, 'Actualité');
  assert.equal(result.blocks[0].text, 'FR Une nouvelle');
  assert.equal(result.blocks[1].text, 'FR Le contenu de la page.');
  assert.ok(phases.includes('reading'));
  assert.ok(phases.includes('scanning'));
  assert.ok(phases.includes('translating'));
  assert.match(result.outputHtml, /FR Une nouvelle/);
  assert.equal(calls[0], 'https://example.com/news');
});

test('a public page redirecting to a private address is refused before the second request', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return new Response('', { status: 302, headers: { location: 'http://127.0.0.1/secret' } });
  };
  await assert.rejects(
    () => translatePage('https://example.com/redirect', { target: 'fr' }, () => {}, { fetchImpl }),
    (error) => error.code === 'private-host',
  );
  assert.equal(calls.length, 1);
});

function makePdf(text) {
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>';
  const stream = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;
  objects[4] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 1; index <= 5; index += 1) {
    offsets[index] = Buffer.byteLength(pdf);
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (let index = 1; index <= 5; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  return `${pdf}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}

test('PDF and modern document containers yield readable text and translate through the normal preview', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'capri-documents-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const pdf = path.join(directory, 'test.pdf');
  await fs.writeFile(pdf, makePdf('Bonjour PDF'));

  const docx = path.join(directory, 'notes.docx');
  const archive = new AdmZip();
  archive.addFile('word/document.xml', Buffer.from('<w:document><w:body><w:p><w:r><w:t>Bonjour</w:t></w:r><w:r><w:t xml:space="preserve"> Word</w:t></w:r></w:p><w:p><w:r><w:t>Deuxième</w:t></w:r></w:p></w:body></w:document>'));
  archive.writeZip(docx);

  assert.deepEqual(await extractDocumentText(pdf, '.pdf'), { text: 'Bonjour PDF', converter: 'pdfjs' });
  assert.deepEqual(await extractDocumentText(docx, '.docx'), { text: 'Bonjour Word\nDeuxième', converter: 'docx' });

  const progress = [];
  const result = await translateDocument(docx, { target: 'fr' }, (update) => progress.push(update.phase), {
    translateBatch: async (texts, _options, report) => {
      report?.({ done: texts.length, total: texts.length });
      return texts.map((text) => `FR ${text}`);
    },
  });
  assert.equal(result.ok, true);
  assert.match(result.outputText, /FR Bonjour Word/);
  assert.equal(result.note, 'extract');
  assert.equal(result.suggestedName, 'notes.fr.txt');
  assert.deepEqual(progress.slice(0, 3), ['reading', 'scanning', 'scanning']);
  assert.ok(progress.includes('translating'));

  const desktop = path.join(directory, 'Desktop');
  await fs.mkdir(desktop);
  await fs.writeFile(path.join(desktop, 'test.pdf'), 'placeholder');
  assert.equal(
    await resolveDocumentPath('test.pdf', { cwd: directory, home: directory, desktop, documents: directory, downloads: directory, location: 'desktop' }),
    path.join(desktop, 'test.pdf'),
  );
});

test('the free service splits long text and keeps every translated piece', async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async (url) => {
    calls += 1;
    const query = new URL(url).searchParams.get('q');
    return new Response(JSON.stringify({ responseData: { translatedText: query.toUpperCase() } }), { status: 200 });
  };
  try {
    const text = `${'mot '.repeat(160)}fin`;
    const [output] = await translateBatch([text], { provider: 'mymemory', target: 'fr' });
    assert.ok(calls > 1);
    assert.match(output, /^MOT/);
    assert.match(output, /FIN$/);
  } finally {
    global.fetch = original;
  }
});
