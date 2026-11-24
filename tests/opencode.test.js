'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const installer = require('../scripts/install-opencode-hooks');

test('OpenCode event adapter maps lifecycle, tools, prompts, and permissions', () => {
  const plugin = require('../hooks/capri-opencode-plugin');

  assert.equal(plugin.adaptChat({ sessionID: 's1', prompt: 'Run tests', directory: '/project' }).hook_event_name, 'UserPromptSubmit');
  assert.equal(plugin.adaptChat({ sessionID: 's1', prompt: 'Run tests', directory: '/project' }).session_id, 'opencode:s1');

  const before = plugin.adaptTool({ sessionID: 's1', tool: 'bash', args: { command: 'npm test' }, before: true }, {});
  assert.equal(before.hook_event_name, 'PreToolUse');
  assert.equal(before.tool_input.command, 'npm test');

  const after = plugin.adaptTool({ sessionID: 's1', tool: 'read', args: { filePath: 'src/a.js' } }, {});
  assert.equal(after.hook_event_name, 'PostToolUse');
  assert.equal(after.tool_input.file_path, 'src/a.js');

  const failed = plugin.adaptTool({ sessionID: 's1', tool: 'bash' }, { failure: true, error: 'exit 1' });
  assert.equal(failed.hook_event_name, 'PostToolUseFailure');
  assert.equal(failed.error, 'exit 1');

  const permission = plugin.adaptPermission({ sessionID: 's1', permission: 'bash', message: 'Allow tests?' });
  assert.equal(permission.hook_event_name, 'Notification');
  assert.equal(permission.notification_type, 'permission_prompt');
  assert.equal(permission.message, 'Allow tests?');

  assert.equal(plugin.adaptPublicEvent({ type: 'session.idle', properties: { session: { id: 's1', directory: '/project' } } }).hook_event_name, 'Stop');
  assert.equal(plugin.adaptPublicEvent({ type: 'session.error', properties: { session: { id: 's1' }, error: 'failed' } }).hook_event_name, 'StopFailure');
  assert.equal(plugin.adaptPublicEvent({ type: 'session.deleted', properties: { session: { id: 's1' } } }).hook_event_name, 'SessionEnd');
  assert.equal(plugin.adaptPublicEvent({ type: 'message.updated', properties: {} }), null);
});

test('OpenCode installer is isolated, idempotent, backed up, and removable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-opencode-'));
  const oldConfig = process.env.OPENCODE_CONFIG_DIR;
  const oldXdg = process.env.XDG_CONFIG_HOME;
  process.env.OPENCODE_CONFIG_DIR = dir;
  delete process.env.XDG_CONFIG_HOME;

  try {
    const file = installer.pluginFile();
    assert.equal(installer.status().installed, false);

    const installed = installer.install();
    assert.equal(installed.installed, true);
    assert.equal(installer.status().installed, true);
    assert.ok(fs.readFileSync(file, 'utf8').includes('Capri OpenCode integration'));

    const count = fs.readdirSync(path.dirname(file)).length;
    assert.deepEqual(installer.install(), { file, installed: true, upgraded: false });
    assert.equal(fs.readdirSync(path.dirname(file)).length, count);

    fs.appendFileSync(file, '\n// local Capri plugin upgrade\n');
    const upgraded = installer.install();
    assert.equal(upgraded.upgraded, true);
    assert.equal(installer.status().installed, true);
    const backups = fs.readdirSync(path.dirname(file)).filter((name) => name.startsWith(path.basename(file) + '.capri-backup-'));
    assert.equal(backups.length, 1);

    const removed = installer.uninstall();
    assert.equal(removed.removed, true);
    assert.equal(installer.status().installed, false);

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'module.exports = "unrelated plugin";\n');
    assert.equal(installer.status().installed, false);
    assert.equal(installer.uninstall().removed, false);
    assert.ok(fs.existsSync(file));

    const { ASSISTANTS, assistant } = require('../src/main/assistants');
    assert.equal(ASSISTANTS.opencode.name, 'OpenCode');
    assert.equal(assistant('opencode').id, 'opencode');
  } finally {
    if (oldConfig === undefined) delete process.env.OPENCODE_CONFIG_DIR; else process.env.OPENCODE_CONFIG_DIR = oldConfig;
    if (oldXdg === undefined) delete process.env.XDG_CONFIG_HOME; else process.env.XDG_CONFIG_HOME = oldXdg;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('English OpenCode documentation and roadmap status are present', () => {
  const root = path.join(__dirname, '..');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const matrix = fs.readFileSync(path.join(root, 'documentation/CAPABILITIES.md'), 'utf8');

  assert.match(readme, /### OpenCode/);
  assert.match(readme, /OpenCode 1\.18\.29 or later is recommended/);
  assert.match(matrix, /OpenCode/);
  assert.match(matrix, /tests\/opencode\.test\.js/);
});
