import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from 'electron';

type Member = { id:string; tiktok:string; enabled:boolean; createdAt:number; revokedAt?:number; note?:string };
type AuditEntry = { at:number; action:string; actor:string; target?:string; ip?:string };
type Store = { founderPasswordHash:string; founderPasswordTemporary?:boolean; members:Member[]; audit:AuditEntry[] };

const HOST='127.0.0.1';
const PORT=8787;
let server:http.Server|null=null;
let jwtSecret='';
let founderPassword='';
const dataFile=()=>path.join(app.getPath('userData'),'agency-access.json');
const secretFile=()=>path.join(app.getPath('userData'),'access-secrets.json');
function normalizeTikTok(v:string){return v.trim().replace(/^@+/,'').toLowerCase();}
function loadSecrets(){try{const s=JSON.parse(fs.readFileSync(secretFile(),'utf8'));jwtSecret=String(s.jwtSecret||'');founderPassword=String(s.founderPassword||'');}catch{}if(!jwtSecret||!founderPassword){jwtSecret=crypto.randomBytes(48).toString('hex');founderPassword=crypto.randomBytes(18).toString('base64url');fs.mkdirSync(path.dirname(secretFile()),{recursive:true});fs.writeFileSync(secretFile(),JSON.stringify({jwtSecret,founderPassword},null,2),'utf8');}}
function saveStore(s:Store){fs.mkdirSync(path.dirname(dataFile()),{recursive:true});fs.writeFileSync(dataFile(),JSON.stringify(s,null,2),'utf8');}
function loadStore():Store{try{const s=JSON.parse(fs.readFileSync(dataFile(),'utf8')) as Store;if(typeof s.founderPasswordTemporary!=='boolean')s.founderPasswordTemporary=true;return s;}catch{const s:Store={founderPasswordHash:bcrypt.hashSync(founderPassword,12),founderPasswordTemporary:true,members:[],audit:[]};saveStore(s);return s;}}
function json(res:http.ServerResponse,status:number,body:unknown){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-headers':'content-type, authorization','access-control-allow-methods':'GET,POST,DELETE,OPTIONS'});res.end(JSON.stringify(body));}
function readBody(req:http.IncomingMessage):Promise<any>{return new Promise((resolve,reject)=>{let body='';req.on('data',c=>{body+=c;if(body.length>131072)reject(new Error('Payload too large'));});req.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch(e){reject(e);}});req.on('error',reject);});}
function founder(req:http.IncomingMessage){try{const auth=req.headers.authorization||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';const p=jwt.verify(token,jwtSecret) as {role?:string};return p.role==='founder';}catch{return false;}}
function audit(s:Store,action:string,actor:string,target:string|undefined,req:http.IncomingMessage){s.audit.unshift({at:Date.now(),action,actor,target,ip:req.socket.remoteAddress});s.audit=s.audit.slice(0,1000);saveStore(s);}

export function startLocalAccessServer(){
  if(server)return;loadSecrets();
  server=http.createServer(async(req,res)=>{
    if(req.method==='OPTIONS')return json(res,204,{});
    const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);const store=loadStore();
    if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'nexora-access-local'});
    if(req.method==='POST'&&url.pathname==='/founder/login'){try{const body=await readBody(req);if(!bcrypt.compareSync(String(body.password||''),store.founderPasswordHash))return json(res,401,{ok:false,error:'Identifiants invalides'});const token=jwt.sign({role:'founder',sub:'founder'},jwtSecret,{expiresIn:'15m'});audit(store,'founder-login','founder',undefined,req);return json(res,200,{ok:true,token,expiresInSeconds:900,mustChangePassword:store.founderPasswordTemporary===true});}catch{return json(res,400,{ok:false,error:'Requête invalide'});}}
    if(req.method==='POST'&&url.pathname==='/founder/password'){if(!founder(req))return json(res,401,{ok:false,error:'Non autorisé'});try{const body=await readBody(req);const currentPassword=String(body.currentPassword||'');const newPassword=String(body.newPassword||'');if(!bcrypt.compareSync(currentPassword,store.founderPasswordHash))return json(res,401,{ok:false,error:'Mot de passe actuel incorrect'});if(newPassword.length<12)return json(res,400,{ok:false,error:'Le nouveau mot de passe doit contenir au moins 12 caractères'});if(bcrypt.compareSync(newPassword,store.founderPasswordHash))return json(res,400,{ok:false,error:'Choisis un nouveau mot de passe différent'});store.founderPasswordHash=bcrypt.hashSync(newPassword,12);store.founderPasswordTemporary=false;audit(store,'founder-password-changed','founder',undefined,req);return json(res,200,{ok:true});}catch{return json(res,400,{ok:false,error:'Requête invalide'});}}
    if(req.method==='GET'&&url.pathname==='/members'){if(!founder(req))return json(res,401,{ok:false,error:'Non autorisé'});if(store.founderPasswordTemporary)return json(res,403,{ok:false,error:'Change le mot de passe fondateur avant de gérer les membres'});return json(res,200,{ok:true,members:store.members,audit:store.audit.slice(0,100)});}
    if(req.method==='POST'&&url.pathname==='/members'){if(!founder(req))return json(res,401,{ok:false,error:'Non autorisé'});if(store.founderPasswordTemporary)return json(res,403,{ok:false,error:'Change le mot de passe fondateur avant de gérer les membres'});try{const body=await readBody(req);const tiktok=normalizeTikTok(String(body.tiktok||''));if(!tiktok)return json(res,400,{ok:false,error:'@TikTok requis'});let m=store.members.find(x=>x.tiktok===tiktok);if(m){m.enabled=true;m.revokedAt=undefined;m.note=String(body.note||m.note||'');}else{m={id:crypto.randomUUID(),tiktok,enabled:true,createdAt:Date.now(),note:String(body.note||'')};store.members.push(m);}audit(store,'member-enabled','founder',tiktok,req);return json(res,200,{ok:true,member:m});}catch{return json(res,400,{ok:false,error:'Requête invalide'});}}
    if(req.method==='DELETE'&&url.pathname.startsWith('/members/')){if(!founder(req))return json(res,401,{ok:false,error:'Non autorisé'});if(store.founderPasswordTemporary)return json(res,403,{ok:false,error:'Change le mot de passe fondateur avant de gérer les membres'});const tiktok=normalizeTikTok(decodeURIComponent(url.pathname.slice('/members/'.length)));const m=store.members.find(x=>x.tiktok===tiktok);if(!m)return json(res,404,{ok:false,error:'Créateur introuvable'});m.enabled=false;m.revokedAt=Date.now();audit(store,'member-revoked','founder',tiktok,req);return json(res,200,{ok:true,member:m});}
    if(req.method==='POST'&&url.pathname==='/access/check'){try{const body=await readBody(req);const tiktok=normalizeTikTok(String(body.tiktok||''));const m=store.members.find(x=>x.tiktok===tiktok);const allowed=!!m?.enabled;audit(store,allowed?'access-allowed':'access-denied',tiktok||'unknown',tiktok||undefined,req);return json(res,allowed?200:403,{ok:allowed,allowed,member:allowed?m:undefined,checkedAt:Date.now()});}catch{return json(res,400,{ok:false,allowed:false,error:'Requête invalide'});}}
    return json(res,404,{ok:false,error:'Not found'});
  });
  server.on('error',(e:any)=>{if(e?.code!=='EADDRINUSE')console.error('Nexora local access server error',e);});
  server.listen(PORT,HOST);
}
export function stopLocalAccessServer(){try{server?.close();}catch{}server=null;}
