'use strict';

const RIVALS = [
  ['chatgpt', /^chatgpt$/i, /(?:^|[ ._-])chatgpt(?:$|[ ._-])/i],
  ['claude', /^claude$/i, /(?:^|[ ._-])claude(?:$|[ ._-])/i],
  ['codex', /^codex$/i, /(?:^|[ ._-])codex(?:$|[ ._-])/i],
  ['gemini', /^gemini$/i, /(?:^|[ ._-])gemini(?:$|[ ._-])/i],
  ['copilot', /^copilot$/i, /(?:^|[ ._-])copilot(?:$|[ ._-])/i],
  ['perplexity', /^perplexity$/i, /(?:^|[ ._-])perplexity(?:$|[ ._-])/i],
  ['deepseek', /^deepseek$/i, /(?:^|[ ._-])deepseek(?:$|[ ._-])/i],
  ['grok', /^grok$/i, /(?:^|[ ._-])grok(?:$|[ ._-])/i],
  ['lechat', /^(?:le chat|mistral ai)$/i, /(?:^|[ ._-])(?:le.?chat|mistral)(?:$|[ ._-])/i],
  ['characterai', /^character\.ai$/i, /(?:^|[ ._-])character(?:\.?ai)?(?:$|[ ._-])/i],
  ['metaai', /^meta ai$/i, /(?:^|[ ._-])meta(?:\s?ai)?(?:$|[ ._-])/i],
];

const BROWSERS = /\b(?:safari|chrome|chromium|firefox|edge|msedge|brave|opera|vivaldi|arc|librewolf|waterfox|floorp|zen|thorium)\b/i;

function matchesBrowserTitle(title, namePattern) {
  const segments = title.split(/ [-|:\u2013\u2014] |: /);
  return segments.some((segment) => namePattern.test(segment.trim()));
}

function findRivalTitle(windows) {
  for (const window of windows) {
    const app = typeof window?.app === 'string' ? window.app.trim() : '';
    const title = typeof window?.title === 'string' ? window.title.trim() : '';
    if (!app || !title) continue;
    for (const [key, titlePattern, appPattern] of RIVALS) {
      if (BROWSERS.test(app) && matchesBrowserTitle(title, titlePattern)) {
        return { key, title, id: window.id };
      }
      if (!BROWSERS.test(app) && appPattern.test(app)) {
        return { key, title, id: window.id };
      }
    }
  }
  return null;
}

function parseLinuxWindows(output) {
  return String(output || '').split('\n').flatMap((line) => {
    const match = line.match(/^\s*(\S+)\s+-?\d+\s+\d+\s+-?\d+\s+-?\d+\s+\d+\s+\d+\s+(\S+)\s+\S+\s+(.*)$/);
    if (!match) return [];
    return [{ id: match[1], app: match[2], title: match[3].trim() }];
  });
}

module.exports = { findRivalTitle, parseLinuxWindows };
