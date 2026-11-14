#!/usr/bin/env node
'use strict';

// Generates the text for a GitHub release (in English) from the packages just built:
// which file is for which platform, their SHA-256 checksums, and what's new
// (.github/RELEASE_NEWS.md, updated for each release).
//   node scripts/release-notes.js <folder with the Capri-Setup-*.exe files> > release-notes.md
// REPO (owner/name, as GitHub Actions sets GITHUB_REPOSITORY) is used for the README link.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');

const WHICH = {
  x64: 'For 64-bit Windows (most users). To check: Settings › System › About › "System type".',
  ia32: 'For 32-bit Windows. Built with Electron 43, as newer Electron versions no longer support 32-bit Windows.',
};

function sha256(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function notes(dir, { version, repo, news }) {
  const artifacts = fs.readdirSync(dir)
    .filter((f) => /^Capri-Setup-.+-(x64|ia32)\.exe$/.test(f) || /^Capri-.+\.(dmg|zip|AppImage|deb)$/.test(f))
    .sort();
  const files = artifacts
    .filter((f) => /^Capri-Setup-.+-(x64|ia32)\.exe$/.test(f))
    .sort((a, b) => (/x64/.test(a) ? -1 : 1) - (/x64/.test(b) ? -1 : 1)); // 64-bit first
  if (!artifacts.length) throw new Error(`No Capri release artifacts found in ${dir}`);
  const arch = (f) => /-(x64|ia32)\.exe$/.exec(f)[1];
  const readme = repo ? `https://github.com/${repo}/blob/main/README.md` : 'README.md';
  const out = [
    `## Capri ${version}`,
    '',
    'Capri is a living desktop companion that watches Claude Code, Codex, and Antigravity, chats through any AI model, gets angry, laughs, sees your screen, listens, and remembers you.',
    '',
    'Windows, macOS, and Linux packages are built separately. Installation methods and available system features depend on the platform.',
    '',
    '> The installers are not code-signed (a paid signing certificate is required), so Windows SmartScreen may display "Windows protected your PC". Click **More info › Run anyway** to continue.',
    '',
  ];
  if (news && news.trim()) out.push('### What\'s new', '', news.trim(), '');
  out.push(
    '### SHA-256 checksums',
    '',
    '```',
    ...artifacts.map((f) => `${sha256(path.join(dir, f))}  ${f}`),
    '```',
    '',
  );
  return out.join('\n');
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node scripts/release-notes.js <folder with the installers>');
    process.exit(2);
  }
  const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const newsFile = path.join(ROOT, '.github', 'RELEASE_NEWS.md');
  const news = fs.existsSync(newsFile) ? fs.readFileSync(newsFile, 'utf8') : '';
  process.stdout.write(notes(dir, { version, repo: process.env.REPO || process.env.GITHUB_REPOSITORY || '', news }));
}

module.exports = { notes };