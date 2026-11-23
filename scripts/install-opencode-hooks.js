#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MARK = 'Capri OpenCode integration';
const FILE_NAME = 'capri-opencode-plugin.js';

function configDir() {
  if (process.env.OPENCODE_CONFIG_DIR) return process.env.OPENCODE_CONFIG_DIR;
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, 'opencode');
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'opencode');
  return path.join(os.homedir(), '.config', 'opencode');
}

function pluginFile() {
  return path.join(configDir(), 'plugins', FILE_NAME);
}

function status() {
  const file = pluginFile();
  try {
    if (!fs.existsSync(file)) return { file, installed: false, events: [] };
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes(MARK) || !text.includes('opencode:')) return { file, installed: false, events: [] };
    return { file, installed: true, events: ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PermissionRequest', 'Stop', 'StopFailure', 'SessionEnd'] };
  } catch (err) {
    return { file, installed: false, events: [], error: err.message };
  }
}

function sourceFile() {
  return path.join(__dirname, '..', 'hooks', FILE_NAME);
}

function install() {
  const file = pluginFile();
  const source = fs.readFileSync(sourceFile(), 'utf8');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let upgraded = false;
  if (fs.existsSync(file)) {
    const before = fs.readFileSync(file, 'utf8');
    if (before === source) return { file, installed: true, upgraded: false };
    if (!before.includes(MARK)) throw new Error(`Refusing to replace a pre-existing OpenCode plugin in ${file}; Capri did not change it.`);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(file, `${file}.capri-backup-${stamp}`);
    upgraded = true;
  }
  fs.writeFileSync(file, source);
  return { file, installed: true, upgraded };
}

function uninstall() {
  const file = pluginFile();
  if (!fs.existsSync(file)) return { file, removed: false };
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes(MARK)) return { file, removed: false };
  fs.unlinkSync(file);
  return { file, removed: true };
}

module.exports = { configDir, pluginFile, install, uninstall, status };

if (require.main === module) {
  const arg = process.argv[2];
  try {
    if (arg === '--uninstall') {
      const result = uninstall();
      console.log(result.removed ? `Capri OpenCode plugin removed from ${result.file}` : `No Capri OpenCode plugin found in ${result.file}`);
    } else if (arg === '--status') {
      const result = status();
      console.log(result.installed ? `Installed (${result.events.join(', ')}) in ${result.file}` : `Not installed (${result.file})`);
    } else {
      const result = install();
      console.log(`Capri OpenCode plugin ${result.upgraded ? 'updated' : 'installed'} in ${result.file}`);
      console.log('Restart OpenCode or reload its plugins for the integration to take effect.');
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
