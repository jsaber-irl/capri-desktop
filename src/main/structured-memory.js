'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CATEGORIES = new Set(['fact', 'preference', 'goal', 'note']);

function createStructuredMemory({ file }) {
  const read = () => {
    try {
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Array.isArray(value?.entries) ? value : { version: 1, entries: [] };
    } catch {
      return { version: 1, entries: [] };
    }
  };
  const write = (value) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2));
    fs.renameSync(temporary, file);
  };
  const list = (category = '') => read().entries.filter((entry) => !category || entry.category === category);
  const add = ({ content, category = 'note', source = 'user' } = {}) => {
    const text = String(content || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    if (!text || !CATEGORIES.has(category)) return { ok: false, error: 'Entrée mémoire invalide.' };
    const value = read();
    const now = new Date().toISOString();
    const entry = { id: crypto.randomUUID(), category, content: text, source: String(source || 'user').slice(0, 80), createdAt: now, updatedAt: now };
    value.entries.push(entry);
    write(value);
    return { ok: true, entry };
  };
  const remove = (id) => {
    const value = read();
    const entries = value.entries.filter((entry) => entry.id !== String(id));
    if (entries.length === value.entries.length) return { ok: false, error: 'Entrée mémoire introuvable.' };
    write({ ...value, entries });
    return { ok: true };
  };
  const clear = () => {
    const previous = read();
    write({ ...previous, entries: [] });
    return { ok: read().entries.length === 0, removed: previous.entries.length };
  };
  const exportMarkdown = (target) => {
    const entries = list();
    const body = ['# Capri — Mémoire structurée', '', '> ', ''];
    for (const entry of entries) body.push(`## ${entry.category} — ${entry.id}`, `- Créée : ${entry.createdAt}`, '', entry.content, '');
    fs.writeFileSync(target, `${body.join('\n').trim()}\n`, 'utf8');
    return { ok: true, count: entries.length, path: target };
  };
  const importMarkdown = (source) => {
    const text = fs.readFileSync(source, 'utf8');
    const sections = [...text.matchAll(/^##\s+(fact|preference|goal|note)(?:\s+—.*)?\s*$([\s\S]*?)(?=^##\s+|(?![\s\S]))/gim)];
    let count = 0;
    for (const section of sections) {
      const content = section[2].replace(/^- Créée\s*:.*$/gim, '').trim();
      if (content && add({ category: section[1].toLowerCase(), content, source: 'markdown-import' }).ok) count += 1;
    }
    return { ok: true, count };
  };
  return { list, add, remove, clear, exportMarkdown, importMarkdown };
}

module.exports = { CATEGORIES, createStructuredMemory };
