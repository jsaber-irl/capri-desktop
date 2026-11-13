'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const EXPORTABLE = new Set(['structured-memory', 'conversations', 'bond', 'reminders', 'preferences']);
const IMPORTABLE = new Set(['structured-memory']);
const MAX_IMPORT_FILES = 250;
const MAX_MARKDOWN_BYTES = 256 * 1024;
const MAX_MARKDOWN_DEPTH = 20;

function safeName(value) {
  return String(value || 'note').replace(/[^\p{L}\p{N}._ -]/gu, '_').replace(/[. ]+$/g, '').slice(0, 100) || 'note';
}
function digest(value) { return crypto.createHash('sha256').update(String(value ?? '')).digest('hex').slice(0, 16); }

function createPrivacyTools({ userData, structuredMemory, config, readMemory, writeMemory = () => {}, readBond, saveBond = () => {}, clearConversations, clearBond, onConversationsChanged = () => {}, onBondChanged = () => {}, fsx = fs }) {
  const known = {
    config: path.join(userData, 'config.json'),
    conversations: path.join(userData, 'memory.json'),
    bond: path.join(userData, 'bond.json'),
    structured: path.join(userData, 'structured-memory.json'),
  };
  const fileInfo = (file) => {
    try { const stat = fsx.statSync(file); return { path: file, exists: true, modifiedAt: stat.mtime.toISOString(), bytes: stat.size }; }
    catch { return { path: file, exists: false, modifiedAt: null, bytes: 0 }; }
  };
  const inventory = () => {
    const memories = structuredMemory.list();
    const memory = readMemory() || {};
    const history = Array.isArray(memory.history) ? memory.history : [];
    const bond = readBond() || {};
    const cfg = config.load();
    const reminders = Array.isArray(cfg.reminders) ? cfg.reminders : [];
    const safeConfig = Object.fromEntries(Object.entries(cfg).map(([key,value]) => [key,/(key|token|secret|password)/i.test(key)?'[masqué]':value]));
    const bondEntries = Object.entries(bond.notes||{}).flatMap(([kind,value])=>Array.isArray(value)?value.map((content,index)=>({id:`${kind}:${index}:${digest(content)}`,category:kind,content,component:'Bond notebook'})):value?[{id:`${kind}:0:${digest(value)}`,category:kind,content:value,component:'Bond notebook'}]:[]);
    if (bond.talks || bond.level || bond.days) bondEntries.push({content:JSON.stringify({talks:bond.talks||0,days:bond.days||0,level:bond.level||0,met:bond.met||null,style:bond.style||null,hours:bond.hours||null,tune:bond.tune||null},null,2),component:'Interaction statistics and learned preferences'});
    return [
      { id: 'conversations', label: 'Conversations', source: 'User conversations and assistant session', count: history.length + (memory.claude ? 1 : 0), entries: [...history.map((entry,index)=>({id:`${index}:${digest(JSON.stringify(entry))}`,content:entry.content,role:entry.role,createdAt:entry.createdAt||null,component:'Conversation'})), ...(memory.claude?[{id:'claude-session',content:JSON.stringify(memory.claude,null,2),role:'system',createdAt:null,component:'Claude session'}]:[])], storage: known.conversations, retention: 'Kept until manually deleted or the complete purge is requested.', ...fileInfo(known.conversations) },
      { id: 'structured-memory', label: 'Structured memories', source: 'User entries or imported Markdown', count: memories.length, entries: memories.map((entry) => ({ ...entry, component:'Structured memory', storage: known.structured, retention: retentionLabel(cfg.memoryRetentionDays) })), storage: known.structured, retention: retentionLabel(cfg.memoryRetentionDays), retentionDays: Number(cfg.memoryRetentionDays)||0, ...fileInfo(known.structured) },
      { id: 'bond', label: 'What Capri learned about you', source: 'Conversation-derived summaries and interaction statistics', count: bondEntries.length, entries: bondEntries, storage: known.bond, retention: 'Kept until manually deleted or learning is disabled.', ...fileInfo(known.bond) },
      { id: 'reminders', label: 'Reminders', source: 'User-created reminders', count: reminders.length, entries: reminders.map((item) => ({ id: item.id, text: item.text, createdAt: item.madeAt || null, expiresAt: item.at ? new Date(item.at).toISOString() : null, component: 'Reminders', storage: known.config })), storage: known.config, retention: 'Kept until reminder fires or is manually deleted.', ...fileInfo(known.config) },
      { id: 'preferences', label: 'Settings and preferences', source: 'User configuration (credential values masked)', count: Object.keys(cfg).length, entries: [{content:JSON.stringify(safeConfig,null,2),component:'Configuration'}], storage: known.config, retention: 'Kept until manually changed or the complete purge is requested.', ...fileInfo(known.config) },
    ];
  };
  const previewMarkdown = (folder) => {
    const root = fsx.realpathSync(folder);
    if (!fsx.statSync(root).isDirectory()) throw new Error('Le chemin choisi n’est pas un dossier.');
    const found = [];
    const walk = (directory, relative = '', depth = 0) => {
      if (depth > MAX_MARKDOWN_DEPTH) return;
      for (const entry of fsx.readdirSync(directory, { withFileTypes: true })) {
        if (found.length >= MAX_IMPORT_FILES) break;
        const name = relative ? path.join(relative, entry.name) : entry.name;
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory() && !entry.isSymbolicLink()) walk(fullPath, name, depth + 1);
        else if (entry.isFile() && /\.md$/i.test(entry.name)) found.push({ name: name.split(path.sep).join('/'), fullPath });
      }
    };
    walk(root);
    const files = found.map(({ name, fullPath }) => {
      const stat = fsx.statSync(fullPath);
      return { name, bytes: stat.size, modifiedAt: stat.mtime.toISOString() };
    });
    return { ok: true, folder: root, files };
  };
  const exportToFolder = (folder, selected = []) => {
    const root = fsx.realpathSync(folder);
    if (!fsx.statSync(root).isDirectory()) throw new Error('Le chemin choisi n’est pas un dossier.');
    const choices = [...new Set(selected)].filter((item) => EXPORTABLE.has(item));
    if (!choices.length) return { ok: false, error: 'Sélectionne au moins une catégorie à exporter.' };
    const entries = structuredMemory.list();
    const memory = readMemory() || {};
    const history = Array.isArray(memory.history) ? memory.history : [];
    const bond = readBond() || {};
    const cfg = config.load();
    const reminders = Array.isArray(cfg.reminders) ? cfg.reminders : [];
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stem = `Capri Export ${stamp}`;
    let outDir = path.join(root, stem);
    for (let suffix = 2; fsx.existsSync(outDir); suffix += 1) outDir = path.join(root, `${stem} (${suffix})`);
    fsx.mkdirSync(outDir, { recursive: false });
    const outputs = [];
    const write = (category, body) => {
      const file = path.join(outDir, `${safeName(category)}.md`);
      fsx.writeFileSync(file, body, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      outputs.push(file);
    };
    if (choices.includes('structured-memory')) write('structured-memory', `---\ncapri-type: structured-memory\nexported-at: ${stamp}\n---\n\n# Capri — Mémoire structurée\n\n${entries.map((entry) => `## ${entry.category} — ${entry.id}\n\nSource: ${entry.source || 'inconnue'}\nCréée: ${entry.createdAt || 'inconnue'}\nModifiée: ${entry.updatedAt || entry.createdAt || 'inconnue'}\n\n${entry.content}`).join('\n\n') || 'Aucune entrée.'}\n`);
    if (choices.includes('conversations')) write('conversations', `---\ncapri-type: conversations\nexported-at: ${stamp}\n---\n\n# Conversations sauvegardées\n\n${history.map((turn) => `## ${turn.role || 'message'}\n\n${String(turn.content || '').replace(/\r/g, '')}`).join('\n\n') || 'Aucune conversation sauvegardée.'}\n\n## Mémoire de session Claude Code\n\n${memory.claude ? JSON.stringify(memory.claude, null, 2) : 'Aucune session sauvegardée.'}\n`);
    if (choices.includes('bond')) write('bond', `---\ncapri-type: bond-memory\nexported-at: ${stamp}\n---\n\n# Ce que Capri a appris\n\n\`\`\`json\n${JSON.stringify(bond, null, 2)}\n\`\`\`\n`);
    if (choices.includes('reminders')) write('reminders', `---\ncapri-type: reminders\nexported-at: ${stamp}\n---\n\n# Rappels\n\n${reminders.map((item) => `- ${item.text || 'Rappel'} — ${item.at ? new Date(item.at).toISOString() : 'date indisponible'}${item.recurrence ? ` (répétition ${item.recurrence.unit})` : ''}`).join('\n') || 'Aucun rappel.'}\n`);
    if (choices.includes('preferences')) {
      const safe = { ...cfg };
      for (const key of Object.keys(safe)) if (/(keys?|token|secret|password|url|cwd|dir)$/i.test(key)) delete safe[key];
      write('preferences', `---\ncapri-type: preferences\nexported-at: ${stamp}\n---\n\n# Préférences (secrets et chemins privés exclus)\n\n\`\`\`json\n${JSON.stringify(safe, null, 2)}\n\`\`\`\n`);
    }
    return { ok: true, count: outputs.length, files: outputs, destination: outDir, overwritten: false };
  };
  const importMarkdown = ({ folder, names = [], expectedFiles = [] } = {}) => {
    const preview = previewMarkdown(folder);
    const selectedNames = new Set(names.filter((name) => typeof name === 'string' && name.length <= 260));
    const expectedByName = new Map(expectedFiles.filter((item) => item && typeof item.name === 'string').map((item) => [item.name, item]));
    const changed = [];
    const files = preview.files.filter((item) => {
      if (!selectedNames.has(item.name)) return false;
      const expected = expectedByName.get(item.name);
      if (expected && (expected.bytes !== item.bytes || expected.modifiedAt !== item.modifiedAt)) { changed.push(item.name); return false; }
      return true;
    });
    let imported = 0;
    let duplicates = 0;
    let skipped = 0;
    const errors = [];
    for (const item of files) {
      try {
        if (item.bytes > MAX_MARKDOWN_BYTES) throw new Error('Fichier trop volumineux (limite 256 Ko).');
        const fullPath = path.resolve(preview.folder, item.name);
        if (!fullPath.startsWith(`${preview.folder}${path.sep}`)) throw new Error('Chemin Markdown invalide.');
        let parent = preview.folder;
        for (const part of item.name.split('/')) {
          parent = path.join(parent, part);
          if (fsx.lstatSync(parent).isSymbolicLink()) throw new Error('Les liens symboliques sont ignorés pour protéger les autres fichiers.');
        }
        const resolved = fsx.realpathSync(fullPath);
        if (!resolved.startsWith(`${preview.folder}${path.sep}`) || !fsx.statSync(resolved).isFile()) throw new Error('Le fichier a quitté le dossier choisi.');
        const text = fsx.readFileSync(resolved, 'utf8');
        const exportType = text.match(/^capri-type:\s*([a-z-]+)/m)?.[1];
        if (exportType && exportType !== 'structured-memory') { skipped += 1; continue; }
        const plain = text.replace(/^---\s*\n[\s\S]*?\n---\s*\n/m, '').trim();
        const sections = [...plain.matchAll(/^##\s+(fact|preference|goal|note)(?:\s+—\s*([^\n]+))?\s*\n([\s\S]*?)(?=^##\s+|(?![\s\S]))/gim)];
        const contentList = sections.length
          ? sections.map((section) => ({ category: section[1].toLowerCase(), content: section[3].replace(/^- (?:Créée|Modifiée|Source)\s*:.*$/gim, '').trim() }))
          : [{ category: 'note', content: plain.replace(/^#\s+[^\n]+\n?/, '').trim() }];
        for (const entry of contentList) {
          if (!entry.content || structuredMemory.list().some((old) => old.content.toLowerCase() === entry.content.toLowerCase())) { duplicates += 1; continue; }
          const result = structuredMemory.add({ ...entry, source: `markdown:${item.name}` });
          if (result.ok) imported += 1;
        }
      } catch (error) { errors.push({ file: item.name, error: error.message }); }
    }
    if (changed.length) errors.push(...changed.map((file) => ({ file, error: 'Le fichier a changé depuis sa sélection; il a été ignoré.' })));
    return { ok: errors.length === 0, imported, duplicates, skipped, errors, selected: files.length };
  };
  const clearCategory = (category) => {
    if (category === 'conversations') {
      clearConversations();
      const ok = !(readMemory()?.history || []).length && !readMemory()?.claude;
      return { ok, category, verified: ok, location: known.conversations };
    }
    if (category === 'structured-memory') {
      const result = structuredMemory.clear();
      return { ok: result.ok, category, verified: result.ok && structuredMemory.list().length === 0, location: known.structured, removed: result.removed };
    }
    if (category === 'bond') {
      clearBond();
      const ok = !readBond();
      return { ok, category, verified: ok, location: known.bond };
    }
    if (category === 'reminders') {
      config.save({ reminders: [] }); config.flush();
      const ok = !config.load(true).reminders?.length;
      return { ok, category, verified: ok, location: known.config };
    }
    if (category === 'preferences') {
      config.reset();
      const current = config.load(true);
      const defaults = config.DEFAULTS || {};
      const verified = Object.keys(current).length === Object.keys(defaults).length && Object.entries(defaults).every(([key, value]) => JSON.stringify(current[key]) === JSON.stringify(value));
      return { ok: verified, category, verified, location: known.config };
    }
    return { ok: false, category, verified: false, error: 'Catégorie inconnue.' };
  };
  const deleteEntry = (category, id) => {
    if(category==='structured-memory') { const result=structuredMemory.remove(String(id));return {...result,category,verified:result.ok&&!structuredMemory.list().some((entry)=>entry.id===String(id))}; }
    if(category==='conversations') { const memory=readMemory()||{};const [indexText,expected]=String(id).split(':');const index=Number(indexText);const current=memory.history?.[index];if(!Number.isInteger(index)||index<0||!current||digest(JSON.stringify(current))!==expected)return {ok:false,error:'Cette entrée a changé. Actualisez la liste avant de la supprimer.'};const history=memory.history.filter((_,i)=>i!==index);writeMemory({history});onConversationsChanged();const verified=(readMemory()?.history||[]).length===history.length;return {ok:verified,verified,category}; }
    if(category==='reminders') { const cfg=config.load();const reminders=(cfg.reminders||[]).filter((entry)=>entry.id!==String(id));if(reminders.length===(cfg.reminders||[]).length)return {ok:false,error:'Rappel introuvable.'};config.save({reminders});config.flush();const verified=!(config.load(true).reminders||[]).some((entry)=>entry.id===String(id));return {ok:verified,verified,category}; }
    if(category==='bond') { const current=readBond()||{};const [kind,indexText,expected]=String(id).split(':');const index=Number(indexText);const list=current.notes?.[kind];if(Array.isArray(list)){if(!Number.isInteger(index)||!list[index]||digest(list[index])!==expected)return {ok:false,error:'Cette entrée a changé. Actualisez la liste avant de la supprimer.'};const notes={...current.notes,[kind]:list.filter((_,i)=>i!==index)};saveBond({...current,notes});onBondChanged();const check=readBond();const verified=!check?.notes?.[kind]?.includes(list[index]);return {ok:verified,verified,category};}if(typeof list==='string'&&index===0&&digest(list)===expected){const notes={...current.notes,[kind]:''};saveBond({...current,notes});onBondChanged();const verified=readBond()?.notes?.[kind]==='';return {ok:verified,verified,category};}return {ok:false,error:'Entrée introuvable.'}; }
    return {ok:false,error:'Suppression individuelle indisponible pour cette catégorie.'};
  };
  const applyRetention = () => {
    const days=Math.max(0,Math.min(3650,Number(config.load().memoryRetentionDays)||0));
    if(!days)return {ok:true,expired:0,policyDays:0,verified:true};
    const cutoff=Date.now()-days*86400000;let expired=0;
    for(const entry of structuredMemory.list())if(Number.isFinite(Date.parse(entry.createdAt))&&Date.parse(entry.createdAt)<cutoff){const result=structuredMemory.remove(entry.id);if(result.ok)expired++;}
    return {ok:true,expired,policyDays:days,verified:!structuredMemory.list().some((entry)=>Number.isFinite(Date.parse(entry.createdAt))&&Date.parse(entry.createdAt)<cutoff)};
  };
  const setRetention = (days) => {
    const value=Number(days);if(![0,30,90,365,730,3650].includes(value))return {ok:false,error:'Durée de conservation invalide.'};
    config.save({memoryRetentionDays:value});config.flush();return applyRetention();
  };
  const purgeAll = () => {
    const errors = [];
    try { clearConversations(); } catch (error) { errors.push({ path: known.conversations, error: error.message }); }
    try { clearBond(); } catch (error) { errors.push({ path: known.bond, error: error.message }); }
    try { structuredMemory.clear(); } catch (error) { errors.push({ path: known.structured, error: error.message }); }
    config.reset?.({ persist: false });
    const removed = [];
    for (const entry of fsx.readdirSync(userData, { withFileTypes: true })) {
      const target = path.join(userData, entry.name);
      try { fsx.rmSync(target, { recursive: true, force: false }); removed.push(entry.name); }
      catch (error) { errors.push({ path: target, error: error.message }); }
    }
    let remaining;
    try { remaining = fsx.readdirSync(userData); } catch (error) { remaining = ['<lecture impossible>'];errors.push({path:userData,error:error.message}); }
    return { ok: remaining.length === 0 && errors.length === 0, verified: remaining.length === 0, location: userData, removed, remaining, errors,
      limitations: ['Les sauvegardes du système d’exploitation, les volumes synchronisés externes et les données placées hors du dossier userData ne sont pas inspectés.'] };
  };
  return { inventory, previewMarkdown, exportToFolder, importMarkdown, clearCategory, deleteEntry, applyRetention, setRetention, purgeAll };
}

function retentionLabel(days) { return Number(days) > 0 ? `Suppression automatique après ${days} jour(s) pour les entrées datées; données sans date conservées jusqu’à suppression manuelle.` : 'Conservées jusqu’à suppression manuelle.'; }

module.exports = { EXPORTABLE: [...EXPORTABLE], IMPORTABLE: [...IMPORTABLE], createPrivacyTools, safeName };
