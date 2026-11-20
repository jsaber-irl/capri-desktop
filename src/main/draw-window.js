'use strict';
const fs = require('node:fs');
const path = require('node:path');
const PNG_SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10]);
const { devLog } = require('./logger');
function validateDrawing(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.strokes) || value.strokes.length > 5000 || Buffer.byteLength(JSON.stringify(value)) > 8 * 1024 * 1024) throw new Error('Dessin invalide ou trop volumineux.');
  let points=0;
  const strokes=value.strokes.map(stroke=>{if(!stroke||!Array.isArray(stroke.points)||stroke.points.length>50000)throw new Error('Tracé invalide.');points+=stroke.points.length;if(points>100000)throw new Error('Le dessin contient trop de points.');if(typeof stroke.color!=='string'||!/^#[0-9a-f]{6}$/i.test(stroke.color)||!Number.isFinite(stroke.size)||stroke.size<1||stroke.size>80)throw new Error('Style de tracé invalide.');const validatedPoints=stroke.points.map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)throw new Error('Point hors du canevas.');return{x:p.x,y:p.y};});return{color:stroke.color,size:stroke.size,erase:stroke.erase===true,points:validatedPoints};});
  return {version:1,strokes,updatedAt:typeof value.updatedAt==='string'?value.updatedAt:new Date().toISOString()};
}
function createDrawWindow({BrowserWindow,ipcMain,dialog,preload,userData,llm,config,nativeImage,onStarted,onRecognized,onFailed,protocolUrl='capri://app/src/renderer/draw.html',fsx=fs}){
  let win=null;let allowClose=false;let latest={version:1,strokes:[],updatedAt:new Date().toISOString()};let saving=Promise.resolve();const draft=path.join(userData,'drawings','autosave.json');
  const owns=(event)=>Boolean(win&&!win.isDestroyed()&&event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame);
  const show=()=>{if(!win||win.isDestroyed()){allowClose=false;win=new BrowserWindow({width:1000,height:760,minWidth:560,minHeight:420,title:'Capri // Tableau',frame:true,show:false,autoHideMenuBar:true,webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true}});win.once('ready-to-show',()=>win?.show());win.on('close',event=>{if(allowClose)return;event.preventDefault();win?.webContents.send('drawing:flush');});win.on('closed',()=>{win=null;});win.loadURL(protocolUrl);}else{win.show();win.focus();}};
  ipcMain.handle('drawing:load',event=>{if(!owns(event))return {ok:false,error:'Accès refusé.'};try{if(fsx.existsSync(draft))latest=validateDrawing(JSON.parse(fsx.readFileSync(draft,'utf8')));}catch{}return {ok:true,drawing:latest};});
  ipcMain.handle('drawing:start',async event=>{if(!owns(event))return {ok:false,error:'Accès refusé.'};try{await onStarted?.();return {ok:true};}catch(error){return {ok:false,error:String(error.message||error)};}});
  ipcMain.handle('drawing:autosave', async (event, drawing) => {
    if(!owns(event))return {ok:false,error:'Accès refusé.'};
    try { latest=validateDrawing(drawing);fsx.mkdirSync(path.dirname(draft),{recursive:true});const payload=JSON.stringify(latest);saving=saving.catch(()=>{}).then(()=>fsx.promises.writeFile(draft,payload,{mode:0o600}));await saving;return {ok:true}; }
    catch(error){return {ok:false,error:error.message};}
  });
  ipcMain.on('drawing:flush-complete', (event) => {
    if(!owns(event))return;
    saving.then(()=>{allowClose=true;win?.close();}).catch(()=>{});
  });
  ipcMain.handle('drawing:open',async event=>{if(!owns(event))return {ok:false,error:'Accès refusé.'};const result=await dialog.showOpenDialog(win,{title:'Ouvrir un dessin Capri',properties:['openFile'],filters:[{name:'Dessin Capri',extensions:['capridraw','json']}]});if(result.canceled||!result.filePaths[0])return {ok:false,canceled:true};try{if(fsx.statSync(result.filePaths[0]).size>8*1024*1024)throw new Error('Dessin trop volumineux (limite 8 Mo).');return {ok:true,drawing:validateDrawing(JSON.parse(fsx.readFileSync(result.filePaths[0],'utf8'))),path:result.filePaths[0]};}catch(error){return {ok:false,error:`Fichier de dessin invalide : ${error.message}`};}});
  ipcMain.handle('drawing:save',async(event,drawing)=>{if(!owns(event))return {ok:false,error:'Accès refusé.'};try{const doc=validateDrawing(drawing);const result=await dialog.showSaveDialog(win,{title:'Enregistrer le dessin Capri',defaultPath:'capri-drawing.capridraw',filters:[{name:'Dessin Capri',extensions:['capridraw']}]});if(result.canceled||!result.filePath)return {ok:false,canceled:true};await fsx.promises.writeFile(result.filePath,JSON.stringify(doc,null,2),{mode:0o600});latest=doc;return {ok:true,path:result.filePath};}catch(error){return {ok:false,error:error.message};}});
  ipcMain.handle('drawing:export-png',async(event,dataUrl)=>{if(!owns(event))return {ok:false,error:'Accès refusé.'};if(typeof dataUrl!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl)||dataUrl.length>70*1024*1024)return {ok:false,error:'Image PNG invalide ou trop volumineuse.'};const buffer=Buffer.from(dataUrl.slice(dataUrl.indexOf(',')+1),'base64');if(buffer.length<8||buffer.length>50*1024*1024||!buffer.subarray(0,8).equals(PNG_SIGNATURE))return {ok:false,error:'Signature PNG invalide.'};const result=await dialog.showSaveDialog(win,{title:'Exporter le tableau en PNG',defaultPath:'capri-drawing.png',filters:[{name:'PNG',extensions:['png']}]});if(result.canceled||!result.filePath)return {ok:false,canceled:true};try{await fsx.promises.writeFile(result.filePath,buffer,{mode:0o600});return {ok:true,path:result.filePath};}catch(error){return {ok:false,error:error.message};}});
  ipcMain.handle('drawing:identify', async (event, dataUrl) => {
    if (!owns(event)) return { ok: false, error: 'Accès refusé.' };
    if (typeof dataUrl !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 18 * 1024 * 1024) return { ok: false, error: 'Image PNG invalide ou trop volumineuse.' };
    try {
      if (!llm || !config || !nativeImage) throw new Error('L’analyse visuelle n’est pas disponible dans cette installation.');
      const buffer = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
      if (buffer.length < 24 || buffer.length > 12 * 1024 * 1024 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Image PNG invalide.');
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      if (!width || !height || width > 8192 || height > 8192 || width * height > 16_000_000) throw new Error('Les dimensions de l’image dépassent la limite autorisée.');
      const image = nativeImage.createFromBuffer(buffer);
      if (image.isEmpty()) throw new Error('Le tableau ne contient pas une image lisible.');
      // Le Renderer transmet uniquement le canvas du tableau blanc, jamais une capture d’écran.
      // Garde son ratio : une image étirée rend les traits difficiles à interpréter.
      const scale = Math.min(1, 1280 / width, 1280 / height);
      const jpeg = image.resize({ width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), quality: 'good' }).toJPEG(88);
      if (jpeg.length > 5 * 1024 * 1024) throw new Error('L’image redimensionnée reste trop volumineuse pour l’analyse.');
      const resized = jpeg.toString('base64');
      const cfg = config.load();
      devLog('[drawing:identify] demande envoyée au fournisseur vision', { provider: cfg.visionProvider || cfg.provider, selectedModel: cfg.visionModel || null, width, height, jpegBytes: jpeg.length });
      const prompt = cfg.lang === 'ru'
        ? 'Посмотри только на приложенное изображение доски. Что на нём нарисовано? Опиши конкретные видимые линии, формы и цвета; если рисунок узнаваем, назови его прямо. Не описывай интерфейс или саму доску и не говори, что она пустая, если на ней есть линии. Ответь одним коротким предложением по-русски, начиная естественно: «Я вижу, что ты нарисовал(а)…».'
        : cfg.lang === 'en'
          ? 'Look only at the attached whiteboard image. What do you see drawn on it? Describe the actual visible lines, shapes, and colors; name the subject directly when it is recognizable. Do not describe the interface or the board itself, and do not call it blank if marks are visible. Reply in one short English sentence, starting naturally with “I can see you drew…”.'
          : 'Regarde uniquement l’image du tableau blanc jointe. Que vois-tu dessiné ? Décris les traits, les formes et les couleurs réellement visibles ; nomme directement le sujet s’il est reconnaissable. Ne décris pas l’interface ni le tableau lui-même et ne dis pas qu’il est vide si des traits sont visibles. Réponds en une phrase courte en français, en commençant naturellement par « Je vois que tu as dessiné… ». ';
      const answer = await llm.see(cfg.visionProvider || cfg.provider, cfg, { image: resized, prompt, model: cfg.visionModel || null });
      const description = String(answer || '').trim().slice(0, 1200);
      if (!description) throw Object.assign(new Error('Le modèle vision a terminé sans fournir de description.'), { code: 'emptyvision' });
      devLog('[drawing:identify] analyse vision terminée', { provider: cfg.visionProvider || cfg.provider, characters: description.length });
      let sentToChat = false;
      try { sentToChat = Boolean(await onRecognized?.({ answer: description })); } catch (error) { devLog('[drawing:identify] transfert au chat impossible:', String(error.message || error).slice(0, 200)); }
      return { ok: true, answer: description, sentToChat };
    } catch (error) {
      const detail = String(error.message || error).slice(0, 300);
      devLog('[drawing:identify] échec:', { code: error.code || null, message: detail });
      try { await onFailed?.({ message: detail, code: error.code || null }); } catch (failure) { devLog('[drawing:identify] transfert de l’erreur impossible:', String(failure.message || failure).slice(0, 200)); }
      return { ok: false, error: `Analyse impossible : ${detail}`, handled: true };
    }
  });
  return {show,close:()=>win?.close(),isOpen:()=>Boolean(win&&!win.isDestroyed())};
}
module.exports={PNG_SIGNATURE,validateDrawing,createDrawWindow};
