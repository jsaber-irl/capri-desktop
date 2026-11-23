'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { collectDiagnostics, diagnosticsText } = require('../src/main/diagnostics');

test('diagnostics report reflects opt-in senses and provider without secrets', () => {
  const systemPreferences = {
    getMediaAccessStatus: (kind) => kind === 'microphone' ? 'granted' : 'denied',
    isTrustedAccessibilityClient: () => true,
  };
  const report = collectDiagnostics({
    cfg: {
      provider: 'openai',
      apiKeys: { openai: 'secret-key' },
      customUrl: 'http://private.example/v1',
      chatModel: 'gpt-test',
      voiceMode: 'chat',
      ttsEngine: 'system',
      ears: true,
      sttEngine: 'groq',
      micDevice: 'mic-1',
      vision: true,
      hands: true,
      handsType: true,
      computerControl: false,
    },
    platform: 'darwin',
    systemPreferences,
  });

  assert.equal(report.secretDataIncluded, false);
  const text = diagnosticsText(report);
  assert.match(text, /provider=openai/);
  assert.match(text, /microphone: granted/);
  assert.match(text, /vision: denied/);
  assert.match(text, /desktop-control: enabled/);
  assert.doesNotMatch(text, /secret-key|private\.example/);
});

test('diagnostics report keeps disabled senses off and is platform-safe', () => {
  const report = collectDiagnostics({
    cfg: { provider: 'ollama', voiceMode: 'off', ears: false, vision: false, hands: false, possess: false },
    platform: 'linux',
  });
  const checks = Object.fromEntries(report.checks.map((check) => [check.id, check]));

  assert.equal(checks.microphone.status, 'off');
  assert.equal(checks.vision.status, 'off');
  assert.equal(checks['desktop-control'].status, 'off');
  assert.equal(checks.accessibility.status, 'platform_managed');
});

test('P0 capability matrix and quality criteria are present', () => {
  const root = path.join(__dirname, '..');
  const matrix = fs.readFileSync(path.join(root, 'CAPABILITIES.md'), 'utf8');
  assert.match(matrix, /\| Feature \| Windows \| macOS \| Linux \|/);
  assert.match(matrix, /## Diagnostic workflow/);
  assert.match(matrix, /## P0 quality criteria/);
  assert.match(matrix, /src\/main\/diagnostics\.js/);
});
