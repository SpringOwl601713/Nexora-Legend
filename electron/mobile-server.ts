import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';

export type MobileDashboardSnapshot = {
  connected:boolean;
  roomId?:string|null;
  viewerCount:number;
  analytics:{events:number;comments:number;likes:number;gifts:number;follows:number;shares:number;viewersPeak:number;giftCoins:number};
  recentEvents:Array<{type:string;user:string;detail:string;timestamp:number}>;
};

type MobileServerOptions={
  port?:number;
  getSnapshot:()=>MobileDashboardSnapshot;
  previewOverlay:(payload:any)=>void;
  previewMatch:(scene:string,payload:any)=>void;
  connectTikTok?:(username:string)=>Promise<any>;
  disconnectTikTok?:()=>Promise<any>;
};

let server:http.Server|null=null;
let token='';
let currentPort=19191;

function localIpv4(){
  const nets=os.networkInterfaces();
  for(const list of Object.values(nets)) for(const n of list||[]) if(n.family==='IPv4'&&!n.internal) return n.address;
  return '127.0.0.1';
}
function json(res:http.ServerResponse,status:number,body:unknown){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body));}
function html(res:http.ServerResponse,body:string){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(body);}
function readBody(req:http.IncomingMessage){return new Promise<any>((resolve,reject)=>{let b='';req.on('data',c=>{b+=c;if(b.length>128*1024)reject(new Error('Payload too large'));});req.on('end',()=>{try{resolve(b?JSON.parse(b):{});}catch(e){reject(e);}});req.on('error',reject);});}
function allowed(req:http.IncomingMessage,url:URL){const q=url.searchParams.get('token')||'';const h=String(req.headers['x-nexora-mobile-token']||'');return !!token&&(q===token||h===token);}

const page=()=>`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Nexora Mobile</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;background:#070a11;color:#eef2ff}main{max-width:760px;margin:auto;padding:18px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:18px}.brand{font-weight:900;letter-spacing:.08em}.brand small{display:block;color:#8b7cff;font-size:10px;letter-spacing:.32em}.pill{padding:8px 12px;border:1px solid #28334a;border-radius:999px;color:#9ba6ba}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.card{background:#101520;border:1px solid #20283a;border-radius:14px;padding:16px}.stat strong{display:block;font-size:26px;margin-top:8px}.wide{grid-column:1/-1}.row{display:flex;gap:8px;flex-wrap:wrap}button,input{border-radius:10px;border:1px solid #2b354b;background:#0a0f18;color:#fff;padding:12px}button{background:#7567ff;border:0;font-weight:700}.danger{background:#3a2028;color:#ff9bad}input{flex:1;min-width:0}.events{display:grid;gap:8px;max-height:360px;overflow:auto}.event{padding:11px 12px;background:#0a0f18;border:1px solid #1d2636;border-radius:10px}.event b{font-size:13px}.event p{margin:4px 0 0;color:#8c97aa;font-size:13px}.sceneGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.sceneGrid button{background:#171d2a}.muted{color:#7f899e;font-size:12px}@media(max-width:520px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}.sceneGrid{grid-template-columns:1fr 1fr}.top{align-items:flex-start;flex-direction:column}}</style></head><body><main><div class="top"><div class="brand">NEXORA <small>MOBILE</small></div><div id="status" class="pill">Chargement…</div></div><section class="grid"><div class="card stat"><span>Spectateurs</span><strong id="viewers">0</strong></div><div class="card stat"><span>Gifts</span><strong id="gifts">0</strong></div><div class="card stat"><span>Likes</span><strong id="likes">0</strong></div><div class="card stat"><span>Événements</span><strong id="eventsCount">0</strong></div><div class="card wide"><h3>Contrôle TikTok</h3><div class="row"><input id="username" placeholder="@createur"><button onclick="connectLive()">Connecter</button><button class="danger" onclick="disconnectLive()">Déconnecter</button></div><p class="muted">Le PC reste le serveur principal. Le téléphone ne lance aucune commande système locale.</p></div><div class="card wide"><h3>Overlays rapides</h3><div class="row"><button onclick="preview('gift','🎁 Test cadeau')">Gift</button><button onclick="preview('follow','➕ Test follow')">Follow</button><button onclick="preview('comment','💬 Test commentaire')">Commentaire</button></div></div><div class="card wide"><h3>Nexora Arena</h3><div class="sceneGrid"><button onclick="scene('intro')">Intro</button><button onclick="scene('versus')">VS</button><button onclick="scene('score')">Score</button><button onclick="scene('mvp')">MVP</button><button onclick="scene('victory')">Victoire</button><button onclick="scene('outro')">Outro</button></div></div><div class="card wide"><h3>Événements récents</h3><div id="events" class="events"></div></div></section></main><script>
const token=new URLSearchParams(location.search).get('token')||'';const api=(path,opts={})=>fetch(path+(path.includes('?')?'&':'?')+'token='+encodeURIComponent(token),{...opts,headers:{'content-type':'application/json',...(opts.headers||{})}}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Erreur');return d});
async function refresh(){try{const s=await api('/api/snapshot');document.getElementById('status').textContent=s.connected?'● LIVE connecté':'● Hors ligne';document.getElementById('viewers').textContent=s.viewerCount||0;document.getElementById('gifts').textContent=s.analytics?.gifts||0;document.getElementById('likes').textContent=s.analytics?.likes||0;document.getElementById('eventsCount').textContent=s.analytics?.events||0;document.getElementById('events').innerHTML=(s.recentEvents||[]).map(e=>'<div class="event"><b>'+esc(e.user||e.type)+'</b><p>'+esc(e.detail||e.type)+'</p></div>').join('')||'<div class="muted">Aucun événement</div>';}catch(e){document.getElementById('status').textContent='Accès refusé';}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function preview(type,text){await api('/api/overlay',{method:'POST',body:JSON.stringify({type,text})})}async function scene(scene){await api('/api/match',{method:'POST',body:JSON.stringify({scene})})}async function connectLive(){const username=document.getElementById('username').value;await api('/api/connect',{method:'POST',body:JSON.stringify({username})});refresh()}async function disconnectLive(){await api('/api/disconnect',{method:'POST',body:'{}'});refresh()}refresh();setInterval(refresh,2000);
</script></body></html>`;

export async function startMobileDashboardServer(options:MobileServerOptions){
  if(server) return getMobileDashboardInfo();
  currentPort=Number(options.port||19191);
  token=crypto.randomBytes(18).toString('base64url');
  server=http.createServer(async(req,res)=>{
    const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
    if(url.pathname==='/'||url.pathname==='/mobile') return html(res,page());
    if(!allowed(req,url)) return json(res,401,{ok:false,error:'Accès mobile refusé'});
    if(req.method==='GET'&&url.pathname==='/api/snapshot') return json(res,200,options.getSnapshot());
    try{
      if(req.method==='POST'&&url.pathname==='/api/overlay'){const b=await readBody(req);options.previewOverlay({event:b.type||'mobile',title:'Nexora Mobile',text:String(b.text||'Aperçu mobile'),template:b.type==='gift'?'gift':b.type==='comment'?'chat':'neon'});return json(res,200,{ok:true});}
      if(req.method==='POST'&&url.pathname==='/api/match'){const b=await readBody(req);options.previewMatch(String(b.scene||'intro'),{left:'JOUEUR A',right:'JOUEUR B',scoreA:1,scoreB:0,name:'MVP',duration:5000});return json(res,200,{ok:true});}
      if(req.method==='POST'&&url.pathname==='/api/connect'){if(!options.connectTikTok)return json(res,403,{ok:false,error:'Connexion mobile désactivée'});const b=await readBody(req);return json(res,200,await options.connectTikTok(String(b.username||'')));}
      if(req.method==='POST'&&url.pathname==='/api/disconnect'){if(!options.disconnectTikTok)return json(res,403,{ok:false,error:'Déconnexion mobile désactivée'});return json(res,200,{ok:await options.disconnectTikTok()});}
    }catch(e:any){return json(res,400,{ok:false,error:e?.message||'Requête invalide'});}
    return json(res,404,{ok:false,error:'Not found'});
  });
  await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(currentPort,'0.0.0.0',()=>resolve());});
  return getMobileDashboardInfo();
}
export function getMobileDashboardInfo(){const ip=localIpv4();return {running:!!server,port:currentPort,url:`http://${ip}:${currentPort}/mobile?token=${encodeURIComponent(token)}`,token};}
export function stopMobileDashboardServer(){try{server?.close();}catch{}server=null;token='';}
