import { app, BrowserWindow, ipcMain, Notification, shell, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { WebcastPushConnection } from 'tiktok-live-connector';
import OBSWebSocket from 'obs-websocket-js';
import robot from 'robotjs';
import { registerAccessIpc, startRevocationWatch } from './access-ipc';
import { readAccessState } from './access';
import { startLocalAccessServer, stopLocalAccessServer } from './access-server-local';

let win: BrowserWindow | null = null;
let connection: WebcastPushConnection | null = null;
let overlayClients = new Set<http.ServerResponse>();
let overlayServer: http.Server | null = null;
let obs = new OBSWebSocket();
let obsConnected = false;
let stopRevocationWatch: (()=>void) | null = null;

const DATA_DIR = () => app.getPath('userData');
const filePath = (name:string) => path.join(DATA_DIR(), name);

type TriggerAction = 'notify'|'sound'|'overlay'|'tts'|'webhook'|'media'|'launch'|'hotkey'|'mouse'|'obs';
type Trigger = { id:string; eventType:'gift'|'comment'|'like'|'follow'|'share'; match:string; action:TriggerAction; actionValue:string; enabled:boolean };
type Profile = { id:string; name:string; triggers:Trigger[] };
type AppSettings = { activeProfileId:string; overlayPort:number; obsWsUrl?:string; obsPassword?:string };
type Analytics = { startedAt:number; events:number; comments:number; likes:number; gifts:number; follows:number; shares:number; viewersPeak:number; giftCoins:number; };
type MediaItem = { id:string; name:string; path:string; kind:'audio'|'video'|'image' };
type GameState = { wheel:string[]; giveaway:string[]; poll:{question:string;options:string[];votes:Record<string,number>}; };
type GiftItem = { id:string; name:string; diamonds:number; image?:string };
type OverlayTemplateId = 'neon'|'glass'|'minimal'|'gift'|'goal'|'chat';
type OverlayConfig = {template:OverlayTemplateId;accent:string;textColor:string;background:string;fontSize:number;duration:number;position:'top'|'center'|'bottom';animation:'pop'|'slide'|'fade';goalLabel:string;goalCurrent:number;goalTarget:number};

const defaultAnalytics = ():Analytics => ({startedAt:Date.now(),events:0,comments:0,likes:0,gifts:0,follows:0,shares:0,viewersPeak:0,giftCoins:0});
const defaultOverlayConfig = ():OverlayConfig => ({template:'neon',accent:'#8b7cff',textColor:'#ffffff',background:'rgba(10,13,20,.88)',fontSize:32,duration:5000,position:'center',animation:'pop',goalLabel:'Objectif',goalCurrent:35,goalTarget:100});
let analytics:Analytics = defaultAnalytics();

function readJson<T>(name:string, fallback:T):T { try { return JSON.parse(fs.readFileSync(filePath(name), 'utf8')); } catch { return fallback; } }
function writeJson(name:string, data:unknown){ fs.mkdirSync(DATA_DIR(), {recursive:true}); fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8'); }
function getSettings():AppSettings { return readJson('settings.json', {activeProfileId:'default', overlayPort:18181, obsWsUrl:'ws://127.0.0.1:4455', obsPassword:''}); }
function setSettings(settings:AppSettings){ writeJson('settings.json', settings); }
function getProfiles():Profile[] { const p=readJson<Profile[]>('profiles.json',[]); return p.length?p:[{id:'default',name:'Profil principal',triggers:[{id:'rose-demo',eventType:'gift',match:'Rose',action:'notify',actionValue:'🌹 {user} a envoyé une Rose !',enabled:true}]}]; }
function saveProfiles(p:Profile[]){ writeJson('profiles.json',p); }
function getMediaLibrary():MediaItem[]{ return readJson<MediaItem[]>('media.json', []); }
function saveMediaLibrary(i:MediaItem[]){ writeJson('media.json',i); }
function getGameState():GameState { return readJson('games.json',{wheel:['Rose','GG','Merci'],giveaway:[],poll:{question:'',options:['Oui','Non'],votes:{}}}); }
function saveGameState(s:GameState){ writeJson('games.json',s); }
function getGiftCatalog():GiftItem[]{ return readJson<GiftItem[]>('gifts.json',[]); }
function saveGiftCatalog(g:GiftItem[]){ writeJson('gifts.json',g); }
function getOverlayConfig():OverlayConfig { return {...defaultOverlayConfig(),...readJson<Partial<OverlayConfig>>('overlay-config.json',{})}; }
function saveOverlayConfig(c:OverlayConfig){ writeJson('overlay-config.json',c); }
function activeTriggers():Trigger[]{ const p=getProfiles(),s=getSettings(); return p.find(x=>x.id===s.activeProfileId)?.triggers||p[0]?.triggers||[]; }

function createWindow(){
  win=new BrowserWindow({width:1360,height:860,minWidth:980,minHeight:650,backgroundColor:'#080b12',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
  if(!app.isPackaged)win.loadURL('http://localhost:5173'); else win.loadFile(path.join(__dirname,'../dist/index.html'));
}

function startOverlayServer(){
  const port=getSettings().overlayPort||18181; overlayServer?.close();
  overlayServer=http.createServer((req,res)=>{
    if(req.url==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','Access-Control-Allow-Origin':'*'});res.write('\n');overlayClients.add(res);req.on('close',()=>overlayClients.delete(res));return;}
    if(req.url==='/'||req.url?.startsWith('/overlay')){
      const cfg=getOverlayConfig();
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      res.end(`<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;background:transparent;overflow:hidden;font-family:Segoe UI,Arial,sans-serif;color:${cfg.textColor}}
      .wrap{width:100vw;height:100vh;display:flex;justify-content:center;align-items:${cfg.position==='top'?'flex-start':cfg.position==='bottom'?'flex-end':'center'};padding:48px}
      .card{min-width:320px;max-width:900px;opacity:0;transition:.28s ease;background:${cfg.background};color:${cfg.textColor};border:1px solid ${cfg.accent};border-radius:22px;padding:24px 34px;font-size:${cfg.fontSize}px;box-shadow:0 20px 70px rgba(0,0,0,.45);backdrop-filter:blur(12px)}
      .template-neon{box-shadow:0 0 35px ${cfg.accent}55,0 20px 70px rgba(0,0,0,.45);text-shadow:0 0 18px ${cfg.accent}77}.template-glass{background:rgba(20,24,36,.55);border:1px solid rgba(255,255,255,.18)}.template-minimal{background:rgba(0,0,0,.45);border:0;border-radius:12px}.template-gift{border-width:2px}.template-chat{border-radius:14px;padding:18px 22px}.template-goal{padding:22px 28px}
      .anim-pop{transform:scale(.86)}.anim-slide{transform:translateY(28px)}.anim-fade{transform:none}.show{opacity:1!important;transform:none!important}
      .title{font-weight:800;font-size:.72em;opacity:.78;margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em}.message{font-weight:700;line-height:1.2}.meta{font-size:.52em;opacity:.72;margin-top:8px}.giftIcon{font-size:1.8em;margin-right:12px;vertical-align:middle}.goalBar{height:18px;border-radius:999px;background:#ffffff22;overflow:hidden;margin-top:14px}.goalFill{height:100%;background:${cfg.accent};width:0;transition:.4s ease}.goalNumbers{font-size:.55em;opacity:.75;margin-top:7px}img,video{max-width:70vw;max-height:70vh;border-radius:18px}
      </style></head><body><div class="wrap"><div id="c" class="card template-${cfg.template} anim-${cfg.animation}"></div></div><script>
      const c=document.getElementById('c');const es=new EventSource('/events');let t;
      function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
      es.onmessage=e=>{const p=JSON.parse(e.data);c.className='card template-${cfg.template} anim-${cfg.animation}';c.innerHTML='';
        if(p.kind==='image'){const i=document.createElement('img');i.src=p.value;c.appendChild(i)}
        else if(p.kind==='video'){const v=document.createElement('video');v.src=p.value;v.autoplay=true;v.controls=false;c.appendChild(v)}
        else if(p.kind==='goal'||'${cfg.template}'==='goal'){const cur=Number(p.current??${cfg.goalCurrent}),target=Math.max(1,Number(p.target??${cfg.goalTarget}));const pct=Math.max(0,Math.min(100,(cur/target)*100));c.innerHTML='<div class="title">'+esc(p.label||'${cfg.goalLabel}')+'</div><div class="message">'+esc(p.text||'Objectif en cours')+'</div><div class="goalBar"><div class="goalFill" style="width:'+pct+'%"></div></div><div class="goalNumbers">'+cur+' / '+target+'</div>'}
        else {const icon='${cfg.template}'==='gift'?'🎁 ':'';c.innerHTML='<div class="title">'+esc(p.title||p.event||'Nexora Légend')+'</div><div class="message">'+icon+esc(p.text||'')+'</div>'+(p.meta?'<div class="meta">'+esc(p.meta)+'</div>':'')}
        requestAnimationFrame(()=>c.classList.add('show'));clearTimeout(t);t=setTimeout(()=>c.classList.remove('show'),p.duration||${cfg.duration});
      };</script></body></html>`);return;}
    res.writeHead(404);res.end('Not found');
  });
  overlayServer.listen(port,'127.0.0.1');
}
function broadcastOverlay(payload:any){const d=`data: ${JSON.stringify(payload)}\n\n`;for(const c of overlayClients)c.write(d);}
function matchesTrigger(t:Trigger,eventType:string,detail:string){if(!t.enabled||t.eventType!==eventType)return false;const n=t.match.trim().toLowerCase();return !n||detail.toLowerCase().includes(n);}
function template(v:string,p:{type:string;user:string;detail:string}){return v.replaceAll('{user}',p.user).replaceAll('{detail}',p.detail).replaceAll('{event}',p.type);}

async function ensureObs(){
  if(obsConnected)return true;
  const s=getSettings();
  try{await obs.connect(s.obsWsUrl||'ws://127.0.0.1:4455',s.obsPassword||undefined);obsConnected=true;win?.webContents.send('obs:status',{connected:true});return true;}catch(e:any){obsConnected=false;win?.webContents.send('obs:status',{connected:false,error:e?.message||'OBS indisponible'});return false;}
}
async function runObsAction(value:string){
  if(!(await ensureObs()))return;
  const [action,...rest]=value.split(':'); const arg=rest.join(':');
  try{
    if(action==='scene'&&arg) await obs.call('SetCurrentProgramScene',{sceneName:arg});
    else if(action==='source-on'&&arg){const [sceneName,inputName]=arg.split('|'); const list=await obs.call('GetSceneItemList',{sceneName}); const item=list.sceneItems.find((x:any)=>x.sourceName===inputName); if(item)await obs.call('SetSceneItemEnabled',{sceneName,sceneItemId:(item as any).sceneItemId,sceneItemEnabled:true});}
    else if(action==='source-off'&&arg){const [sceneName,inputName]=arg.split('|'); const list=await obs.call('GetSceneItemList',{sceneName}); const item=list.sceneItems.find((x:any)=>x.sourceName===inputName); if(item)await obs.call('SetSceneItemEnabled',{sceneName,sceneItemId:(item as any).sceneItemId,sceneItemEnabled:false});}
    else if(action==='mute'&&arg) await obs.call('SetInputMute',{inputName:arg,inputMuted:true});
    else if(action==='unmute'&&arg) await obs.call('SetInputMute',{inputName:arg,inputMuted:false});
  }catch(e:any){win?.webContents.send('obs:status',{connected:true,error:e?.message});}
}
function runHotkey(value:string){const parts=value.toLowerCase().split('+').map(x=>x.trim()).filter(Boolean); if(!parts.length)return;const key=parts.pop()!; const mods=parts.map(m=>m==='ctrl'?'control':m==='win'?'command':m) as any[];try{robot.keyTap(key,mods);}catch{}}
function runMouse(value:string){const [action,a,b]=value.split(':');try{if(action==='click') robot.mouseClick((a as any)||'left',false);else if(action==='double') robot.mouseClick((a as any)||'left',true);else if(action==='move') robot.moveMouse(Number(a)||0,Number(b)||0);else if(action==='scroll') robot.scrollMouse(0,Number(a)||0);}catch{}}
function executeTrigger(t:Trigger,p:{type:string;user:string;detail:string;raw?:any}){const v=template(t.actionValue,p);if(t.action==='notify'){if(Notification.isSupported())new Notification({title:'Nexora Légend',body:v||`${p.user} · ${p.detail}`}).show();}else if(['sound','overlay','tts','media'].includes(t.action)){if(t.action==='overlay')broadcastOverlay({event:p.type,title:p.type,text:v||`${p.user} · ${p.detail}`,meta:p.user,duration:getOverlayConfig().duration});win?.webContents.send('trigger:action',{action:t.action,value:v,payload:p});}else if(t.action==='webhook'&&/^https?:\/\//i.test(v)){fetch(v,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)}).catch(()=>{});}else if(t.action==='launch'&&v){try{spawn(v,[],{detached:true,stdio:'ignore',shell:true}).unref();}catch{}}else if(t.action==='hotkey'&&v)runHotkey(v);else if(t.action==='mouse'&&v)runMouse(v);else if(t.action==='obs'&&v)void runObsAction(v);}
function updateGiftCatalog(raw:any){const name=raw?.giftName||raw?.extendedGiftInfo?.name; if(!name)return;const diamonds=Number(raw?.diamondCount||raw?.extendedGiftInfo?.diamond_count||0); const image=raw?.giftPictureUrl||raw?.extendedGiftInfo?.icon?.url_list?.[0];const list=getGiftCatalog(); const idx=list.findIndex(g=>g.name===name); const item={id:String(raw?.giftId||name),name,diamonds,image}; if(idx>=0)list[idx]={...list[idx],...item}; else list.push(item); saveGiftCatalog(list); win?.webContents.send('gifts:update',list);}
function pushEvent(type:string,user='',detail='',raw:any=null){const p={type,user,detail,raw,timestamp:Date.now()};win?.webContents.send('tiktok:event',p);analytics.events++;if(type==='comment')analytics.comments++;if(type==='like')analytics.likes+=Number(raw?.likeCount||1);if(type==='gift'){analytics.gifts+=Number(raw?.repeatCount||1);analytics.giftCoins+=Number(raw?.diamondCount||raw?.extendedGiftInfo?.diamond_count||0)*Number(raw?.repeatCount||1);updateGiftCatalog(raw);}if(type==='follow')analytics.follows++;if(type==='share')analytics.shares++;writeJson('analytics.json',analytics);win?.webContents.send('analytics:update',analytics);for(const t of activeTriggers())if(matchesTrigger(t,type,detail))executeTrigger(t,p);}

ipcMain.handle('profiles:get',async()=>({profiles:getProfiles(),settings:getSettings()}));
ipcMain.handle('profiles:save',async(_e,p:Profile[],s:AppSettings)=>{saveProfiles(p);setSettings(s);startOverlayServer();return true;});
ipcMain.handle('analytics:get',async()=>analytics);ipcMain.handle('analytics:reset',async()=>{analytics=defaultAnalytics();writeJson('analytics.json',analytics);return analytics;});
ipcMain.handle('overlay:url',async()=>`http://127.0.0.1:${getSettings().overlayPort||18181}/overlay`);
ipcMain.handle('overlay:test',async(_e,text:string)=>{const c=getOverlayConfig();broadcastOverlay({title:'Aperçu Nexora',text,meta:'Test overlay',duration:c.duration,current:c.goalCurrent,target:c.goalTarget,label:c.goalLabel});return true;});
ipcMain.handle('overlay:config:get',async()=>getOverlayConfig());
ipcMain.handle('overlay:config:save',async(_e,c:OverlayConfig)=>{const next={...defaultOverlayConfig(),...c};saveOverlayConfig(next);return next;});
ipcMain.handle('overlay:preview',async(_e,payload:any)=>{broadcastOverlay({...payload,duration:getOverlayConfig().duration});return true;});
ipcMain.handle('system:openExternal',async(_e,url:string)=>{if(/^https?:\/\//i.test(url))await shell.openExternal(url);return true;});ipcMain.handle('system:launch',async(_e,c:string)=>{if(c)spawn(c,[],{detached:true,stdio:'ignore',shell:true}).unref();return true;});
ipcMain.handle('system:hotkey',async(_e,v:string)=>{runHotkey(v);return true;});ipcMain.handle('system:mouse',async(_e,v:string)=>{runMouse(v);return true;});
ipcMain.handle('obs:connect',async()=>ensureObs());ipcMain.handle('obs:disconnect',async()=>{try{await obs.disconnect();}catch{}obsConnected=false;win?.webContents.send('obs:status',{connected:false});return true;});ipcMain.handle('obs:scenes',async()=>{if(!(await ensureObs()))return[];try{return (await obs.call('GetSceneList')).scenes.map((s:any)=>s.sceneName);}catch{return[];}});ipcMain.handle('obs:action',async(_e,v:string)=>{await runObsAction(v);return true;});
ipcMain.handle('media:list',async()=>getMediaLibrary());ipcMain.handle('media:add',async()=>{const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Médias',extensions:['mp3','wav','ogg','mp4','webm','png','jpg','jpeg','gif']}]});if(r.canceled||!r.filePaths[0])return null;const p=r.filePaths[0],ext=path.extname(p).toLowerCase();const kind:MediaItem['kind']=['.mp3','.wav','.ogg'].includes(ext)?'audio':['.mp4','.webm'].includes(ext)?'video':'image';const item={id:Date.now().toString(),name:path.basename(p),path:`file://${p.replace(/\\/g,'/')}`,kind};const items=[...getMediaLibrary(),item];saveMediaLibrary(items);return item;});ipcMain.handle('media:remove',async(_e,id:string)=>{const i=getMediaLibrary().filter(x=>x.id!==id);saveMediaLibrary(i);return i;});
ipcMain.handle('games:get',async()=>getGameState());ipcMain.handle('games:save',async(_e,s:GameState)=>{saveGameState(s);return true;});ipcMain.handle('games:wheelSpin',async()=>{const s=getGameState();return s.wheel.length?s.wheel[Math.floor(Math.random()*s.wheel.length)]:null;});ipcMain.handle('games:giveawayPick',async()=>{const s=getGameState();return s.giveaway.length?s.giveaway[Math.floor(Math.random()*s.giveaway.length)]:null;});
ipcMain.handle('gifts:list',async()=>getGiftCatalog());

ipcMain.handle('tiktok:connect',async(_e,username:string)=>{
  const access = readAccessState(); const normalized = username.trim().replace(/^@+/, '').toLowerCase();
  if(!access.allowed || !access.tiktok || access.tiktok !== normalized){return {ok:false,error:'Accès agence requis ou révoqué pour ce compte TikTok.'};}
  try{if(connection){try{connection.disconnect();}catch{}}analytics=defaultAnalytics();connection=new WebcastPushConnection(username,{processInitialData:false,enableExtendedGiftInfo:true,enableWebsocketUpgrade:true,requestPollingIntervalMs:1000});const state=await connection.connect();
    connection.on('chat',(d:any)=>pushEvent('comment',d?.uniqueId||d?.nickname||'Utilisateur',d?.comment||'',d));
    connection.on('gift',(d:any)=>{if(d?.giftType===1&&!d?.repeatEnd)return;const n=d?.giftName||d?.extendedGiftInfo?.name||'Cadeau',c=d?.repeatCount||1;pushEvent('gift',d?.uniqueId||d?.nickname||'Utilisateur',`${n} ×${c}`,d);});
    connection.on('like',(d:any)=>pushEvent('like',d?.uniqueId||d?.nickname||'Utilisateur',`+${d?.likeCount||1} like${(d?.likeCount||1)>1?'s':''}`,d));connection.on('follow',(d:any)=>pushEvent('follow',d?.uniqueId||d?.nickname||'Utilisateur','Nouvel abonnement',d));connection.on('share',(d:any)=>pushEvent('share',d?.uniqueId||d?.nickname||'Utilisateur','A partagé le live',d));connection.on('member',(d:any)=>pushEvent('member',d?.uniqueId||d?.nickname||'Utilisateur','A rejoint le live',d));connection.on('roomUser',(d:any)=>{const c=d?.viewerCount??0;analytics.viewersPeak=Math.max(analytics.viewersPeak,c);win?.webContents.send('tiktok:stats',{viewerCount:c});});connection.on('streamEnd',()=>win?.webContents.send('tiktok:status',{connected:false,reason:'stream-end'}));
    pushEvent('system',username,`Connecté à la room ${state?.roomId??''}`.trim(),state);win?.webContents.send('tiktok:status',{connected:true,roomId:state?.roomId??null});return {ok:true,roomId:state?.roomId??null};
  }catch(err:any){win?.webContents.send('tiktok:status',{connected:false,reason:err?.message||'connection-error'});return {ok:false,error:err?.message||'Impossible de se connecter au live.'};}
});
ipcMain.handle('tiktok:disconnect',async()=>{try{connection?.disconnect();connection=null;win?.webContents.send('tiktok:status',{connected:false,reason:'manual'});return true;}catch{return false;}});

app.whenReady().then(async()=>{analytics=readJson('analytics.json',defaultAnalytics());await startLocalAccessServer();registerAccessIpc(()=>win);stopRevocationWatch = startRevocationWatch(()=>win,async()=>{try{connection?.disconnect();}catch{}connection=null;win?.webContents.send('tiktok:status',{connected:false,reason:'access-revoked'});});startOverlayServer();createWindow();});
app.on('before-quit',()=>{stopRevocationWatch?.();stopLocalAccessServer();});
app.on('window-all-closed',()=>{overlayServer?.close();if(process.platform!=='darwin')app.quit();});
