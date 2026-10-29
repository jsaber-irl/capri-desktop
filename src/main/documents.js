'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

function safeTextName(value) {
  const name = value === undefined || value === null ? 'Note.txt' : String(value).trim();
  if (!name || name === '.' || name === '..' || /[\\/:\0]/.test(name) || name !== path.basename(name)) return null;
  const withExtension = /\.txt$/i.test(name) ? name : `${name}.txt`;
  return withExtension.length <= 120 ? withExtension : null;
}

async function createTextDocument({ filename = 'Note.txt', content, directory, platform = process.platform, openTextEdit = async () => ({ ok: true }) } = {}) {
  if (typeof content !== 'string') return { ok: false, stage: 'validate', error: 'Le contenu doit être du texte.' };
  if (!directory) return { ok: false, stage: 'validate', error: 'Dossier Documents indisponible.' };
  const safeName = safeTextName(filename);
  if (!safeName) return { ok: false, stage: 'validate', error: 'Nom de fichier invalide. Utilise un nom simple sans chemin.' };
  const file = path.join(path.resolve(directory), safeName);
  try {
    await fs.mkdir(path.resolve(directory), { recursive: true });
    await fs.writeFile(file, content, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    return { ok: false, stage: 'write', error: error.code === 'EEXIST' ? `Le fichier ${safeName} existe déjà; il n’a pas été remplacé.` : error.message, file };
  }
  let verified;
  try { verified = await fs.readFile(file, 'utf8'); }
  catch (error) { return { ok: false, stage: 'verify', created: true, file, error: error.message }; }
  if (verified !== content) return { ok: false, stage: 'verify', created: true, file, error: 'Le contenu relu ne correspond pas au texte demandé.' };
  if (platform === 'darwin') {
    try {
      const opened = await openTextEdit(file);
      if (!opened?.ok) return { ok: false, stage: 'open', created: true, verified: true, file, error: opened?.error || 'TextEdit n’a pas confirmé l’ouverture du document.' };
    } catch (error) { return { ok: false, stage: 'open', created: true, verified: true, file, error: error.message }; }
  }
  return { ok: true, stage: 'complete', created: true, verified: true, opened: platform === 'darwin', file };
}

module.exports = { createTextDocument, safeTextName };
