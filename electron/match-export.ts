import { BrowserWindow, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

type MatchScene='intro'|'versus'|'background'|'score'|'mvp'|'victory'|'defeat'|'outro';
type MatchPayload={left?:string;right?:string;scoreA?:number;scoreB?:number;name?:string;duration?:number};

type ExportResult={ok:boolean;canceled?:boolean;path?:string;error?:string};

const sceneLabel:Record<MatchScene,string>={intro:'intro',versus:'versus',background:'background',score:'score',mvp:'mvp',victory:'victory',defeat:'defeat',outro:'outro'};

function safeFileName(value:string){return value.replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'scene';}

function htmlForScene(scene:MatchScene,payload:MatchPayload){
  const data=JSON.stringify({scene,...payload}).replace(/</g,'\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#090b14;font-family:Segoe UI,Arial,sans-serif;color:white}.scene{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at 30% 20%,#8b7cff44,transparent 35%),radial-gradient(circle at 75% 70%,#ff5f8f44,transparent 34%),linear-gradient(135deg,#090b14,#11172a 55%,#080a11)}.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:54px 54px;animation:gridMove 12s linear infinite}.glow{position:absolute;width:38vw;height:38vw;border-radius:50%;filter:blur(80px);background:#8b7cff55;animation:float 6s ease-in-out infinite alternate}.content{position:relative;z-index:2;text-align:center;padding:50px}.kicker{font-size:22px;letter-spacing:.35em;text-transform:uppercase;opacity:.72}.hero{font-size:96px;font-weight:900;letter-spacing:.03em;text-transform:uppercase;text-shadow:0 0 42px #8b7cff88}.versus{display:grid;grid-template-columns:1fr auto 1fr;gap:48px;align-items:center}.player{padding:30px 46px;border:1px solid #ffffff25;border-radius:28px;background:#0b1020bb;min-width:330px}.player strong{display:block;font-size:46px}.vs{font-size:70px;font-weight:900;color:#8b7cff}.scoreline{font-size:110px;font-weight:900;letter-spacing:.06em}.mvpBadge{font-size:26px;letter-spacing:.3em;color:#8b7cff;font-weight:800}.mvpName{font-size:84px;font-weight:900}.victory .hero{color:#79ffc5}.defeat .hero{color:#ff8da4}@keyframes gridMove{to{background-position:54px 54px}}@keyframes float{to{transform:translate(14vw,-8vh) scale(1.25)}}
  </style></head><body><div id="scene" class="scene ${scene}"><div class="grid"></div><div class="glow"></div><div id="content" class="content"></div></div><script>
  const p=${data};const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const a=esc(p.left||'JOUEUR A'),b=esc(p.right||'JOUEUR B'),scoreA=Number(p.scoreA??0),scoreB=Number(p.scoreB??0),name=esc(p.name||p.left||'MVP');let h='';switch(p.scene){case'intro':h='<div class="kicker">Nexora Arena</div><div class="hero">MATCH LIVE</div><div class="kicker">Préparez-vous</div>';break;case'versus':h='<div class="versus"><div class="player"><span>Équipe A</span><strong>'+a+'</strong></div><div class="vs">VS</div><div class="player"><span>Équipe B</span><strong>'+b+'</strong></div></div>';break;case'background':h='<div class="kicker">Nexora Arena</div><div class="hero">LIVE</div>';break;case'score':h='<div class="kicker">Score en direct</div><div class="scoreline">'+scoreA+' — '+scoreB+'</div><div class="kicker">'+a+' · '+b+'</div>';break;case'mvp':h='<div class="mvpBadge">MVP</div><div class="mvpName">'+name+'</div><div class="kicker">Meilleur joueur / supporter</div>';break;case'victory':h='<div class="hero">VICTOIRE</div><div class="kicker">'+a+'</div>';break;case'defeat':h='<div class="hero">DÉFAITE</div><div class="kicker">On revient plus fort</div>';break;case'outro':h='<div class="kicker">Merci d’avoir suivi</div><div class="hero">À BIENTÔT</div><div class="kicker">Nexora Légend</div>';break;}document.getElementById('content').innerHTML=h;
  </script></body></html>`;
}

export async function exportMatchSceneVideo(scene:MatchScene,payload:MatchPayload={}):Promise<ExportResult>{
  const duration=Math.max(1000,Math.min(30000,Number(payload.duration)||5000));
  const result=await dialog.showSaveDialog({title:'Exporter la scène Nexora Arena',defaultPath:`nexora-arena-${safeFileName(sceneLabel[scene])}.webm`,filters:[{name:'Vidéo WebM',extensions:['webm']}]});
  if(result.canceled||!result.filePath)return {ok:false,canceled:true};
  const exportWindow=new BrowserWindow({width:1280,height:720,show:false,webPreferences:{offscreen:true,contextIsolation:true,nodeIntegration:false}});
  try{
    await exportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlForScene(scene,payload))}`);
    const stream=await exportWindow.webContents.executeJavaScript(`(async()=>{const stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:60},audio:false});const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});const chunks=[];rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};const done=new Promise(resolve=>rec.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:'video/webm'});resolve(Array.from(new Uint8Array(await blob.arrayBuffer())))});rec.start(100);setTimeout(()=>rec.stop(),${duration});return done;})()`);
    fs.writeFileSync(result.filePath,Buffer.from(stream));
    return {ok:true,path:result.filePath};
  }catch(error:any){
    try{if(fs.existsSync(result.filePath))fs.unlinkSync(result.filePath);}catch{}
    return {ok:false,error:error?.message||'Export vidéo impossible.'};
  }finally{
    exportWindow.destroy();
  }
}
