'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStructuredMemory } = require('../src/main/structured-memory');
const { createPrivacyTools } = require('../src/main/privacy-tools');

function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'capri-privacy-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const memoryFile=path.join(dir,'memory.json'),bondFile=path.join(dir,'bond.json');
  let configValue={reminders:[],memoryRetentionDays:0,theme:'classic',apiKeys:{secret:'never export'}};
  let memory={history:[{role:'user',content:'hello'},{role:'assistant',content:'hi'}],claude:'private session'};let bond={notes:{facts:['likes cats'],likes:['tea'],dislikes:[],style:'',us:''}};
  const config={load:()=>configValue,save:(patch)=>{configValue={...configValue,...patch};},flush(){},reset(){configValue={};}};
  const structuredMemory=createStructuredMemory({file:path.join(dir,'structured-memory.json')});
  structuredMemory.add({content:'User fact',category:'fact',source:'user'});
  fs.writeFileSync(memoryFile,JSON.stringify(memory));fs.writeFileSync(bondFile,JSON.stringify(bond));
  const tools=createPrivacyTools({userData:dir,structuredMemory,config,readMemory:()=>memory,writeMemory:(patch)=>{memory={...memory,...patch};fs.writeFileSync(memoryFile,JSON.stringify(memory));},readBond:()=>bond,saveBond:(v)=>{bond=v;fs.writeFileSync(bondFile,JSON.stringify(v));},clearConversations:()=>{memory={history:[],claude:null};fs.writeFileSync(memoryFile,JSON.stringify(memory));},clearBond:()=>{bond=null;fs.writeFileSync(bondFile,'null');}});
  return {dir,tools,structuredMemory,getConfig:()=>configValue,getMemory:()=>memory};
}

test('vault import is local, selective, duplicate-aware and never overwrites existing documents', (t)=>{
  const f=fixture(t),vault=path.join(f.dir,'vault'),nested=path.join(vault,'folder');fs.mkdirSync(nested,{recursive:true});
  fs.writeFileSync(path.join(nested,'notes.md'),'# A note\n\nA local thought.');
  fs.writeFileSync(path.join(vault,'chat.md'),'---\ncapri-type: conversations\n---\n\nA private transcript.');
  const preview=f.tools.previewMarkdown(vault);assert.equal(preview.files.length,2);assert.ok(preview.files.some((item)=>item.name==='folder/notes.md'));
  const result=f.tools.importMarkdown({folder:vault,names:['folder/notes.md','chat.md']});
  assert.deepEqual({imported:result.imported,skipped:result.skipped},{imported:1,skipped:1});
  assert.equal(f.structuredMemory.list().filter((item)=>item.content==='A local thought.')[0].source,'markdown:folder/notes.md');
  assert.equal(f.tools.importMarkdown({folder:vault,names:['folder/notes.md']}).duplicates,1);
  const first=f.tools.exportToFolder(vault,['structured-memory']);const second=f.tools.exportToFolder(vault,['structured-memory']);
  assert.equal(first.overwritten,false);assert.notEqual(first.destination,second.destination);assert.ok(fs.existsSync(path.join(first.destination,'structured-memory.md')));
});

test('inventory reports provenance and category deletion verifies the stored result', (t)=>{
  const f=fixture(t);const inventory=f.tools.inventory();assert.equal(inventory.find((row)=>row.id==='structured-memory').count,1);assert.equal(inventory.find((row)=>row.id==='conversations').count,3);
  const conversationId=inventory.find((row)=>row.id==='conversations').entries[0].id;
  const first=f.tools.deleteEntry('conversations',conversationId);assert.ok(first.verified);assert.equal(f.getMemory().history.length,1);
  const structured=f.tools.clearCategory('structured-memory');assert.ok(structured.verified);assert.equal(f.structuredMemory.list().length,0);
});

test('individual deletion refuses a stale conversation reference', (t)=>{
  const f=fixture(t);const id=f.tools.inventory().find((row)=>row.id==='conversations').entries[0].id;
  f.getMemory().history[0].content='changed after the list was rendered';
  const result=f.tools.deleteEntry('conversations',id);
  assert.equal(result.ok,false);assert.equal(f.getMemory().history.length,2);
});

test('Markdown import skips a file whose contents changed after the preview', (t)=>{
  const f=fixture(t),vault=path.join(f.dir,'vault');fs.mkdirSync(vault);const file=path.join(vault,'note.md');fs.writeFileSync(file,'# Note\n\nSelected text');
  const preview=f.tools.previewMarkdown(vault);fs.writeFileSync(file,'# Note\n\nChanged after preview');
  const result=f.tools.importMarkdown({folder:vault,names:['note.md'],expectedFiles:preview.files});
  assert.equal(result.ok,false);assert.equal(result.imported,0);assert.match(result.errors[0].error,/a changé/);
});

test('exports only selected categories and strips stored credentials from preferences', (t)=>{
  const f=fixture(t);const vault=path.join(f.dir,'vault');fs.mkdirSync(vault);const result=f.tools.exportToFolder(vault,['preferences','conversations']);
  assert.equal(result.count,2);assert.ok(fs.existsSync(path.join(result.destination,'conversations.md')));
  const preferences=fs.readFileSync(path.join(result.destination,'preferences.md'),'utf8');assert.equal(preferences.includes('never export'),false);assert.equal(preferences.includes('apiKeys'),false);
  const conversations=fs.readFileSync(path.join(result.destination,'conversations.md'),'utf8');assert.match(conversations,/private session/);
});

test('retention deletes only dated structured entries beyond the chosen local policy', (t)=>{
  const f=fixture(t);const storeFile=path.join(f.dir,'structured-memory.json');const entries=JSON.parse(fs.readFileSync(storeFile,'utf8'));entries.entries.push({id:'old',category:'note',content:'old note',createdAt:new Date(Date.now()-40*86400000).toISOString()});fs.writeFileSync(storeFile,JSON.stringify(entries));
  const result=f.tools.setRetention(30);assert.equal(result.expired,1);assert.ok(result.verified);assert.equal(f.structuredMemory.list().length,1);assert.equal(f.getConfig().memoryRetentionDays,30);
});

test('full purge removes and verifies all contents within the user data directory', (t)=>{
  const f=fixture(t);fs.mkdirSync(path.join(f.dir,'sounds'),{recursive:true});fs.writeFileSync(path.join(f.dir,'sounds','mine.mp3'),'x');
  const result=f.tools.purgeAll();assert.ok(result.ok);assert.ok(result.verified);assert.deepEqual(fs.readdirSync(f.dir),[]);assert.ok(result.limitations.length);
});
