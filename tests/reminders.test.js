'use strict';

// Tests des rappels (src/renderer/js/reminders.js) :
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
  const { parseReminder } = await load('reminders.js');
  const r = parseReminder('rappelle-moi dans 20 minutes de sortir la pizza', FIXED_NOW);
  assert.ok(r, 'doit reconnaître le rappel');
  assert.equal(r.text, 'sortir la pizza');
  assert.equal(Math.round((r.at - FIXED_NOW) / 60000), 20);
});

test('rappel sans heure demandé -> at null et demande l\'heure', async () => {
  const { parseReminder } = await load('reminders.js');
  const r = parseReminder('rappelle-moi de sortir la pizza', FIXED_NOW);
  assert.ok(r);
  assert.equal(r.at, null);
  assert.equal(r.text, 'sortir la pizza');
});

test('Annule le rappel : Sortir la pizza -> cancelReminder avec le texte', async () => {
  const { parseCancel } = await load('reminders.js');
  const c = parseCancel('Annule le rappel : Sortir la pizza');
  assert.ok(c);
  assert.equal(c.text, 'Sortir la pizza');
});

test('cancel le rappel sans texte -> cible le plus ancien à venir', async () => {
  const { parseCancel } = await load('reminders.js');
  const c = parseCancel('Annule le rappel');
  assert.ok(c);
  assert.equal(c.text, '');
});

test('classe Reminders.add crée un rappel non "fait" (made null)', async () => {
  const { Reminders } = await load('reminders.js');
  const host = makeHost();
  const reminders = new Reminders({ host, list: [] });
  const r = reminders.add(FIXED_NOW + 60000, 'sortir la pizza');
  assert.equal(r.made, null, 'un rappel neuf n\'est pas encore délivré');
  assert.equal(r.text, 'sortir la pizza');
  assert.deepEqual(host.getConfig().reminders, [r], 'persisté dans la config');
});

test('Reminders.check déclenche le rappel arrivé à échéance une seule fois', async () => {
  const { Reminders } = await load('reminders.js');
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
  const { Reminders } = await load('reminders.js');
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
  const { Reminders } = await load('reminders.js');
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
  const { Reminders } = await load('reminders.js');
  const host = makeHost();
  const reminders = new Reminders({ host, list: [] });
  const r = reminders.add(FIXED_NOW + 60000, 'quelque chose');
  r.made = Date.now(); // déjà délivré
  assert.equal(reminders.cancelByText('quelque chose'), null);
});

test('clock affiche les secondes quand on le demande', async () => {
  const { clock } = await load('reminders.js');
  const at = new Date('2026-03-15T14:05:09Z').getTime();
  assert.equal(clock(at, 'fr-FR', true), '14:05:09');
  assert.equal(clock(at, 'fr-FR'), '14:05');
});
