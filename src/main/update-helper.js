'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const { verifyManifest, targetFor, sha512 } = require('./update-manager');

const execFileAsync = promisify(execFile);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function recordFailure(app, fsx = fs) {
  try {
    const root = path.join(app.getPath('userData'), 'updates');
    fsx.mkdirSync(root, { recursive: true, mode: 0o700 });
    fsx.writeFileSync(path.join(root, 'install-failed.json'), JSON.stringify({ error: 'The verified update could not be installed. Check available disk space and folder permissions, then retry.' }), { mode: 0o600 });
  } catch { /* best effort; do not add sensitive paths to logs */ }
}

async function waitForExit(pid, timeoutMs = 60000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') return; }
    await sleep(250);
  }
  throw new Error('Capri did not close in time; update was not installed.');
}

async function validateArchive(zipFile) {
  const { stdout } = await execFileAsync('/usr/bin/unzip', ['-Z1', zipFile], { maxBuffer: 4 * 1024 * 1024, timeout: 30000 });
  const names = stdout.split(/\r?\n/).filter(Boolean);
  if (!names.length || names.length > 50000) throw new Error('macOS update archive has an invalid file count.');
  for (const name of names) {
    if (name.startsWith('/') || name.includes('\\') || name.split('/').includes('..') || name.split('/').includes('.')) throw new Error('macOS update archive contains an unsafe path.');
    if (!name.startsWith('Capri.app/') && name !== 'Capri.app' && !name.startsWith('__MACOSX/')) throw new Error('macOS update archive has an unexpected top-level item.');
  }
  if (!names.some((name) => name === 'Capri.app/Contents/Info.plist') || !names.some((name) => name === 'Capri.app/Contents/MacOS/Capri')) throw new Error('macOS update archive does not contain the expected Capri application bundle.');
}

async function runUpdateHelper({ app, args = process.argv, fsx = fs, spawnFn = spawn, publicKey }) {
  const markerArg = args.indexOf('--capri-update-helper');
  if (markerArg < 0 || !args[markerArg + 1]) return false;
  const userData = app.getPath('userData');
  const updatesDir = path.join(userData, 'updates');
  const handoffFile = path.resolve(args[markerArg + 1]);
  if (handoffFile !== path.join(updatesDir, 'pending-install.json')) throw new Error('Update handoff path is invalid.');
  if (fsx.lstatSync(updatesDir).isSymbolicLink() || fsx.lstatSync(handoffFile).isSymbolicLink() || fsx.statSync(handoffFile).size > 2 * 1024 * 1024) throw new Error('Update handoff file is unsafe.');
  const handoff = JSON.parse(fsx.readFileSync(handoffFile, 'utf8'));
  const target = targetFor(process.platform, process.arch);
  if (!target || handoff.platform !== process.platform || handoff.arch !== process.arch || !Number.isSafeInteger(handoff.parentPid) || handoff.parentPid < 2 || handoff.parentPid === process.pid || handoff.version !== JSON.parse(Buffer.from(handoff.manifest, 'base64').toString('utf8')).version) throw new Error('Update handoff is incompatible with this system.');
  const raw = Buffer.from(handoff.manifest, 'base64');
  const verified = verifyManifest(raw, handoff.signature, handoff.release, handoff.platform, handoff.arch, publicKey || fsx.readFileSync(path.join(__dirname, 'update-public-key.pem'), 'utf8'));
  if (verified.manifest.version !== handoff.version || verified.manifest.releaseTag !== handoff.releaseTag || path.basename(handoff.file) !== verified.asset.file) throw new Error('Update handoff does not match its signed manifest.');
  const realUpdates = fsx.realpathSync(updatesDir);
  const realFile = fsx.realpathSync(handoff.file);
  const relativeFile = path.relative(realUpdates, realFile);
  if (!relativeFile || relativeFile.startsWith('..') || path.isAbsolute(relativeFile) || fsx.statSync(realFile).size !== verified.asset.size || (await sha512(realFile)).toLowerCase() !== verified.asset.sha512.toLowerCase()) throw new Error('Update package failed its final integrity check.');
  await waitForExit(Number(handoff.parentPid));

  if (process.platform === 'win32') {
    if (!realFile.toLowerCase().endsWith('.exe')) throw new Error('Windows update is not an installer executable.');
    const installer = spawnFn(realFile, [], { detached: true, stdio: 'ignore', windowsHide: false });
    installer.unref();
    app.exit(0);
    return true;
  }

  if (process.platform === 'darwin') {
    await validateArchive(realFile);
    const currentApp = path.resolve(process.resourcesPath, '..', '..');
    if (!currentApp.endsWith('.app')) throw new Error('Capri is not installed in a replaceable application bundle.');
    if (typeof fsx.statfsSync === 'function') {
      const disk = fsx.statfsSync(path.dirname(currentApp));
      const free = disk.bavail * disk.bsize;
      if (free < verified.asset.size * 3) throw new Error('Not enough free disk space to stage the macOS update safely.');
    }
    const token = `${verified.manifest.version}-${process.pid}`;
    const stage = path.join(path.dirname(currentApp), `.capri-update-stage-${token}`);
    const backup = `${currentApp}.update-backup-${token}`;
    const successMarker = path.join(updatesDir, `install-started-ok-${verified.manifest.version}`);
    fsx.rmSync(stage, { recursive: true, force: true }); fsx.rmSync(successMarker, { force: true });
    fsx.mkdirSync(stage, { recursive: true, mode: 0o700 });
    const helper = path.join(process.resourcesPath, 'mac-update-helper.sh');
    const child = spawnFn('/bin/sh', [helper, String(process.pid), realFile, currentApp, stage, backup, successMarker, verified.manifest.version], { detached: true, stdio: 'ignore' });
    child.unref();
    app.exit(0);
    return true;
  }
  throw new Error('Update installation is not supported on this platform.');
}

module.exports = { waitForExit, validateArchive, recordFailure, runUpdateHelper };
