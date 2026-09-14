import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { WebcastPushConnection } from 'tiktok-live-connector';

let win: BrowserWindow | null = null;
let connection: WebcastPushConnection | null = null;
let overlayClients = new Set<http.ServerResponse>();
let overlayServer: http.Server | null = null;

const DATA_DIR = () => app.getPath('userData');
const filePath = (name:string) => path.join(DATA_DIR(), name);

type Trigger = {
  id: string;
  eventType: 'gift' | 'comment' | 'like' | 'follow' | 'share';
  match: string;
  action: 'notify' | 'sound' | 'overlay' | 'tts' | 'webhook' | 'media' | 'launch';
  actionValue: string;
  enabled: boolean;
};

type Profile = { id:string; name:string; triggers:Trigger[] };
type AppSettings = { activeProfileId:string; overlayPort:number };

type Analytics = {
  startedAt: number;
  events: number;
  comments: number;
  likes: number;
  gifts: number;
  follows: number;
  shares: number;
  viewersPeak: number;
  giftCoins: number;
};

const defaultAnalytics = ():Analytics => ({startedAt:Date.now(),events:0,comments:0,likes:0,gifts:0,follows:0,shares:0,viewersPeak:0,giftCoins:0});
let analytics:Analytics = defaultAnalytics();

function readJson<T>(name:string, fallback:T):T {
  try { return JSON.parse(fs.readFileSync(filePath(name), 'utf8')); } catch { return fallback; }
}
function writeJson(name:string, data:unknown){
  fs.mkdirSync(DATA_DIR(), {recursive:true});
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}
function getSettings():AppSettings { return readJson('settings.json', {activeProfileId:'default', overlayPort:18181}); }
function setSettings(settings:AppSettings){ writeJson('settings.json', settings); }
function getProfiles():Profile[] {
  const profiles = readJson<Profile[]>('profiles.json', []);
  if (profiles.length) return profiles;
  return [{id:'default', name:'Profil principal', triggers:[{id:'rose-demo',eventType:'gift',match:'Rose',action:'notify',actionValue:'🌹 {user} a envoyé une Rose !',enabled:true}]}];
}
function saveProfiles(profiles:Profile[]){ writeJson('profiles.json', profiles); }
function activeTriggers():Trigger[] {
  const profiles = getProfiles();
  const settings = getSettings();
  return profiles.find(p => p.id === settings.activeProfileId)?.triggers || profiles[0]?.triggers || [];
}

function createWindow(){
  win = new BrowserWindow({width:1360,height:860,minWidth:980,minHeight:650,backgroundColor:'#080b12',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
  if(!app.isPackaged) win.loadURL('http://localhost:5173');
  else win.loadFile(path.join(__dirname,'../dist/index.html'));
}

function startOverlayServer(){
  const port = getSettings().overlayPort || 18181;
  overlayServer?.close();
  overlayServer = http.createServer((req,res)=>{
    if (req.url === '/events') {
      res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','Access-Control-Allow-Origin':'*'});
      res.write('\n'); overlayClients.add(res); req.on('close',()=>overlayClients.delete(res)); return;
    }
    if (req.url === '/' || req.url === '/overlay') {
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
      res.end(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden;font-family:Segoe UI,sans-serif}.wrap{width:100vw;height:100vh;display:grid;place-items:center}.card{opacity:0;transform:scale(.9);transition:.25s;background:rgba(10,13,20,.88);color:#fff;border:1px solid rgba(130,110,255,.5);border-radius:22px;padding:24px 34px;font-size:32px;box-shadow:0 20px 70px rgba(0,0,0,.45)}.show{opacity:1;transform:scale(1)}</style></head><body><div class="wrap"><div id="c" class="card"></div></div><script>const c=document.getElementById('c');const es=new EventSource('/events');let t;es.onmessage=e=>{const p=JSON.parse(e.data);c.textContent=p.text||'';c.className='card show';clearTimeout(t);t=setTimeout(()=>c.className='card',p.duration||5000)}</script></body></html>`); return;
    }
    res.writeHead(404); res.end('Not found');
  });
  overlayServer.listen(port, '127.0.0.1');
}
function broadcastOverlay(text:string,duration=5000){
  const data = `data: ${JSON.stringify({text,duration})}\n\n`;
  for(const client of overlayClients) client.write(data);
}

function matchesTrigger(trigger: Trigger, eventType: string, detail: string) {
  if (!trigger.enabled || trigger.eventType !== eventType) return false;
  const needle = trigger.match.trim().toLowerCase();
  if (!needle) return true;
  return detail.toLowerCase().includes(needle);
}
function template(value:string,p:{type:string;user:string;detail:string}){
  return value.replaceAll('{user}',p.user).replaceAll('{detail}',p.detail).replaceAll('{event}',p.type);
}
function executeTrigger(trigger:Trigger,payload:{type:string;user:string;detail:string;raw?:any}){
  const value = template(trigger.actionValue,payload);
  if (trigger.action === 'notify') {
    if (Notification.isSupported()) new Notification({title:'Nexora Légend',body:value || `${payload.user} · ${payload.detail}`}).show();
  } else if (['sound','overlay','tts','media'].includes(trigger.action)) {
    if (trigger.action === 'overlay') broadcastOverlay(value || `${payload.user} · ${payload.detail}`);
    win?.webContents.send('trigger:action',{action:trigger.action,value,payload});
  } else if (trigger.action === 'webhook' && /^https?:\/\//i.test(value)) {
    fetch(value,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}).catch(()=>{});
  } else if (trigger.action === 'launch' && value) {
    try { spawn(value, [], {detached:true, stdio:'ignore', shell:true}).unref(); } catch {}
  }
}

function pushEvent(type:string,user='',detail='',raw:any=null){
  const payload={type,user,detail,raw,timestamp:Date.now()};
  win?.webContents.send('tiktok:event',payload);
  analytics.events++;
  if(type==='comment') analytics.comments++;
  if(type==='like') analytics.likes += Number(raw?.likeCount || 1);
  if(type==='gift') { analytics.gifts += Number(raw?.repeatCount || 1); analytics.giftCoins += Number(raw?.diamondCount || raw?.extendedGiftInfo?.diamond_count || 0) * Number(raw?.repeatCount || 1); }
  if(type==='follow') analytics.follows++;
  if(type==='share') analytics.shares++;
  writeJson('analytics.json', analytics);
  win?.webContents.send('analytics:update',analytics);
  for(const trigger of activeTriggers()) if(matchesTrigger(trigger,type,detail)) executeTrigger(trigger,payload);
}

ipcMain.handle('profiles:get', async()=>({profiles:getProfiles(),settings:getSettings()}));
ipcMain.handle('profiles:save', async(_e,profiles:Profile[],settings:AppSettings)=>{saveProfiles(profiles);setSettings(settings);startOverlayServer();return true;});
ipcMain.handle('analytics:get', async()=>analytics);
ipcMain.handle('analytics:reset', async()=>{analytics=defaultAnalytics();writeJson('analytics.json',analytics);return analytics;});
ipcMain.handle('overlay:url', async()=>`http://127.0.0.1:${getSettings().overlayPort || 18181}/overlay`);
ipcMain.handle('system:openExternal', async(_e,url:string)=>{if(/^https?:\/\//i.test(url)) await shell.openExternal(url); return true;});
ipcMain.handle('system:launch', async(_e,command:string)=>{if(command) spawn(command,[],{detached:true,stdio:'ignore',shell:true}).unref(); return true;});

ipcMain.handle('tiktok:connect', async (_event, username:string) => {
  try {
    if(connection) { try{connection.disconnect();}catch{} }
    analytics = defaultAnalytics();
    connection = new WebcastPushConnection(username,{processInitialData:false,enableExtendedGiftInfo:true,enableWebsocketUpgrade:true,requestPollingIntervalMs:1000});
    const state = await connection.connect();
    connection.on('chat',(d:any)=>pushEvent('comment',d?.uniqueId||d?.nickname||'Utilisateur',d?.comment||'',d));
    connection.on('gift',(d:any)=>{if(d?.giftType===1&&!d?.repeatEnd)return; const name=d?.giftName||d?.extendedGiftInfo?.name||'Cadeau'; const count=d?.repeatCount||1; pushEvent('gift',d?.uniqueId||d?.nickname||'Utilisateur',`${name} ×${count}`,d);});
    connection.on('like',(d:any)=>pushEvent('like',d?.uniqueId||d?.nickname||'Utilisateur',`+${d?.likeCount||1} like${(d?.likeCount||1)>1?'s':''}`,d));
    connection.on('follow',(d:any)=>pushEvent('follow',d?.uniqueId||d?.nickname||'Utilisateur','Nouvel abonnement',d));
    connection.on('share',(d:any)=>pushEvent('share',d?.uniqueId||d?.nickname||'Utilisateur','A partagé le live',d));
    connection.on('member',(d:any)=>pushEvent('member',d?.uniqueId||d?.nickname||'Utilisateur','A rejoint le live',d));
    connection.on('roomUser',(d:any)=>{const c=d?.viewerCount??0;analytics.viewersPeak=Math.max(analytics.viewersPeak,c);win?.webContents.send('tiktok:stats',{viewerCount:c});});
    connection.on('streamEnd',()=>win?.webContents.send('tiktok:status',{connected:false,reason:'stream-end'}));
    pushEvent('system',username,`Connecté à la room ${state?.roomId??''}`.trim(),state);
    win?.webContents.send('tiktok:status',{connected:true,roomId:state?.roomId??null});
    return {ok:true,roomId:state?.roomId??null};
  } catch(err:any){
    win?.webContents.send('tiktok:status',{connected:false,reason:err?.message||'connection-error'});
    return {ok:false,error:err?.message||'Impossible de se connecter au live.'};
  }
});
ipcMain.handle('tiktok:disconnect', async()=>{try{connection?.disconnect();connection=null;win?.webContents.send('tiktok:status',{connected:false,reason:'manual'});return true;}catch{return false;}});

app.whenReady().then(()=>{analytics=readJson('analytics.json',defaultAnalytics());startOverlayServer();createWindow();});
app.on('window-all-closed',()=>{overlayServer?.close();if(process.platform!=='darwin') app.quit();});
