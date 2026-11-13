'use strict';
const api = window.dataTools;
const status = document.getElementById('status');
const inventory = document.getElementById('inventory');
const exportChoices = [
  ['structured-memory','Mémoires structurées'], ['conversations','Conversations (contenu personnel)'],
  ['bond','Mémoire de lien'], ['reminders','Rappels'], ['preferences','Préférences (sans clés secrètes ni chemins privés)'],
];
let folder = '';
document.getElementById('save-retention').addEventListener('click',async()=>{const result=await api.setRetention(document.getElementById('retention').value);say(result.ok?`Politique enregistrée. ${result.expired} entrée(s) expirée(s), suppression vérifiée : ${result.verified?'oui':'non'}.`:result.error);refresh();});
function say(message) { status.textContent = message; }
function checkbox(id, label, parent) {
  const wrap = document.createElement('label'); wrap.className='choice';
  const input = document.createElement('input'); input.type='checkbox'; input.value=id; input.checked=id==='structured-memory';
  wrap.append(input, document.createTextNode(` ${label}`)); parent.append(wrap); return input;
}
for (const [id,label] of exportChoices) checkbox(id,label,document.getElementById('export-choices'));
document.getElementById('export').addEventListener('click', async () => {
  const selected=[...document.querySelectorAll('#export-choices input:checked')].map((item)=>item.value);
  if (!selected.length) return say('Cochez au moins une catégorie.');
  if (!confirm(`Exporter vers un dossier choisi : ${selected.join(', ')} ? Ces informations ne seront envoyées à aucun fournisseur.`)) return;
  const result=await api.exportMarkdown(selected); say(result.ok ? `${result.count} fichier(s) créés dans ${result.destination}. Aucun fichier existant remplacé.` : result.canceled ? 'Export annulé.' : result.error);
});
const imports=document.getElementById('imports'); const importButton=document.getElementById('import');
document.getElementById('choose-vault').addEventListener('click', async () => {
  const result=await api.chooseVault(); if (!result.ok) return say(result.canceled?'Sélection annulée.':result.error);
  folder=result.folder; document.getElementById('vault-path').textContent=folder;
  imports.replaceChildren();
  if (!result.files.length) { imports.textContent='Aucun fichier Markdown au premier niveau de ce dossier.'; importButton.disabled=true; return; }
  for (const file of result.files) {
    const label=document.createElement('label'); label.className='file-row';
    const input=document.createElement('input'); input.type='checkbox'; input.value=file.name;
    const text=document.createElement('span'); text.textContent=`${file.name} · ${file.bytes} octets · ${new Date(file.modifiedAt).toLocaleString()}`;
    label.append(input,text); imports.append(label);
  }
  importButton.disabled=false; say(`${result.files.length} fichier(s) Markdown trouvés. Seuls les fichiers cochés seront lus.`);
});
importButton.addEventListener('click', async () => {
  const names=[...imports.querySelectorAll('input:checked')].map((item)=>item.value);
  if (!names.length) return say('Cochez au moins un fichier à importer.');
  if (!confirm(`Importer ${names.length} fichier(s) dans la mémoire structurée locale ? Le texte sera stocké dans Capri, sans appel IA.`)) return;
  const result=await api.importMarkdown(names); say(result.ok ? `${result.imported} entrée(s) importée(s), ${result.duplicates} doublon(s) ignoré(s), ${result.skipped} export(s) Capri d’autres catégories ignoré(s).` : `Import partiel : ${result.imported} entrée(s), erreurs : ${JSON.stringify(result.errors)}`); refresh();
});
async function refresh() {
  const result=await api.inventory(); if (!result.ok) return say(result.error||'Inventaire indisponible.');
  inventory.replaceChildren();
  document.getElementById('delete-categories').replaceChildren();
  for (const category of result.categories) {
    const row=document.createElement('article'); row.className='data-row';
    const title=document.createElement('strong'); title.textContent=`${category.label} · ${category.count}`;
    const details=document.createElement('div'); details.innerHTML='';
    const meta=document.createElement('p'); meta.className='meta';
    meta.textContent=`Source : ${category.source} · Créé/modifié : ${category.modifiedAt||'non renseigné'} · Stockage : ${category.storage} · Conservation : ${category.retention}`;
    details.append(meta);
    for(const entry of category.entries||[]) { const item=document.createElement('div');item.className='entry';const text=document.createElement('span');text.textContent=`${entry.role?`${entry.role} · `:''}${entry.content||entry.text||`${entry.createdAt||'Date non renseignée'} · ${entry.category||''}`}`;item.append(text);const facts=document.createElement('p');facts.className='meta';facts.textContent=`Source : ${entry.source||category.source} · Création : ${entry.createdAt||'non renseignée'} · Modification : ${entry.updatedAt||'non renseignée'} · ${entry.expiresAt?`Échéance : ${entry.expiresAt} · `:''}Fonction : ${entry.component||category.label} · Conservation : ${entry.retention||category.retention}`;item.append(facts);if(['conversations','structured-memory','bond','reminders'].includes(category.id)&&entry.id!==undefined&&entry.id!=='claude-session'){const remove=document.createElement('button');remove.className='danger';remove.textContent='Supprimer';remove.addEventListener('click',async()=>{if(!confirm('Supprimer cette entrée locale ?'))return;const result=await api.deleteEntry(category.id,entry.id);say(result.verified?'Entrée supprimée et vérifiée.':result.error||'Suppression non vérifiée.');refresh();});item.append(remove);}details.append(item); }
    row.append(title,details);
    if(['conversations','structured-memory','bond','reminders','preferences'].includes(category.id)) { const del=document.createElement('button');del.className='danger';del.textContent='Effacer';del.addEventListener('click',async()=>{if(!confirm(`Effacer toute la catégorie « ${category.label} » ?`))return;const cleared=await api.clearCategory(category.id);say(cleared.verified?`Données ${category.id} supprimées et vérifiées.`:cleared.error||'Suppression non vérifiée.');refresh();});row.append(del); }
    inventory.append(row);
  }
  document.getElementById('retention').value=String(result.categories.find((item)=>item.id==='structured-memory')?.retentionDays||0);
}
document.getElementById('purge').addEventListener('click',async()=>{
  if(!confirm('Purger tout le contenu local de Capri, y compris ses préférences, rappels, sons et composants téléchargés ? Capri redémarrera ensuite.'))return;
  const result=await api.purgeAll();say(result.ok&&result.verified?`Dossier local vidé et vérifié. Éléments supprimés : ${result.removed.join(', ')||'aucun'}. Limites : ${result.limitations.join(' ')} Capri redémarre…`:`Purge incomplète. Restants : ${result.remaining?.join(', ')||'inconnus'} · Erreurs : ${JSON.stringify(result.errors||[])}`);
});
refresh();
