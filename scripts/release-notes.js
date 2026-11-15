#!/usr/bin/env node
'use strict';

// Generates the text for a GitHub release (in English) from the packages just built:
// supported platform installers, their SHA-256 checksums, and release information
// from .github/RELEASE_NEWS.md.
//
// Usage:
//   node scripts/release-notes.js <folder containing the release installers> > release-notes.md
//
// REPO (owner/name), or GITHUB_REPOSITORY as set by GitHub Actions,
// is used to generate the official repository links.

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
        .filter((f) =>
            /^Capri-Setup-.+-(x64|ia32)\.exe$/.test(f) ||
            /^Capri-.+\.(dmg|zip|AppImage|deb)$/.test(f)
        )
        .sort();

    const files = artifacts
        .filter((f) => /^Capri-Setup-.+-(x64|ia32)\.exe$/.test(f))
        .sort((a, b) =>
            (/x64/.test(a) ? -1 : 1) - (/x64/.test(b) ? -1 : 1)
        );

    if (!artifacts.length) {
        throw new Error(`No Capri release artifacts found in ${dir}`);
    }

    const repository = repo
        ? `https://github.com/${repo}`
        : null;

    const infoLink = repository
        ? `[INFO.md](${repository}/blob/main/INFO.md)`
        : 'INFO.md';

    const out = [
        `# Capri ${version}`,
        '',
        `Project Capricorn version ${version} by Kang Tao`,
        `Everything you should know about rights and original code is available in the file: ${infoLink}`,
        '',
        'Capri is a living desktop companion that watches Claude Code, Codex, and Antigravity, chats through any AI model, gets angry, laughs, sees your screen, listens, and remembers you.',
        '',
        'Windows, macOS, and Linux packages are built separately. Installation methods and available system features depend on the platform.',
        '',
        '> The installers are not code-signed (a paid signing certificate is required), so Windows SmartScreen may display "Windows protected your PC". Click **More info › Run anyway** to continue.',
        '',
    ];

    // Release highlights
    if (news && news.trim()) {
        out.push(
            '# NEW :',
            '',
            news.trim(),
            ''
        );
    }

    // SHA-256 checksums
    out.push(
        '### SHA-256 checksums',
        '',
        '```',
        ...artifacts.map((f) =>
            `${sha256(path.join(dir, f))}  ${f}`
        ),
        '```',
        ''
    );

    return out.join('\n');
}

if (require.main === module) {
    const dir = process.argv[2];

    if (!dir) {
        console.error(
            'Usage: node scripts/release-notes.js <folder with the installers>'
        );
        process.exit(2);
    }

    const { version } = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
    );

    const newsFile = path.join(ROOT, '.github', 'RELEASE_NEWS.md');

    const news = fs.existsSync(newsFile)
        ? fs.readFileSync(newsFile, 'utf8')
        : '';

    process.stdout.write(
        notes(dir, {
            version,
            repo: process.env.REPO || process.env.GITHUB_REPOSITORY || '',
            news,
        })
    );
}

module.exports = { notes }