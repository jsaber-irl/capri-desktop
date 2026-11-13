'use strict';
const fs = require('node:fs');
const path = require('node:path');
const PNG_SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10]);
function validateDrawing(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.strokes) || value.strokes.length > 5000 || Buffer.byteLength(JSON.stringify(value)) > 8 * 1024 * 1024) throw new Error('Dessin invalide ou trop volumineux.');
  let points=0;
  const strokes=value.strokes.map(stroke=>{if(!stroke||!Array.isArray(stroke.points)||stroke.points.length>50000)throw new Error('Tracé invalide.');points+=stroke.points.length;if(points>100000)throw new Error('Le dessin contient trop de points.');if(typeof stroke.color!=='string'||!/^#[0-9a-f]{6}$/i.test(stroke.color)||!Number.isFinite(stroke.size)||stroke.size<1||stroke.size>80)throw new Error('Style de tracé invalide.');const validatedPoints=stroke.points.map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)throw new Error('Point hors du canevas.');return{x:p.x,y:p.y};});return{color:stroke.color,size:stroke.size,erase:stroke.erase===true,points:validatedPoints};});
  return {version:1,strokes,updatedAt:typeof value.updatedAt==='string'?value.updatedAt:new Date().toISOString()};
}
function createDrawWindow({BrowserWindow,ipcMain,dialog,preload,userData,protocolUrl='capri://app/src/renderer/draw.html',fsx=fs}){
  let win=null;let allowClose=false;let latest={version:1,strokes:[],updatedAt:new Date().toISOString()};let saving=Promise.resolve();const draft=path.join(userData,'drawings','autosave.json');
  const owns=(event)=>Boolean(win&&!win.isDestroyed()&&event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame);
  const show=()=>{if(!win||win.isDestroyed()){allowClose=false;win=new BrowserWindow({width:1000,height:760,minWidth:560,minHeight:420,title:'Capri // Tableau',frame:true,show:false,autoHideMenuBar:true,webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true}});win.once('ready-to-show',()=>win?.show());win.on('close',event=>{if(allowClose)return;event.preventDefault();win?.webContents.send('drawing:flush');});win.on('closed',()=>{win=null;});win.loadURL(protocolUrl);}else{win.show();win.focus();}};
  ipcMain.handle('drawing:load',event=>{if(!owns(event))return {ok:false,error:'Accès refusé.'};try{if(fsx.existsSync(draft))latest=validateDrawing(JSON.parse(fsx.readFileSync(draft,'utf8')));}catch{}return {ok:true,drawing:latest};});
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
  return {show,close:()=>win?.close(),isOpen:()=>Boolean(win&&!win.isDestroyed())};
}
module.exports={PNG_SIGNATURE,validateDrawing,createDrawWindow};
