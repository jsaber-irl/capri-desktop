'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { APP_ALIASES } = require('../src/main/app-aliases');
const { normalizeRequest, resolveInCatalog, openApplicationItem } = require('../src/main/launch');
const { createTerminal } = require('../src/main/terminal');

const catalog = [
  { name: 'Weather', kind: 'app', id: 'com.apple.weather', bundleId: 'com.apple.weather', path: '/System/Applications/Weather.app' },
  { name: 'Calendar', localizedNames: ['Calendrier'], kind: 'app', id: 'com.apple.iCal', bundleId: 'com.apple.iCal', path: '/System/Applications/Calendar.app' },
  { name: 'Notes', kind: 'app', id: 'com.apple.Notes', bundleId: 'com.apple.Notes', path: '/System/Applications/Notes.app' },
  { name: 'System Settings', localizedNames: ['Réglages Système'], kind: 'app', id: 'com.apple.systempreferences', bundleId: 'com.apple.systempreferences', path: '/System/Applications/System Settings.app' },
  { name: 'Activity Monitor', localizedNames: ["Moniteur d’activité"], kind: 'app', id: 'com.apple.ActivityMonitor', bundleId: 'com.apple.ActivityMonitor', path: '/System/Applications/Utilities/Activity Monitor.app' },
];

test('normalizes French/English launch verbs, accents and app filler words', () => {
  assert.equal(normalizeRequest("Ouvre l'application météo"), 'meteo');
  assert.equal(normalizeRequest('Lance l’application Météo'), 'meteo');
  assert.equal(normalizeRequest('Démarre Weather'), 'weather');
  assert.equal(normalizeRequest('Open the application WEATHER'), 'weather');
  assert.equal(normalizeRequest('ouvre les notes'), 'notes');
});

test('resolves Weather aliases and transcription variants to the installed app', () => {
  for (const query of ['météo', 'meteo', 'Weather', "Ouvre l'application météo", 'Lance météo', 'Démarre Weather', 'wether']) {
    const result = resolveInCatalog(query, catalog);
    assert.equal(result.status, 'found', query);
    assert.equal(result.item.bundleId, 'com.apple.weather', query);
  }
});

test('resolves localized names and the requested Calendar, Notes, Settings and Activity Monitor apps', () => {
  for (const [query, expected] of [
    ['calendrier', 'com.apple.iCal'], ['Calendrier', 'com.apple.iCal'], ['Calendar', 'com.apple.iCal'],
    ['les notes', 'com.apple.Notes'], ['Notes', 'com.apple.Notes'],
    ['paramètres', 'com.apple.systempreferences'], ['System Settings', 'com.apple.systempreferences'],
    ["moniteur d'activité", 'com.apple.ActivityMonitor'], ['Activity Monitor', 'com.apple.ActivityMonitor'],
  ]) {
    const result = resolveInCatalog(query, catalog);
    assert.equal(result.status, 'found', query);
    assert.equal(result.item.bundleId, expected, query);
  }
});

test('reports absent apps and offers only installed suggestions', () => {
  const result = resolveInCatalog('Ouvre l’application GarageBand', catalog);
  assert.equal(result.status, 'not_found');
  assert.deepEqual(result.suggestions, []);
  assert.equal(resolveInCatalog('weather', catalog.filter((item) => item.bundleId !== 'com.apple.weather')).status, 'not_found');
});

test('asks for clarification when several installed applications have the same exact name or alias', () => {
  const items = [...catalog, { name: 'Notes', kind: 'app', id: 'com.example.notes', bundleId: 'com.example.notes', path: '/Applications/Notes.app' }];
  const result = resolveInCatalog('notes', items);
  assert.equal(result.status, 'ambiguous');
  assert.deepEqual(result.candidates.map((item) => item.bundleId).sort(), ['com.apple.Notes', 'com.example.notes']);
  const aliasItems = [...catalog, { name: 'Sticky Notes', kind: 'app', id: 'Microsoft.MicrosoftStickyNotes_1!App', path: '/Applications/Sticky Notes.app' }];
  const aliasResult = resolveInCatalog('note', aliasItems);
  assert.equal(aliasResult.status, 'ambiguous');
  assert.deepEqual(aliasResult.candidates.map((item) => item.name).sort(), ['Notes', 'Sticky Notes']);
});

test('keeps the alias map centralized and maps the browser alias to a known default only', () => {
  assert.ok(APP_ALIASES.Weather.aliases.includes('météo'));
  const browsers = [
    { name: 'Safari', kind: 'app', id: 'com.apple.Safari', bundleId: 'com.apple.Safari', isDefaultBrowser: false },
    { name: 'Firefox', kind: 'app', id: 'org.mozilla.firefox', bundleId: 'org.mozilla.firefox', isDefaultBrowser: true },
  ];
  assert.equal(resolveInCatalog('navigateur', browsers).item.name, 'Firefox');
  const unknown = resolveInCatalog('navigateur', [{ name: 'Notes', kind: 'app', id: 'notes' }]);
  assert.equal(unknown.status, 'not_found');
});

test('reports the native opener failure instead of treating it as a successful launch', async () => {
  await assert.rejects(
    openApplicationItem(catalog[0], { platform: 'darwin', openPath: async () => 'Launch Services could not open the app' }),
    /Launch Services could not open the app/,
  );
  assert.deepEqual(await openApplicationItem(catalog[0], { platform: 'darwin', openPath: async () => '' }), { ok: true });
});

test('the Capri terminal resolves localized names through the shared resolver and explains ambiguity', async () => {
  const terminal = createTerminal({
    openApp: async (query) => {
      const result = resolveInCatalog(query, catalog);
      if (result.status === 'found') return { ok: true, name: result.item.name };
      return result;
    },
  });
  const opened = await terminal.execute('/open app/météo');
  assert.match(opened.lines[0], /Weather/);
  const absent = await terminal.execute('/open app/GarageBand');
  assert.equal(absent.kind, 'error');
  const ambiguousTerminal = createTerminal({ openApp: async () => ({ status: 'ambiguous', candidates: catalog.slice(0, 2) }) });
  assert.match((await ambiguousTerminal.execute('/open app/calendrier')).lines[0], /Calendar.*Weather|Weather.*Calendar/);
});
