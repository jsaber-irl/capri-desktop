'use strict';

const host = window.host;
const provider = document.getElementById('provider');
const sourceLang = document.getElementById('sourceLang');
const targetLang = document.getElementById('targetLang');
const apiKey = document.getElementById('apiKey');
const apiUrl = document.getElementById('apiUrl');
const url = document.getElementById('url');
const input = document.getElementById('input');
const fileName = document.getElementById('fileName');
const status = document.getElementById('status');
let mode = 'url';
let file = '';

function setMode(next) {
  mode = next;
  for (const id of ['urlMode', 'fileMode', 'textMode']) document.getElementById(id).classList.toggle('active', id === `${next}Mode`);
  url.hidden = next !== 'url';
  document.getElementById('chooseFile').hidden = next !== 'file';
  input.hidden = next !== 'text';
  fileName.hidden = next !== 'file';
}
for (const id of ['urlMode', 'fileMode', 'textMode']) document.getElementById(id).addEventListener('click', () => setMode(id.replace('Mode', '')));
document.getElementById('chooseFile').addEventListener('click', async () => {
  const result = await host.translationChooseFile();
  if (result?.ok) { file = result.path; fileName.textContent = file; fileName.hidden = false; }
});
document.getElementById('saveSettings').addEventListener('click', async () => {
  const result = await host.translationSetSettings({ provider: provider.value, apiKey: apiKey.value, apiUrl: apiUrl.value });
  status.textContent = result?.ok ? 'Configuration enregistrée.' : result?.error || 'Impossible d’enregistrer.';
  if (result?.ok) apiKey.value = '';
});
document.getElementById('translate').addEventListener('click', async () => {
  const source = mode === 'url' ? { kind: 'url', value: url.value } : mode === 'file' ? { kind: 'file', value: file } : { kind: 'text', value: input.value };
  status.textContent = 'Traduction en cours…';
  const result = await host.translationTranslate({ source, options: { provider: provider.value, source: sourceLang.value, target: targetLang.value } });
  status.textContent = result?.ok ? 'Traduction terminée.' : result?.error || 'Échec de la traduction.';
  document.getElementById('output').textContent = result?.ok ? result.text : '';
});
document.getElementById('close').addEventListener('click', () => host.translationClose());
host.translationSettings().then((settings) => {
  if (!settings) return;
  provider.value = settings.provider;
  apiUrl.value = settings.apiUrl || '';
  setMode('url');
});
