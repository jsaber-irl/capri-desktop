// Capri OpenCode integration
'use strict';

const http = require('node:http');

const PORT = Number(process.env.CAPRI_PORT) || 47823;
const MARK = 'capri-opencode-plugin';

function text(value, max = 280) {
  if (typeof value !== 'string') return '';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function sessionID(input = {}) {
  return text(String(input.sessionID || input.session_id || input.session?.id || input.properties?.sessionID || input.properties?.session?.id || 'default'), 200) || 'default';
}

function projectDirectory(input = {}) {
  return input.directory || input.cwd || input.project?.directory || input.properties?.session?.directory || input.properties?.directory || '';
}

function slim(input = {}) {
  const evt = { ...input };
  delete evt.output;
  delete evt.result;
  delete evt.content;
  for (const key of Object.keys(evt)) {
    const value = evt[key];
    if (typeof value === 'string') evt[key] = text(value, key === 'prompt' || key === 'last_assistant_message' ? 6000 : 280);
    else if (Array.isArray(value)) evt[key] = value.slice(0, 8).map((item) => typeof item === 'string' ? text(item) : item);
  }
  return evt;
}

function post(evt) {
  if (!evt || typeof evt !== 'object' || typeof evt.hook_event_name !== 'string') return;
  const body = JSON.stringify(slim(evt));
  const req = http.request({
    host: '127.0.0.1',
    port: PORT,
    path: '/event',
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
    timeout: 800,
  }, (res) => res.resume());
  req.on('timeout', () => req.destroy());
  req.on('error', () => {});
  req.end(body);
}

function adaptPublicEvent(raw) {
  const evt = raw?.event || raw;
  const type = evt?.type;
  const properties = evt?.properties || {};
  const session = properties.session || properties.info || {};
  const id = sessionID({ sessionID: session.id, session_id: session.id, properties });
  const cwd = projectDirectory({ cwd: session.directory, directory: session.directory, properties });
  const base = { session_id: `opencode:${id}`, cwd };

  if (type === 'session.created') return { ...base, hook_event_name: 'SessionStart', source: 'create' };
  if (type === 'session.idle') return { ...base, hook_event_name: 'Stop', last_assistant_message: text(properties.message || properties.title || '', 6000) };
  if (type === 'session.error') return { ...base, hook_event_name: 'StopFailure', error: text(properties.error?.message || properties.error || properties.message || 'OpenCode session failed') };
  if (type === 'session.deleted') return { ...base, hook_event_name: 'SessionEnd' };
  if (type === 'permission.updated') {
    const permission = properties.permission || properties;
    return {
      ...base,
      hook_event_name: 'Notification',
      notification_type: 'permission_prompt',
      message: text(permission.message || permission.permission || 'OpenCode needs your approval'),
    };
  }
  return null;
}

function adaptChat(input = {}, output = {}) {
  const id = sessionID(input);
  return {
    hook_event_name: 'UserPromptSubmit',
    session_id: `opencode:${id}`,
    cwd: projectDirectory(input),
    prompt: text(input.prompt || input.text || output.prompt || output.text || '', 6000),
  };
}

function adaptTool(input = {}, output = {}, failure = false) {
  const id = sessionID(input);
  const tool = input.tool || input.name || input.toolName || 'Tool';
  const args = input.args || input.arguments || input.input || {};
  const base = {
    session_id: `opencode:${id}`,
    cwd: projectDirectory(input),
    tool_name: tool,
    tool_input: {
      command: args.command || args.cmd || args.CommandLine,
      file_path: args.filePath || args.file_path || args.path,
      description: args.description,
    },
  };
  if (failure) return { ...base, hook_event_name: 'PostToolUseFailure', error: text(output?.error || output?.message || 'Tool failed') };
  if (output?.failure) return { ...base, hook_event_name: 'PostToolUseFailure', error: text(output.error || output.message || 'Tool failed') };
  return { ...base, hook_event_name: input.before === true || output?.before === true ? 'PreToolUse' : 'PostToolUse' };
}

function adaptPermission(input = {}) {
  const id = sessionID(input);
  return {
    hook_event_name: 'Notification',
    session_id: `opencode:${id}`,
    cwd: projectDirectory(input),
    notification_type: 'permission_prompt',
    message: text(input.message || input.permission || 'OpenCode needs your approval'),
  };
}

async function plugin({ directory, project } = {}) {
  return {
    event: async (raw) => post(adaptPublicEvent(raw)),
    'chat.message': async (input, output) => post(adaptChat(input, output)),
    'tool.execute.before': async (input, output) => post(adaptTool({ ...input, ...output, before: true }, output)),
    'tool.execute.after': async (input, output) => post(adaptTool(input, output)),
    'permission.ask': async (input) => post(adaptPermission(input)),
  };
}

module.exports = plugin;
module.exports.adaptPublicEvent = adaptPublicEvent;
module.exports.adaptChat = adaptChat;
module.exports.adaptTool = adaptTool;
module.exports.adaptPermission = adaptPermission;
