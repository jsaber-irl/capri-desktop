'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { grab } = require('../src/main/screen');
const { TRAY } = require('../src/main/labels');

const displayApi = {
  getAllDisplays: () => [{ id: '1', size: { width: 1920, height: 1080 } }, { id: '2', size: { width: 1280, height: 720 } }],
  getPrimaryDisplay: () => ({ id: '1', size: { width: 1920, height: 1080 } }),
};

test('the mascot menu identifies Screen as its display selector, not as a screenshot action', () => {
  assert.match(TRAY.fr.screen, /Écran utilisé par Capri/);
  assert.match(TRAY.fr.screenDescription, /ne déclenche aucune capture/);
});

test('a denied macOS screen permission blocks capture before desktopCapturer is called', async () => {
  let captures = 0;
  await assert.rejects(grab({
    platform: 'darwin', screen: displayApi,
    systemPreferences: { getMediaAccessStatus: () => 'denied' },
    desktopCapturer: { getSources: async () => { captures += 1; return []; } },
  }), (err) => err.code === 'screen_permission_denied');
  assert.equal(captures, 0);
});

test('a requested capture with no confirmed Screen Recording permission reports action required', async () => {
  await assert.rejects(grab({
    platform: 'darwin', screen: displayApi,
    systemPreferences: { getMediaAccessStatus: () => 'not-determined' },
    desktopCapturer: { getSources: async () => [{ display_id: '2', thumbnail: { isEmpty: () => true } }] },
  }), (err) => err.code === 'screen_permission_required');
});

test('an allowed explicit capture targets the selected display and restores Capri afterward', async () => {
  let request;
  let hidden = 0;
  let restored = 0;
  const jpeg = Buffer.from('jpeg-data');
  const result = await grab({
    displayId: '2', platform: 'darwin', screen: displayApi,
    systemPreferences: { getMediaAccessStatus: () => 'granted' },
    hideOverlay: async () => { hidden += 1; return async () => { restored += 1; }; },
    desktopCapturer: { getSources: async (options) => {
      request = options;
      return [{ display_id: '1', thumbnail: { isEmpty: () => false, toJPEG: () => Buffer.from('wrong') } },
        { display_id: '2', thumbnail: { isEmpty: () => false, toJPEG: () => jpeg } }];
    } },
  });
  assert.equal(result, jpeg.toString('base64'));
  assert.deepEqual(request.types, ['screen']);
  assert.deepEqual(request.thumbnailSize, { width: 896, height: 504 });
  assert.equal(hidden, 1);
  assert.equal(restored, 1);
});
