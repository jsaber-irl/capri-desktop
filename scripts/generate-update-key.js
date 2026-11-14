#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const output = path.resolve(process.argv[2] || path.join(os.homedir(), '.capri-update-keys'));
const insideRepository = path.relative(root, output);
if (!insideRepository.startsWith('..') && !path.isAbsolute(insideRepository)) throw new Error('Choose a private-key output directory outside the Capri repository.');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const privatePath = path.join(output, 'capri-update-private.pem');
const publicPath = path.join(output, 'capri-update-public.pem');
fs.writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { flag: 'wx', mode: 0o600 });
fs.writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }), { flag: 'wx', mode: 0o644 });
const fingerprint = crypto.createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
process.stdout.write(`Created an Ed25519 key pair. Public-key SHA-256: ${fingerprint}\nPrivate key: ${privatePath}\nPublic key: ${publicPath}\nCopy only the private key into the repository's CAPRI_UPDATE_PRIVATE_KEY Actions secret. Install the public key as src/main/update-public-key.pem and commit it.\n`);
