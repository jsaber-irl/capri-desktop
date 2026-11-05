'use strict';

// Tests des rappels (src/renderer/js/reminders.mjs) :
//   node --test tests/reminders.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = (file) => import(pathToFileURL(path.join(__dirname, '..', 'src', 'renderer', 'js', file)).href);

// Un hôte factice qui stocke la config en mémoire (comme main.js le fait avec config.json).
const makeHost = () => {
  let reminders = [];
  return {
    setConfig: (patch) => {
      if (patch && typeof patch === 'object' && 'reminders' in patch) {
        reminders = patch.reminders;
      }
    },
    getConfig: () => ({ reminders }),
  };
};

const FIXED_NOW = new Date('2026-03-15T14:00:00Z').getTime();

test('rappelle-moi dans 20 minutes de sortir la pizza -> rappel à +20 min', async () => {
  const { parseReminder } = await load('reminders.mjs');
  const r = parseReminder('rappelle-moi dans 20 minutes de sortir la pizza', FIXED_NOW);
  assert.ok(r, 'doit reconnaître le rappel');
  assert.equal(r.text, 'sortir la pizza');
  assert.equal(Math.round((r.at - FIXED_NOW) / 60000), 20);
});

test('rappel sans heure demandé -> at null et demande l\'heure', async () => {
  const { parseReminder } = await load('reminders.mjs');
  const r = parseReminder('rappelle-moi de sortir la pizza', FIXED_NOW);
  assert.ok(r);
  assert.equal(r.at, null);
  assert.equal(r.text, 'sortir la pizza');
});

test('Annule le rappel : Sortir la pizza -> cancelReminder avec le texte', async () => {
  const { parseCancel } = await load('reminders.mjs');
  const c = parseCancel('Annule le rappel : Sortir la pizza');
  assert.ok(c);
  assert.equal(c.text, 'Sortir la pizza');
});

test('cancel le rappel sans texte -> cible le plus ancien à venir', async () => {
  const { parseCancel } = await load('reminders.mjs');
  const c = parseCancel('Annule le rappel');
  assert.ok(c);
  assert.equal(c.text, '');
});

test('classe Reminders.add crée un rappel non "fait" (made null)', async () => {
  const { Reminders } = await load('reminders.mjs');
  const host = makeHost();
  const reminders = new Reminders({ host, list: [] });
  const r = reminders.add(FIXED_NOW + 60000, 'sortir la pizza');
  assert.equal(r.made, null, 'un rappel neuf n\'est pas encore délivré');
  assert.equal(r.text, 'sortir la pizza');
  assert.deepEqual(host.getConfig().reminders, [r], 'persisté dans la config');
});

test('Reminders.check déclenche le rappel arrivé à échéance une seule fois', async () => {
  const { Reminders } = await load('reminders.mjs');
  const host = makeHost();
  const reminders = new Reminders({ host, list: [] });
  let fired = null;
  reminders.onDue = (r) => { fired = r; };
  const r = reminders.add(FIXED_NOW - 1000, 'à l\'heure');
  reminders.check();
  assert.ok(fired, 'le rappel passé doit sonner');
  assert.equal(fired.id, r.id);
  assert.equal(r.made !== null, true, 'marqué comme délivré après avoir sonné');
  // un deuxième check ne doit pas le re-déclencher
  reminders.check();
  assert.equal(fired, r, 'toujours le même rappel, pas de re-déclenchement');
});

test('Reminders.cancelByText annule le rappel correspondant', async () => {
  const { Reminders } = await load('reminders.mjs');
  const host = makeHost();
  const reminders = new Reminders({ host, list: [] });
  reminders.add(FIXED_NOW + 60000, 'sortir la pizza');
  reminders.add(FIXED_NOW + 120000, 'appeler maman');
  const cancelled = reminders.cancelByText('pizza');
  assert.ok(cancelled);
  assert.equal(cancelled.text, 'sortir la pizza');
  assert.equal(reminders.list.length, 1);
  assert.equal(reminders.list[0].text, 'appeler maman');
});

test('Reminders.cancelByText sans texte annule le plus ancien à venir', async () => {
  const { Reminders } = await load('reminders.mjs');
  const host = makeHost();
  const reminders = new Reminders({ host, list: [] });
  reminders.add(FIXED_NOW + 120000, 'le plus tard');
  const first = reminders.add(FIXED_NOW + 60000, 'le plus tôt');
  const cancelled = reminders.cancelByText('');
  assert.ok(cancelled);
  assert.equal(cancelled.id, first.id);
  assert.equal(reminders.list.length, 1);
});

test('Reminders.cancelByText ne trouve rien quand tous les rappels sont délivrés', async () => {
  const { Reminders } = await load('reminders.mjs');
  const host = makeHost();
  const reminders = new Reminders({ host, list: [] });
  const r = reminders.add(FIXED_NOW + 60000, 'quelque chose');
  r.made = Date.now(); // déjà délivré
  assert.equal(reminders.cancelByText('quelque chose'), null);
});

test('clock affiche les secondes quand on le demande', async () => {
  const { clock } = await load('reminders.mjs');
  const atDate = new Date();
  atDate.setHours(14, 5, 9, 0);
  const at = atDate.getTime();
  assert.equal(clock(at, 'fr-FR', true), '14:05:09');
  assert.equal(clock(at, 'fr-FR'), '14:05');
});

test('parse un rappel quotidien dans un fuseau explicitement demandé', async () => {
  const { parseReminder, zonedTimeToEpoch } = await load('reminders.mjs');
  const now = Date.parse('2026-03-15T00:00:00Z');
  const reminder = parseReminder('remind me every day at 9am timezone Europe/Paris to take medicine', now);
  assert.equal(reminder.text, 'take medicine');
  assert.deepEqual(reminder.recurrence, { unit: 'day', interval: 1 });
  assert.equal(reminder.timeZone, 'Europe/Paris');
  assert.equal(reminder.at, zonedTimeToEpoch('2026-03-15T09:00', 'Europe/Paris'));
});

test('récurrence journalière garde l’heure locale à travers le changement DST', async () => {
  const { nextOccurrence, zonedTimeToEpoch } = await load('reminders.mjs');
  const first = zonedTimeToEpoch('2026-03-28T09:00', 'Europe/Paris');
  const next = nextOccurrence(first, { unit: 'day', interval: 1 }, 'Europe/Paris');
  assert.equal(next - first, 23 * 60 * 60 * 1000);
  assert.equal(new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(next)), '2026-03-29 09:00');
});

test('mensuel le 31 du mois revient au dernier jour du mois suivant', async () => {
  const { nextOccurrence, zonedTimeToEpoch } = await load('reminders.mjs');
  const first = zonedTimeToEpoch('2026-01-31T08:30', 'UTC');
  const next = nextOccurrence(first, { unit: 'month', interval: 1 }, 'UTC');
  assert.equal(new Date(next).toISOString(), '2026-02-28T08:30:00.000Z');
});

test('rappels récurrents persistent, se désactivent et restent dans leur fuseau après redémarrage', async () => {
  const { Reminders } = await load('reminders.mjs');
  const host = makeHost();
  let now = Date.parse('2026-10-24T07:00:00Z');
  const firstService = new Reminders({ host, list: [], now: () => now });
  const firstAt = Date.parse('2026-10-24T08:00:00Z');
  const r = firstService.add(firstAt, 'prendre le médicament', {
    timeZone: 'Europe/Paris',
    recurrence: { unit: 'day', interval: 1 },
  });
  firstService.setEnabled(r.id, false);
  firstService.check();
  assert.equal(host.getConfig().reminders[0].at, firstAt, 'a disabled reminder never fires');
  firstService.setEnabled(r.id, true);

  now = firstAt + 1000;
  const afterRestart = new Reminders({ host, list: structuredClone(host.getConfig().reminders), now: () => now });
  let fired;
  afterRestart.onDue = (reminder) => { fired = reminder; };
  afterRestart.check();
  assert.equal(fired.at, firstAt);
  assert.equal(afterRestart.list[0].timeZone, 'Europe/Paris');
  assert.equal(afterRestart.list[0].at, Date.parse('2026-10-25T09:00:00Z'));
  assert.equal(afterRestart.list[0].made, null);
});

test('editing a reminder changes the schedule and rejects unknown time zones', async () => {
  const { Reminders } = await load('reminders.mjs');
  const host = makeHost();
  const reminders = new Reminders({ host, list: [] });
  const r = reminders.add(FIXED_NOW + 60000, 'prendre les clés');
  const edited = reminders.edit(r.id, {
    text: 'prendre le passeport',
    at: FIXED_NOW + 120000,
    timeZone: 'Europe/Paris',
    recurrence: { unit: 'week', interval: 2 },
  });
  assert.equal(edited.text, 'prendre le passeport');
  assert.equal(edited.at, FIXED_NOW + 120000);
  assert.deepEqual(edited.recurrence, { unit: 'week', interval: 2 });
  assert.throws(() => reminders.edit(r.id, { timeZone: 'Not/A_Timezone' }), /Unknown time zone/);
});
