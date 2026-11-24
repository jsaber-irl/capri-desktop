'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDataMods, validateMod, parseModJson } = require('../src/main/data-mods');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capri-data-mods-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('data mods accept only strict palette data and validate platform support', () => {
  const mod = {
    format: 1,
    id: 'ocean',
    name: 'Ocean',
    version: '1.0',
    description: 'A blue palette.',
    platforms: ['linux', 'darwin', 'win32'],
    permissions: ['appearance'],
    palette: {
      hue: 0.55,
      mix: 1,
      sat: 1,
      val: 1,
      rim: [0.5, 0.2, 1],
      css: { '--red': 'oklch(0.8 0.2 220)' },
      fx: { red: '#22ccff', violet: '#3355ff' },
    },
  };
  assert.equal(validateMod(mod, 'linux').id, 'ocean');
  assert.throws(() => validateMod({ ...mod, code: 'process.exit(1)' }, 'linux'), /unsupported field/i);
  assert.throws(() => validateMod(mod, 'freebsd'), /does not support/);
  assert.throws(() => validateMod({ ...mod, palette: { fx: { red: 'javascript:alert(1)' } } }, 'linux'), /six-digit/i);
});

test('data mod import, activation, backup, rollback-style uninstall, and removal work locally', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: dir, platform: 'linux' });
  const source = path.join(dir, 'ocean-source.capri-mod');
  fs.writeFileSync(source, JSON.stringify({
    format: 1,
    id: 'ocean',
    name: 'Ocean',
    version: '1.0',
    palette: { hue: 0.55, mix: 1, sat: 1, val: 1, fx: { red: '#22ccff', violet: '#3355ff' } },
  }));

  const imported = mods.import(source);
  assert.equal(imported.id, 'ocean');
  assert.equal(imported.enabled, false);
  assert.equal(mods.setEnabled('ocean', true).enabled, true);
  assert.equal(mods.active().id, 'ocean');

  fs.writeFileSync(source, JSON.stringify({
    format: 1,
    id: 'ocean',
    name: 'Ocean 2',
    version: '2.0',
    palette: { hue: 0.6, mix: 1, sat: 1, val: 1, fx: { red: '#44ddff', violet: '#4466ff' } },
  }));
  mods.import(source);
  assert.equal(mods.list()[0].name, 'Ocean 2');
  assert.equal(mods.active().palette.hue, 0.6);
  assert.ok(fs.readdirSync(mods.dir).some((name) => name.startsWith('ocean.capri-mod.backup-')));

  assert.equal(mods.uninstall('ocean').removed, true);
  assert.equal(mods.list().length, 0);
  assert.equal(mods.active(), null);
});

test('editing a mod saves a local previous version and selected history can be restored', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: dir, platform: 'linux' });
  const source = path.join(dir, 'neon.capri-mod');
  fs.writeFileSync(source, JSON.stringify({
    format: 1, id: 'neon', name: 'Neon', kind: 'palette', version: '1.0',
    palette: { hue: 0.5, mix: 0.8, sat: 1, val: 1, fx: { red: '#22ccff' } },
  }));
  mods.import(source);
  mods.setEnabled('neon', true);
  const edited = mods.update('neon', { name: 'Neon Night', palette: { hue: 0.72, fx: { red: '#ff8fc4' } } });
  assert.equal(edited.name, 'Neon Night');
  assert.equal(edited.palette.hue, 0.72);
  assert.equal(edited.palette.fx.red, '#ff8fc4');
  assert.equal(mods.active().palette.hue, 0.72);
  assert.equal(mods.active().palette.fx.red, '#ff8fc4');
  const [previous] = mods.history('neon');
  assert.ok(previous);
  assert.equal(previous.name, 'Neon');
  const restored = mods.restore('neon', previous.id);
  assert.equal(restored.name, 'Neon');
  assert.equal(restored.palette.hue, 0.5);
  assert.equal(mods.active().palette.hue, 0.5);
  assert.equal(mods.history('neon').length, 2, 'restoration also saves the version that was replaced');
  assert.throws(() => mods.update('../neon', { name: 'bad' }), /Invalid mod id/);
  assert.throws(() => mods.update('neon', { id: 'other' }), /cannot be changed/);
});

test('music modes expose user-selected audio folders through opaque Capri track IDs', (t) => {
  const dir = fixture(t);
  const home = path.join(dir, 'home');
  const folder = path.join(home, 'Desktop', 'Music');
  fs.mkdirSync(folder, { recursive: true });
  const audioFile = path.join(folder, 'Neon Drive.mp3');
  fs.writeFileSync(audioFile, Buffer.from('test audio placeholder'));
  const mods = createDataMods({ userData: path.join(dir, 'data'), homeDir: home, platform: 'linux' });
  const mod = mods.importMusicFolder(folder);
  assert.equal(mod.kind, 'music');
  assert.equal(mod.trackCount, 1);
  assert.equal(mod.enabled, true);
  const [track] = mods.musicLibrary();
  assert.equal(track.title, 'Neon Drive');
  assert.equal(track.mode, mod.name);
  assert.match(track.src, /^capri:\/\/music\//u);
  assert.equal(mods.musicSourceForId(track.id), fs.realpathSync(audioFile));
  assert.equal(mods.setEnabled(mod.id, false).enabled, false);
  assert.deepEqual(mods.musicLibrary(), []);
  assert.equal(mods.musicSourceForId(track.id), null);
});

test('music-mode online sources require HTTPS and a direct playable URL', (t) => {
  const mod = {
    format: 1, id: 'online-music', name: 'Online music', kind: 'music',
    music: { tracks: [{ id: 'track-one', title: 'Track One', src: 'https://media.example.test/audio/one.mp3' }] },
  };
  assert.equal(validateMod(mod, 'linux').music.tracks[0].src, 'https://media.example.test/audio/one.mp3');
  assert.throws(() => validateMod({ ...mod, music: { tracks: [{ ...mod.music.tracks[0], src: 'http://media.example.test/one.mp3' }] } }, 'linux'), /HTTPS/);
  assert.throws(() => validateMod({ ...mod, music: { tracks: [{ ...mod.music.tracks[0], src: './Desktop/../private.mp3' }] } }, 'linux'), /relative audio path/);
  const dir = fixture(t);
  const mods = createDataMods({ userData: dir, platform: 'linux' });
  const file = path.join(dir, 'online.capri-mod');
  fs.writeFileSync(file, JSON.stringify(mod));
  const imported = mods.import(file);
  assert.equal(imported.kind, 'music');
  mods.setEnabled(imported.id, true);
  assert.equal(mods.musicLibrary()[0].src, mod.music.tracks[0].src);
});

test('song mods with harmless trailing commas import and normalize to music modes', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: path.join(dir, 'data'), platform: 'linux' });
  const file = path.join(__dirname, 'mods', 'music.capri-mod');
  assert.equal(parseModJson('{"valid": [1, 2,],}').valid[1], 2);
  const imported = mods.import(file);
  assert.equal(imported.kind, 'music');
  assert.equal(imported.trackCount, 1);
  assert.equal(mods.setEnabled('my-music', true).enabled, true);
  assert.equal(mods.musicLibrary()[0].artist, 'Lia - VISUAL ARTS / Key Sounds Label.');
  assert.equal(mods.musicLibrary()[0].src, 'https://pub-e57c53755f854a3d9735b1f842344a2c.r2.dev/My%20Soul%2C%20Your%20Beats!.mp3');
});

test('new palette modes create an editable .capri-mod in the project mods folder and install it', (t) => {
  const dir = fixture(t);
  const projectModsDir = path.join(dir, 'project', 'mods');
  const mods = createDataMods({ userData: path.join(dir, 'data'), projectModsDir, platform: 'linux' });
  const created = mods.createPaletteMode('My Neon Mode');
  assert.equal(created.kind, 'palette');
  assert.equal(created.enabled, true);
  assert.equal(created.name, 'My Neon Mode');
  assert.ok(fs.existsSync(path.join(projectModsDir, `${created.id}.capri-mod`)));
  assert.equal(mods.active().id, created.id);
  mods.update(created.id, { palette: { hue: 0.73 } });
  const savedProjectFile = JSON.parse(fs.readFileSync(path.join(projectModsDir, `${created.id}.capri-mod`), 'utf8'));
  assert.equal(savedProjectFile.palette.hue, 0.73, 'editing the installed mode updates its project .capri-mod source');
  assert.throws(() => mods.createPaletteMode('my neon mode'), { code: 'MOD_NAME_TAKEN' });
  assert.equal(fs.readdirSync(projectModsDir).filter((name) => name.endsWith('.capri-mod')).length, 1);
});

test('new palette modes preserve the selected primary and secondary colours', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: path.join(dir, 'data'), projectModsDir: path.join(dir, 'project', 'mods'), platform: 'linux' });
  const created = mods.createPaletteMode('Custom Neon', { primary: '#123456', secondary: '#abcdef' });
  assert.equal(created.palette.fx.red, '#123456');
  assert.equal(created.palette.fx.violet, '#abcdef');
  assert.ok(created.palette.hue > 0.5 && created.palette.hue < 0.7, 'the chosen primary colour also drives Capri’s active hue');
  assert.equal(mods.active().paletteId, created.id, 'the created palette mode is actually activated');
});

test('new accessory modes package the selected PNG as a project .capri-mod', (t) => {
  const dir = fixture(t);
  const projectModsDir = path.join(dir, 'project', 'mods');
  const mods = createDataMods({ userData: path.join(dir, 'data'), projectModsDir, platform: 'linux' });
  const image = path.join(__dirname, 'mods', 'party-hat.png');
  const created = mods.createAccessoryMode(image, 'Party Hat Custom');
  assert.equal(created.kind, 'appearance');
  assert.equal(created.enabled, true);
  const saved = JSON.parse(fs.readFileSync(path.join(projectModsDir, `${created.id}.capri-mod`), 'utf8'));
  assert.match(saved.appearance.data, /^data:image\/png;base64,/u);
  const resized = mods.update(created.id, { appearance: { width: 210, height: 132 } });
  assert.deepEqual([resized.appearance.width, resized.appearance.height], [210, 132]);
});

test('multiple accessory and music modes can stay enabled together', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: path.join(dir, 'data'), projectModsDir: path.join(dir, 'project', 'mods'), platform: 'linux' });
  const image = path.join(__dirname, 'mods', 'party-hat.png');
  const firstAccessory = mods.createAccessoryMode(image, 'First accessory');
  const secondAccessory = mods.createAccessoryMode(image, 'Second accessory');
  mods.setEnabled(firstAccessory.id, true);
  assert.equal(mods.list().find((mod) => mod.id === firstAccessory.id).enabled, true);
  assert.equal(mods.list().find((mod) => mod.id === secondAccessory.id).enabled, true);
  assert.equal(mods.active().appearances.length, 2);

  const firstMusic = mods.createMusicUrlMode('First playlist', 'First track', 'https://media.example.test/first.mp3');
  const secondMusic = mods.createMusicUrlMode('Second playlist', 'Second track', 'https://media.example.test/second.mp3');
  mods.setEnabled(firstMusic.id, true);
  assert.equal(mods.list().find((mod) => mod.id === firstMusic.id).enabled, true);
  assert.equal(mods.list().find((mod) => mod.id === secondMusic.id).enabled, true);
  assert.equal(mods.musicLibrary().length, 2);
});

test('accessory modes can use a validated HTTPS image URL and custom placement', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: path.join(dir, 'data'), projectModsDir: path.join(dir, 'project', 'mods'), platform: 'linux' });
  const created = mods.createAccessoryUrlMode('https://cdn.example.test/capri-hat.png', 'Remote Hat', { x: 42, y: 60, width: 90, height: 48 });
  assert.equal(created.appearance.src, 'https://cdn.example.test/capri-hat.png');
  assert.deepEqual([created.appearance.x, created.appearance.y, created.appearance.width, created.appearance.height], [42, 60, 90, 48]);
  assert.throws(() => mods.createAccessoryUrlMode('http://cdn.example.test/hat.png', 'Insecure Hat'), /HTTPS/);
});

test('music modes created with a custom name are saved in the project mods folder', (t) => {
  const dir = fixture(t);
  const home = path.join(dir, 'home');
  const folder = path.join(home, 'Music', 'Capri Mix');
  const projectModsDir = path.join(dir, 'project', 'mods');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'Night City.mp3'), Buffer.from('test audio placeholder'));
  const mods = createDataMods({ userData: path.join(dir, 'data'), homeDir: home, projectModsDir, platform: 'linux' });
  const created = mods.importMusicFolder(folder, 'Cyberpunk Mix');
  assert.equal(created.kind, 'music');
  assert.equal(created.name, 'Cyberpunk Mix');
  assert.equal(created.enabled, true);
  assert.ok(fs.existsSync(path.join(projectModsDir, `${created.id}.capri-mod`)));
  assert.equal(mods.musicLibrary()[0].title, 'Night City');
  assert.throws(() => mods.importMusicFolder(folder, 'cyberpunk mix'), { code: 'MOD_NAME_TAKEN' });
});

test('music modes can contain a direct HTTPS track URL with title and artist metadata', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: path.join(dir, 'data'), projectModsDir: path.join(dir, 'project', 'mods'), platform: 'linux' });
  const created = mods.createMusicUrlMode('Remote Track Mode', 'Night Drive', 'https://media.example.test/night-drive.mp3', 'Capri Radio');
  assert.equal(created.kind, 'music');
  assert.equal(created.enabled, true);
  assert.deepEqual(mods.musicLibrary().map(({ title, artist, src }) => ({ title, artist, src })), [{
    title: 'Night Drive', artist: 'Capri Radio', src: 'https://media.example.test/night-drive.mp3',
  }]);
  assert.throws(() => mods.createMusicUrlMode('Unsafe Track', 'Track', 'http://media.example.test/track.mp3'), /HTTPS/);
});

test('accessory placement maps sprite coordinates to the same scaled padded canvas used by Capri', async () => {
  const { accessoryLayout } = await import('../src/renderer/js/accessory-layout.js');
  const mod = { x: 118, y: 20, width: 120, height: 70, anchor: 'center' };
  const preview = accessoryLayout(mod, 0.45);
  const runtime = accessoryLayout(mod, 0.6);
  const previewPixels = [preview.left / 0.45, preview.top / 0.45, preview.width / 0.45, preview.height / 0.45];
  const runtimePixels = [runtime.left / 0.6, runtime.top / 0.6, runtime.width / 0.6, runtime.height / 0.6];
  for (const [index, value] of previewPixels.entries()) assert.ok(Math.abs(value - runtimePixels[index]) < 1e-9);
  assert.equal(runtime.left, (56 + 118 - 60) * 0.6);
  assert.equal(runtime.top, (56 + 20) * 0.6);
  assert.equal(runtime.transformOriginX, (176 - (56 + 118 - 60)) * 0.6);
});

test('duplicate name and version require confirmation and import as a uniquely named copy', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: dir, platform: 'linux' });
  const original = path.join(dir, 'original.capri-mod');
  const duplicate = path.join(dir, 'duplicate.capri-mod');
  const createMod = (id) => ({
    format: 1,
    id,
    name: 'Party Hat',
    version: '1.0',
    kind: 'appearance',
    appearance: { type: 'accessory', src: 'https://cdn.example.com/party.png' },
  });
  fs.writeFileSync(original, JSON.stringify(createMod('party-hat')));
  fs.writeFileSync(duplicate, JSON.stringify(createMod('party-hat')));

  mods.import(original);
  const match = mods.findDuplicate(duplicate);
  assert.equal(match.name, 'Party Hat');
  assert.equal(match.version, '1.0');
  assert.equal(match.copyName, 'Party Hat (2)');
  assert.equal(match.copyId, 'party-hat-2');
  assert.throws(() => mods.import(duplicate), { code: 'MOD_DUPLICATE' });

  const copy = mods.import(duplicate, { allowDuplicate: true });
  assert.equal(copy.name, 'Party Hat (2)');
  assert.equal(copy.id, 'party-hat-2');
  assert.equal(mods.list().length, 2);

  const third = mods.import(duplicate, { allowDuplicate: true });
  assert.equal(third.name, 'Party Hat (3)');
  assert.equal(third.id, 'party-hat-3');
  assert.equal(mods.list().length, 3);

  const updatedVersion = path.join(dir, 'updated-version.capri-mod');
  fs.writeFileSync(updatedVersion, JSON.stringify({
    ...createMod('party-hat-v2'),
    version: '2.0',
  }));
  assert.equal(mods.findDuplicate(updatedVersion), null);
  assert.equal(mods.import(updatedVersion).name, 'Party Hat');
  assert.equal(mods.list().length, 4);
});

test('appearance mods accept one embedded PNG accessory and keep palette and appearance independent', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: dir, platform: 'linux' });
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const palette = path.join(dir, 'ocean.capri-mod');
  const hat = path.join(dir, 'hat.capri-mod');
  fs.writeFileSync(palette, JSON.stringify({
    format: 1, id: 'ocean', name: 'Ocean',
    kind: 'palette', palette: { hue: 0.55, mix: 1, sat: 1, val: 1 },
  }));
  fs.writeFileSync(hat, JSON.stringify({
    format: 1, id: 'party-hat', name: 'Party Hat', kind: 'appearance',
    appearance: { type: 'accessory', data: `data:image/png;base64,${png}`, x: 118, y: 18, width: 120, height: 70, anchor: 'center' },
  }));

  mods.import(palette);
  mods.import(hat);
  mods.setEnabled('ocean', true);
  mods.setEnabled('party-hat', true);
  assert.equal(mods.active().palette.hue, 0.55);
  assert.equal(mods.active().appearance.type, 'accessory');
  assert.equal(mods.active().paletteId, 'ocean');
  assert.equal(mods.active().appearanceId, 'party-hat');

  mods.setEnabled('ocean', false);
  assert.equal(mods.active().palette, null);
  assert.equal(mods.active().appearance.type, 'accessory');

  assert.throws(() => validateMod({
    format: 1, id: 'bad', name: 'Bad', kind: 'appearance',
    appearance: { type: 'accessory', data: 'data:image/svg+xml;base64,PHN2Zy8+' },
  }, 'linux'), /PNG/);

  const largerSource = Buffer.from(png, 'base64');
  largerSource.writeUInt32BE(640, 16);
  largerSource.writeUInt32BE(480, 20);
  assert.ok(validateMod({
    format: 1, id: 'scaled-hat', name: 'Scaled Hat', kind: 'appearance',
    appearance: { type: 'accessory', data: `data:image/png;base64,${largerSource.toString('base64')}` },
  }, 'linux'), 'bounded source images larger than the display box are accepted');
  largerSource.writeUInt32BE(2049, 16);
  assert.throws(() => validateMod({
    format: 1, id: 'too-large-hat', name: 'Too Large Hat', kind: 'appearance',
    appearance: { type: 'accessory', data: `data:image/png;base64,${largerSource.toString('base64')}` },
  }, 'linux'), /dimensions/);
});

test('appearance mods accept HTTPS sources but reject insecure or unsafe relative image paths', () => {
  const mod = {
    format: 1,
    id: 'party-hat',
    name: 'Party Hat',
    kind: 'appearance',
    appearance: { type: 'accessory', src: 'https://cdn.example.com/party.hat.png' },
  };
  assert.equal(validateMod(mod, 'linux').appearance.src, mod.appearance.src);
  assert.throws(() => validateMod({
    ...mod,
    appearance: { ...mod.appearance, src: 'http://cdn.example.com/party.hat.png' },
  }, 'linux'), /HTTPS/);
  assert.throws(() => validateMod({
    ...mod,
    appearance: { ...mod.appearance, src: '../party.hat.png' },
  }, 'linux'), /image source|relative accessory/i);
});

test('relative accessory images are confined to the source folder and packaged into the installed mod', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: dir, platform: 'linux' });
  const sourceDir = path.join(dir, 'source');
  fs.mkdirSync(sourceDir);
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  fs.writeFileSync(path.join(sourceDir, 'party.hat.png'), Buffer.from(png, 'base64'));
  const source = path.join(sourceDir, 'party-hat.capri-mod');
  fs.writeFileSync(source, JSON.stringify({
    format: 1,
    id: 'party-hat',
    name: 'Party Hat',
    kind: 'appearance',
    appearance: { type: 'accessory', src: './party.hat.png' },
  }));

  mods.import(source);
  mods.setEnabled('party-hat', true);
  const installed = JSON.parse(fs.readFileSync(path.join(mods.dir, 'party-hat.capri-mod'), 'utf8'));
  assert.equal(installed.appearance.data, `data:image/png;base64,${png}`);
  assert.equal(installed.appearance.src, undefined);
  assert.equal(mods.active().appearance.data, installed.appearance.data);

  const outside = path.join(dir, 'outside.png');
  fs.writeFileSync(outside, Buffer.from(png, 'base64'));
  fs.unlinkSync(path.join(sourceDir, 'party.hat.png'));
  fs.symlinkSync(outside, path.join(sourceDir, 'party.hat.png'));
  assert.throws(() => mods.import(source, { allowDuplicate: true }), /inside the mod folder/i);
});

test('invalid and misnamed mod files stay visible and can be removed from the local catalog', (t) => {
  const dir = fixture(t);
  const mods = createDataMods({ userData: dir, platform: 'linux' });
  fs.mkdirSync(mods.dir, { recursive: true });

  const misnamed = path.join(mods.dir, 'renamed.capri-mod');
  fs.writeFileSync(misnamed, JSON.stringify({
    format: 1,
    id: 'ocean',
    name: 'Ocean',
    palette: { hue: 0.55 },
  }));
  const invalid = path.join(mods.dir, 'Legacy.capri-mod');
  fs.writeFileSync(invalid, '{not json');

  const listed = mods.list();
  assert.equal(listed.length, 2);
  assert.ok(listed.every((mod) => mod.problem && mod.fileName));
  assert.match(listed.find((mod) => mod.fileName === 'renamed.capri-mod').problem, /ocean\.capri-mod/);

  assert.equal(mods.uninstall('renamed.capri-mod').removed, true);
  assert.equal(mods.uninstall('Legacy.capri-mod').removed, true);
  assert.deepEqual(mods.list(), []);
});

test('P1 documentation is English and the remote implementation is explicitly deferred', () => {
  const root = path.join(__dirname, '..');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const remote = fs.readFileSync(path.join(root, 'documentation/CAPRI_REMOTE_DESIGN.md'), 'utf8');
  const matrix = fs.readFileSync(path.join(root, 'documentation/CAPABILITIES.md'), 'utf8');

  assert.match(readme, /### Data mods/);
  assert.match(readme, /do not execute code/);
  assert.match(remote, /Status: design complete; implementation intentionally deferred/);
  assert.match(remote, /## Threat model/);
  assert.match(remote, /## Required tests before implementation/);
  assert.match(matrix, /Data-only palette and accessory mods/);
  assert.match(matrix, /Experimental\/Deferred/);
});
