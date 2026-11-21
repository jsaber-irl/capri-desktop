'use strict';

const actionText = document.getElementById('action');
const statusText = document.getElementById('status');
const allowButton = document.getElementById('allow');
const refuseButton = document.getElementById('refuse');
let currentId = '';
let busy = false;

function setBusy(value, message) {
  busy = value;
  allowButton.disabled = value;
  refuseButton.disabled = value;
  statusText.textContent = message || '';
}

window.computerConfirm.onPrompt((prompt) => {
  currentId = prompt.id;
  actionText.textContent = prompt.action ? `Cliquer sur « ${prompt.action} »` : 'Effectuer le clic proposé sur le bureau';
});

allowButton.addEventListener('click', async () => {
  if (!currentId || busy) return;
  setBusy(true, 'Capri effectue le clic autorisé…');
  try {
    const result = await window.computerConfirm.approve(currentId);
    if (!result?.ok) {
      setBusy(false, result?.reason === 'cancelled' ? 'Action interrompue.' : 'Le clic n’a pas pu être effectué.');
      return;
    }
    setBusy(false, 'Action effectuée.');
    window.setTimeout(() => window.close(), 800);
  } catch (error) {
    setBusy(false, `Échec : ${String(error?.message || error).slice(0, 100)}`);
  }
});

refuseButton.addEventListener('click', async () => {
  if (!currentId || busy) return;
  setBusy(true, 'Action annulée.');
  try { await window.computerConfirm.refuse(currentId); } finally { window.close(); }
});
