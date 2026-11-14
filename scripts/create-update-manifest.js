#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const requiredAssets = (version) => [
  ['darwin', 'arm64', `Capri-${version}-arm64-mac.zip`, 'zip'],
  ['darwin', 'x64', `Capri-${version}-x64-mac.zip`, 'zip'],
  ['win32', 'x64', `Capri-Setup-${version}-x64.exe`, 'exe'],
];

async function sha512(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    fs.createReadStream(file).on('data', (chunk) => hash.update(chunk)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
  });
}

async function makeManifest({ dir, version, repository = 'jsaber-irl/capri-desktop', publishedAt = new Date().toISOString(), releaseNotes = '' }) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Package version must be a semantic version.');
  const platforms = {};
  for (const [platform, arch, file, format] of requiredAssets(version)) {
    const location = path.join(dir, file);
    if (!fs.existsSync(location) || !fs.statSync(location).isFile() || fs.statSync(location).size < 1 || fs.statSync(location).size > 2 * 1024 * 1024 * 1024) throw new Error(`Required update asset is missing or outside its allowed size: ${file}`);
    platforms[platform] ||= {};
    platforms[platform][arch] = { file, format, size: fs.statSync(location).size, sha512: await sha512(location), url: `https://github.com/${repository}/releases/download/v${version}/${encodeURIComponent(file)}` };
  }
  return { schemaVersion: 1, version, releaseTag: `v${version}`, publishedAt, releaseNotes: String(releaseNotes).trim().slice(0, 12000), platforms };
}

function signedFiles({ manifest, privateKeyPem, publicKeyPem }) {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('Update signing key must be Ed25519.');
  if (publicKeyPem) {
    const derived = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
    const expected = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
    if (!derived.equals(expected)) throw new Error('CAPRI_UPDATE_PRIVATE_KEY does not match the public key embedded in Capri.');
  }
  const raw = `${JSON.stringify(manifest, null, 2)}\n`;
  const signature = crypto.sign(null, Buffer.from(raw), privateKey).toString('base64');
  return { raw, signature: `${signature}\n` };
}

async function main() {
  const dir = path.resolve(process.argv[2] || 'installers');
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY !== 'jsaber-irl/capri-desktop') throw new Error('Signed auto-update releases can only be published from jsaber-irl/capri-desktop.');
  if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${version}`) throw new Error(`Release tag must be v${version}.`);
  if (!process.env.CAPRI_UPDATE_PRIVATE_KEY) throw new Error('CAPRI_UPDATE_PRIVATE_KEY GitHub Actions secret is required to publish signed updates.');
  const notesFile = path.join(ROOT, '.github/RELEASE_NEWS.md');
  const releaseNotes = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8') : '';
  const manifest = await makeManifest({ dir, version, repository: 'jsaber-irl/capri-desktop', releaseNotes });
  const publicKey = fs.readFileSync(path.join(ROOT, 'src/main/update-public-key.pem'), 'utf8');
  const files = signedFiles({ manifest, privateKeyPem: process.env.CAPRI_UPDATE_PRIVATE_KEY, publicKeyPem: publicKey });
  fs.writeFileSync(path.join(dir, 'update-manifest.json'), files.raw, { flag: 'wx', mode: 0o644 });
  fs.writeFileSync(path.join(dir, 'update-manifest.sig'), files.signature, { flag: 'wx', mode: 0o644 });
  process.stdout.write(`Created signed update manifest for Capri ${version}.\n`);
}

if (require.main === module) {
  main().catch((error) => { process.stderr.write(`[updates] ${error.message}\n`); process.exitCode = 1; });
}

module.exports = { requiredAssets, sha512, makeManifest, signedFiles };
