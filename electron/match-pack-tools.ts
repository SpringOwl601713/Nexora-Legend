import { dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { exportMatchSceneVideo } from './match-export';

type MatchScene='intro'|'versus'|'background'|'score'|'mvp'|'victory'|'defeat'|'outro';
type MatchPayload={left?:string;right?:string;scoreA?:number;scoreB?:number;name?:string;duration?:number;accent?:string;secondary?:string;introText?:string;outroText?:string;logoLeft?:string;logoRight?:string;packId?:string};
type ExportResult={ok:boolean;canceled?:boolean;paths?:string[];error?:string};

const scenes:MatchScene[]=['intro','versus','background','score','mvp','victory','defeat','outro'];

export async function exportWholeMatchPack(payload:MatchPayload={}):Promise<ExportResult>{
  const pick=await dialog.showOpenDialog({title:'Choisir le dossier d’export du pack',properties:['openDirectory','createDirectory']});
  if(pick.canceled||!pick.filePaths[0])return {ok:false,canceled:true};
  const dir=pick.filePaths[0];
  const paths:string[]=[];
  for(const scene of scenes){
    const target=path.join(dir,`nexora-${scene}.webm`);
    const r=await exportMatchSceneVideo(scene,{...payload,__targetPath:target} as MatchPayload & {__targetPath:string});
    if(!r.ok)return {ok:false,error:r.error||`Export impossible pour ${scene}`,paths};
    if(r.path)paths.push(r.path);
  }
  return {ok:true,paths};
}

export async function saveMatchPresetSnapshot(payload:MatchPayload):Promise<{ok:boolean;path?:string;canceled?:boolean;error?:string}>{
  const result=await dialog.showSaveDialog({title:'Sauvegarder le preset de match',defaultPath:'nexora-match-preset.json',filters:[{name:'Preset Nexora',extensions:['json']}]});
  if(result.canceled||!result.filePath)return {ok:false,canceled:true};
  try{fs.writeFileSync(result.filePath,JSON.stringify(payload,null,2),'utf8');return {ok:true,path:result.filePath};}
  catch(error:any){return {ok:false,error:error?.message||'Impossible de sauvegarder le preset.'};}
}
