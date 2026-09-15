import type { LivePackSceneId } from './livePacks';

export type LivePackPreset={
  id:string;
  name:string;
  packId:string;
  left:string;
  right:string;
  scoreA:number;
  scoreB:number;
  mvp:string;
  accent:string;
  secondary:string;
  introText:string;
  outroText:string;
  duration:number;
  logoLeft?:string;
  logoRight?:string;
};

export type LivePackTriggerMap=Partial<Record<'gift'|'comment'|'like'|'follow'|'share',LivePackSceneId>>;

const PRESETS_KEY='nexora.livePack.presets.v1';
const TRIGGERS_KEY='nexora.livePack.triggers.v1';

export function loadLivePackPresets():LivePackPreset[]{
  try{const raw=localStorage.getItem(PRESETS_KEY);const parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed:[];}catch{return [];}
}

export function saveLivePackPresets(items:LivePackPreset[]){
  localStorage.setItem(PRESETS_KEY,JSON.stringify(items));
}

export function loadLivePackTriggerMap():LivePackTriggerMap{
  try{const raw=localStorage.getItem(TRIGGERS_KEY);const parsed=raw?JSON.parse(raw):{};return parsed&&typeof parsed==='object'?parsed:{};}catch{return {};}
}

export function saveLivePackTriggerMap(map:LivePackTriggerMap){
  localStorage.setItem(TRIGGERS_KEY,JSON.stringify(map));
}

export function makeLivePackPayload(input:{
  left:string;right:string;scoreA:number;scoreB:number;mvp:string;accent:string;secondary:string;
  introText:string;outroText:string;duration:number;logoLeft?:string;logoRight?:string;packId?:string;
}){
  return {...input,name:input.mvp};
}
