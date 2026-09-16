import { useEffect, useState } from 'react';
import { freeLivePacks, type LivePackSceneId } from './livePacks';
import {
  loadLivePackObsMap,
  loadLivePackPresets,
  loadLivePackTriggerMap,
  makeLivePackPayload,
  saveLivePackObsMap,
  saveLivePackPresets,
  saveLivePackTriggerMap,
  type LivePackObsMap,
  type LivePackPreset,
  type LivePackTriggerMap
} from './livePackTools';

type Props={obsConnected:boolean;obsScenes:string[];refreshObsScenes:()=>Promise<void>};
const events:['gift'|'comment'|'like'|'follow'|'share',string][]=[['gift','Cadeau'],['comment','Commentaire'],['like','Like'],['follow','Follow'],['share','Partage']];
const sceneIds:LivePackSceneId[]=['intro','versus','background','score','mvp','victory','defeat','outro'];
const sceneLabels:Record<LivePackSceneId,string>={intro:'Intro',versus:'VS',background:'Fond',score:'Score',mvp:'MVP',victory:'Victoire',defeat:'Défaite',outro:'Outro'};

export default function LivePacksAdvanced({obsConnected,obsScenes,refreshObsScenes}:Props){
  const [packId,setPackId]=useState(freeLivePacks[0]?.id||'nexora-arena');
  const selected=freeLivePacks.find(p=>p.id===packId)||freeLivePacks[0];
  const [left,setLeft]=useState('Joueur A');const [right,setRight]=useState('Joueur B');const [scoreA,setScoreA]=useState(0);const [scoreB,setScoreB]=useState(0);const [mvp,setMvp]=useState('MVP');
  const [accent,setAccent]=useState(selected?.accent||'#8b7cff');const [secondary,setSecondary]=useState(selected?.secondary||'#ff5f8f');
  const [introText,setIntroText]=useState(selected?.name||'Nexora Arena');const [outroText,setOutroText]=useState('Merci d’avoir suivi');const [duration,setDuration]=useState(5000);
  const [logoLeft,setLogoLeft]=useState('');const [logoRight,setLogoRight]=useState('');const [format,setFormat]=useState<'webm'|'mp4'>('webm');
  const [presets,setPresets]=useState<LivePackPreset[]>(()=>loadLivePackPresets());const [presetName,setPresetName]=useState('Mon preset');
  const [triggerMap,setTriggerMap]=useState<LivePackTriggerMap>(()=>loadLivePackTriggerMap());const [obsMap,setObsMap]=useState<LivePackObsMap>(()=>loadLivePackObsMap());
  const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [sceneBusy,setSceneBusy]=useState<LivePackSceneId|null>(null);

  useEffect(()=>{const off=window.nexora.onTikTokEvent(event=>{const scene=triggerMap[event.type as keyof LivePackTriggerMap];if(scene)void runScene(scene,false);});return off;},[triggerMap,left,right,scoreA,scoreB,mvp,accent,secondary,introText,outroText,duration,logoLeft,logoRight,packId,obsMap]);

  function payload(extra:Record<string,unknown>={}){return {...makeLivePackPayload({left,right,scoreA,scoreB,mvp,accent,secondary,introText,outroText,duration,logoLeft:logoLeft||undefined,logoRight:logoRight||undefined,packId}),format,...extra};}
  async function runScene(scene:LivePackSceneId,setStatus=true){if(setStatus)setMessage('');await window.nexora.previewMatchScene(scene,payload());const obsScene=obsMap[scene];if(obsScene)await window.nexora.obsAction(`scene ${obsScene}`);if(setStatus)setMessage(`Aperçu ${sceneLabels[scene]} envoyé${obsScene?' + scène OBS synchronisée':''}.`);}
  async function exportScene(scene:LivePackSceneId){setSceneBusy(scene);setMessage('');try{const r=await window.nexora.exportMatchScene(scene,payload());if(r?.ok)setMessage(`Vidéo ${String(r.format||format).toUpperCase()} enregistrée : ${r.path}`);else if(!r?.canceled)setMessage(r?.error||'Export vidéo impossible.');}catch(e:any){setMessage(e?.message||'Export vidéo impossible.');}finally{setSceneBusy(null);}}
  async function exportPack(){setBusy(true);setMessage('');try{const r=await window.nexora.exportWholeMatchPack(payload());if(r?.ok)setMessage(`Pack ${format.toUpperCase()} exporté : ${Array.isArray(r.paths)?r.paths.length:8} scènes.`);else if(!r?.canceled)setMessage(r?.error||'Export du pack impossible.');}catch(e:any){setMessage(e?.message||'Export du pack impossible.');}finally{setBusy(false);}}
  function choosePack(id:string){setPackId(id);const p=freeLivePacks.find(x=>x.id===id);if(p){setAccent(p.accent);setSecondary(p.secondary);setIntroText(p.name);}}
  function addPreset(){const name=presetName.trim()||`Preset ${presets.length+1}`;const item:LivePackPreset={id:crypto.randomUUID(),name,packId,left,right,scoreA,scoreB,mvp,accent,secondary,introText,outroText,duration,logoLeft:logoLeft||undefined,logoRight:logoRight||undefined};const next=[...presets,item];setPresets(next);saveLivePackPresets(next);setMessage(`Preset « ${name} » enregistré.`);}
  function applyPreset(p:LivePackPreset){setPackId(p.packId);setLeft(p.left);setRight(p.right);setScoreA(p.scoreA);setScoreB(p.scoreB);setMvp(p.mvp);setAccent(p.accent);setSecondary(p.secondary);setIntroText(p.introText);setOutroText(p.outroText);setDuration(p.duration);setLogoLeft(p.logoLeft||'');setLogoRight(p.logoRight||'');setMessage(`Preset « ${p.name} » chargé.`);}
  function deletePreset(id:string){const next=presets.filter(p=>p.id!==id);setPresets(next);saveLivePackPresets(next);}
  function patchTrigger(event:keyof LivePackTriggerMap,scene:string){const next={...triggerMap};if(scene)next[event]=scene as LivePackSceneId;else delete next[event];setTriggerMap(next);saveLivePackTriggerMap(next);}
  function patchObs(scene:LivePackSceneId,name:string){const next={...obsMap};if(name)next[scene]=name;else delete next[scene];setObsMap(next);saveLivePackObsMap(next);}

  return <section className="card livePacksPanel"><div className="feedHead"><div><span className="freePackBadge">100% GRATUIT</span><h2>Packs Live avancés</h2><p>Personnalisation, aperçus, presets, exports WebM/MP4 et synchronisation OBS/TikTok.</p></div><div className="row"><button onClick={()=>window.nexora.stopMatchScene()}>Masquer la scène</button><button onClick={exportPack} disabled={busy}>{busy?'Export…':`Exporter tout (${format.toUpperCase()})`}</button></div></div>
  <div className="packControls"><label>Pack<select value={packId} onChange={e=>choosePack(e.target.value)}>{freeLivePacks.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Format<select value={format} onChange={e=>setFormat(e.target.value as 'webm'|'mp4')}><option value="webm">WebM</option><option value="mp4">MP4</option></select></label><label>Équipe A<input value={left} onChange={e=>setLeft(e.target.value)}/></label><label>Équipe B<input value={right} onChange={e=>setRight(e.target.value)}/></label><label>MVP<input value={mvp} onChange={e=>setMvp(e.target.value)}/></label><label>Score A<input type="number" min="0" value={scoreA} onChange={e=>setScoreA(Number(e.target.value)||0)}/></label><label>Score B<input type="number" min="0" value={scoreB} onChange={e=>setScoreB(Number(e.target.value)||0)}/></label><label>Couleur principale<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label><label>Couleur secondaire<input type="color" value={secondary} onChange={e=>setSecondary(e.target.value)}/></label><label>Durée (ms)<input type="number" min="1000" max="30000" step="500" value={duration} onChange={e=>setDuration(Number(e.target.value)||5000)}/></label><label>Texte intro<input value={introText} onChange={e=>setIntroText(e.target.value)}/></label><label>Texte outro<input value={outroText} onChange={e=>setOutroText(e.target.value)}/></label><label>Logo A<input value={logoLeft} onChange={e=>setLogoLeft(e.target.value)} placeholder="URL/chemin"/></label><label>Logo B<input value={logoRight} onChange={e=>setLogoRight(e.target.value)} placeholder="URL/chemin"/></label></div>
  <div className="livePackPreview" style={{background:`radial-gradient(circle at 30% 20%,${accent}44,transparent 35%),radial-gradient(circle at 75% 70%,${secondary}44,transparent 34%),linear-gradient(135deg,#090b14,#11172a 55%,#080a11)`}}><small>APERÇU DU PACK</small><b>{introText||selected?.name}</b><span>{left} <strong>{scoreA} — {scoreB}</strong> {right}</span><em>Cliquer une scène ci-dessous envoie aussi l’aperçu vers l’overlay OBS.</em></div>
  <div className="packPresetBar"><input value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Nom du preset"/><button onClick={addPreset}>+ Enregistrer preset</button>{presets.map(p=><div className="packPresetChip" key={p.id}><button onClick={()=>applyPreset(p)}>{p.name}</button><button className="danger" onClick={()=>deletePreset(p.id)}>×</button></div>)}</div>
  <div className="packAutomation"><div><h3>Triggers TikTok → scènes</h3>{events.map(([event,label])=><label key={event}>{label}<select value={triggerMap[event]||''} onChange={e=>patchTrigger(event,e.target.value)}><option value="">Aucun</option>{sceneIds.map(s=><option value={s} key={s}>{sceneLabels[s]}</option>)}</select></label>)}</div><div><div className="feedHead"><h3>Scènes → OBS</h3><button onClick={refreshObsScenes}>Rafraîchir OBS</button></div><small>{obsConnected?'OBS connecté':'OBS sera connecté au premier envoi si la configuration est valide.'}</small>{sceneIds.map(scene=><label key={scene}>{sceneLabels[scene]}<select value={obsMap[scene]||''} onChange={e=>patchObs(scene,e.target.value)}><option value="">Ne pas changer OBS</option>{obsScenes.map(name=><option value={name} key={name}>{name}</option>)}</select></label>)}</div></div>
  {message&&<div className="packExportMessage">{message}</div>}
  <div className="sceneGrid">{selected?.scenes.map(scene=><div className="sceneActions" key={scene.id}><button onClick={()=>runScene(scene.id)}><div className="sceneThumb" style={{background:`linear-gradient(135deg,${accent}55,${secondary}33)`}}><span>{sceneLabels[scene.id]}</span></div><b>{scene.name}</b><small>{scene.description}</small></button><button className="exportSceneButton" disabled={sceneBusy===scene.id} onClick={()=>exportScene(scene.id)}>{sceneBusy===scene.id?'Export…':`Télécharger .${format}`}</button></div>)}</div></section>;
}
