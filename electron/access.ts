import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export type AccessState = {
  tiktok?: string;
  allowed: boolean;
  lastCheckedAt?: number;
  error?: string;
};

const stateFile = () => path.join(app.getPath('userData'), 'access-state.json');

export function normalizeTikTok(value:string){
  return value.trim().replace(/^@+/, '').toLowerCase();
}

export function getAccessServerUrl(){
  return process.env.NEXORA_ACCESS_URL || 'http://127.0.0.1:8787';
}

export function readAccessState():AccessState{
  try { return JSON.parse(fs.readFileSync(stateFile(),'utf8')); }
  catch { return {allowed:false}; }
}

export function writeAccessState(state:AccessState){
  fs.mkdirSync(path.dirname(stateFile()),{recursive:true});
  fs.writeFileSync(stateFile(),JSON.stringify(state,null,2),'utf8');
}

export async function checkAgencyAccess(tiktok:string):Promise<AccessState>{
  const normalized = normalizeTikTok(tiktok);
  if(!normalized) return {allowed:false,error:'@TikTok requis'};
  try{
    const res = await fetch(`${getAccessServerUrl()}/access/check`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({tiktok:normalized})
    });
    const data = await res.json().catch(()=>({}));
    const state:AccessState = {
      tiktok:normalized,
      allowed:res.ok && data?.allowed === true,
      lastCheckedAt:Date.now(),
      error:res.ok ? undefined : (data?.error || 'Accès agence refusé')
    };
    writeAccessState(state);
    return state;
  }catch(e:any){
    const state:AccessState = {tiktok:normalized,allowed:false,lastCheckedAt:Date.now(),error:e?.message || 'Serveur d’accès indisponible'};
    writeAccessState(state);
    return state;
  }
}

export async function founderLogin(password:string){
  const res = await fetch(`${getAccessServerUrl()}/founder/login`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.error || 'Connexion fondateur refusée');
  return data as {ok:true;token:string;expiresInSeconds:number;mustChangePassword?:boolean};
}

export async function changeFounderPassword(token:string,currentPassword:string,newPassword:string){
  const res = await fetch(`${getAccessServerUrl()}/founder/password`,{
    method:'POST',
    headers:{'content-type':'application/json',authorization:`Bearer ${token}`},
    body:JSON.stringify({currentPassword,newPassword})
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.error || 'Impossible de changer le mot de passe fondateur');
  return data as {ok:true};
}

export async function listMembers(token:string){
  const res = await fetch(`${getAccessServerUrl()}/members`,{headers:{authorization:`Bearer ${token}`}});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.error || 'Impossible de charger les membres');
  return data;
}

export async function enableMember(token:string,tiktok:string,note=''){
  const res = await fetch(`${getAccessServerUrl()}/members`,{
    method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({tiktok:normalizeTikTok(tiktok),note})
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.error || 'Impossible d’autoriser ce créateur');
  return data;
}

export async function revokeMember(token:string,tiktok:string){
  const normalized=normalizeTikTok(tiktok);
  const res = await fetch(`${getAccessServerUrl()}/members/${encodeURIComponent(normalized)}`,{
    method:'DELETE',headers:{authorization:`Bearer ${token}`}
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.error || 'Impossible de révoquer cet accès');
  return data;
}
