'use strict';

function mediaStatus(systemPreferences, kind) {
  if (!systemPreferences?.getMediaAccessStatus) return 'unknown';
  try {
    const raw = systemPreferences.getMediaAccessStatus(kind);
    return raw === 'granted' ? 'granted' : raw === 'denied' || raw === 'restricted' ? 'denied' : raw === 'not-determined' ? 'action_required' : 'unknown';
  } catch {
    return 'unknown';
  }
}

function collectDiagnostics({
  cfg = {},
  platform = process.platform,
  systemPreferences = null,
} = {}) {
  const provider = String(cfg.provider || 'ollama');
  const checks = [
    {
      id: 'ai',
      status: provider === 'ollama' ? 'configured' : 'provider_selected',
      enabled: true,
      detail: `provider=${provider}; model=${String(cfg.chatModel || 'default')}`,
      resolution: 'Open AI setup to verify provider, model, key or local address.',
    },
    {
      id: 'tts',
      status: cfg.voiceMode === 'off' ? 'off' : 'enabled',
      enabled: cfg.voiceMode !== 'off',
      detail: `engine=${String(cfg.ttsEngine || 'system')}; voiceMode=${String(cfg.voiceMode || 'chat')}`,
      resolution: 'Open voice setup if the selected engine or voice is unavailable.',
    },
    {
      id: 'microphone',
      status: cfg.ears ? (platform === 'darwin' ? mediaStatus(systemPreferences, 'microphone') : 'runtime_check') : 'off',
      enabled: cfg.ears === true,
      detail: `ears=${Boolean(cfg.ears)}; engine=${String(cfg.sttEngine || 'groq')}; device=${String(cfg.micDevice || 'default')}`,
      resolution: 'Enable voice input, then verify the microphone and transcription provider.',
    },
    {
      id: 'vision',
      status: cfg.vision ? (platform === 'darwin' ? mediaStatus(systemPreferences, 'screen') : 'runtime_check') : 'off',
      enabled: cfg.vision === true,
      detail: `vision=${Boolean(cfg.vision)}; provider=${String(cfg.visionProvider || provider)}`,
      resolution: 'Enable vision and grant screen recording where the operating system requires it.',
    },
    {
      id: 'desktop-control',
      status: cfg.hands ? 'enabled' : 'off',
      enabled: cfg.hands === true,
      detail: `hands=${Boolean(cfg.hands)}; type=${Boolean(cfg.handsType)}; confirmedClicks=${Boolean(cfg.computerControl)}`,
      resolution: 'Use the desktop-control settings and macOS permissions panel before retrying an action.',
    },
    {
      id: 'accessibility',
      status: platform === 'darwin'
        ? (systemPreferences?.isTrustedAccessibilityClient ? (systemPreferences.isTrustedAccessibilityClient(false) ? 'granted' : 'action_required') : 'unknown')
        : 'platform_managed',
      enabled: cfg.hands === true || cfg.possess === true,
      detail: `platform=${platform}`,
      resolution: 'Open System Settings > Privacy & Security > Accessibility if window or desktop actions are unavailable.',
    },
  ];

  return {
    platform,
    checks,
    secretDataIncluded: false,
  };
}

function diagnosticsText(report) {
  return (report.checks || []).map((check) =>
    `${check.id}: ${check.status}; enabled=${check.enabled}; ${check.detail}; resolution=${check.resolution}`
  ).join('\n');
}

module.exports = { collectDiagnostics, diagnosticsText };
