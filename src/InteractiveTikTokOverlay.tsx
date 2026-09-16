import { useMemo, useState } from 'react';

type Rule={id:string;label:string;match:string;seconds:number;icon:string};
type Props={previewOverlay:(payload:unknown)=>Promise<unknown>};

const defaults:Rule[]=[
  {id:'rose',label:'Rose',match:'Rose',seconds:3,icon:'🌹'},
  {id:'donut',label:'Donut',match:'Donut',seconds:90,icon:'🍩'},
  {id:'cap',label:'Cap',match:'Cap',seconds:300,icon:'🧢'},
  {id:'corgi',label:'Corgi',match:'Corgi',seconds:900,icon:'🐶'},
  {id:'sub',label:'Abonnement',match:'subscription',seconds:1800,icon:'⭐'}
];

export default function InteractiveTikTokOverlay({previewOverlay}:Props){
  const [title,setTitle]=useState('CHALLENGE TIMER');
  const [background,setBackground]=useState('linear-gradient(135deg,#ff8a8a,#ffd1dc)');
  const [backgroundMedia,setBackgroundMedia]=useState('');
  const [accent,setAccent]=useState('#ffffff');
  const [rules,setRules]=useState<Rule[]>(()=>{try{return JSON.parse(localStorage.getItem('nexora.interactiveOverlay.rules.v1')||'null')||defaults}catch{return defaults}});
  const [message,setMessage]=useState('');
  const previewStyle=useMemo(()=>({background,boxShadow:'0 20px 60px #0005'}),[background]);

  function patchRule(id:string,patch:Partial<Rule>){setRules(cur=>cur.map(r=>r.id===id?{...r,...patch}:r));}
  function addRule(){setRules(cur=>[...cur,{id:crypto.randomUUID(),label:'Nouveau',match:'',seconds:60,icon:'🎁'}]);}
  function removeRule(id:string){setRules(cur=>cur.filter(r=>r.id!==id));}
  function save(){localStorage.setItem('nexora.interactiveOverlay.rules.v1',JSON.stringify(rules));setMessage('Configuration interactive sauvegardée.');}
  async function preview(){await previewOverlay({kind:'interactive-timer-overlay',template:'glass',title,background,backgroundMedia:backgroundMedia||undefined,accent,rules});setMessage('Aperçu interactif envoyé à l’overlay OBS.');}

  return <section className="interactiveTikTokOverlay"><div className="feedHead"><div><h2>Overlay TikTok interactif</h2><p>Associe des cadeaux/événements à du temps ajouté ou retiré, avec un fond personnalisable.</p></div><div className="row"><button onClick={save}>Sauvegarder</button><button onClick={preview}>Prévisualiser dans OBS</button></div></div><div className="interactiveOverlayGrid"><div className="interactiveOverlayControls"><label>Titre<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Fond CSS sûr<input value={background} onChange={e=>setBackground(e.target.value)} placeholder="linear-gradient(...)"/></label><label>Image/vidéo de fond<input value={backgroundMedia} onChange={e=>setBackgroundMedia(e.target.value)} placeholder="URL/chemin local"/></label><label>Couleur texte<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label><button onClick={addRule}>+ Ajouter une règle</button></div><div className="interactiveOverlayPreview" style={previewStyle}><h3 style={{color:accent}}>{title}</h3><div className="interactiveRuleGrid">{rules.map(rule=><div className="interactiveRuleCard" key={rule.id}><span>{rule.icon}</span><b>{rule.seconds>=0?'+':''}{Math.abs(rule.seconds)>=60?`${Math.round(Math.abs(rule.seconds)/60)} MIN`:`${rule.seconds} SEC`}</b><small>{rule.label}</small></div>)}</div></div></div><div className="interactiveRulesEditor">{rules.map(rule=><div className="interactiveRuleEditor" key={rule.id}><input value={rule.icon} onChange={e=>patchRule(rule.id,{icon:e.target.value})}/><input value={rule.label} onChange={e=>patchRule(rule.id,{label:e.target.value})} placeholder="Nom"/><input value={rule.match} onChange={e=>patchRule(rule.id,{match:e.target.value})} placeholder="Nom cadeau / événement"/><input type="number" value={rule.seconds} onChange={e=>patchRule(rule.id,{seconds:Number(e.target.value)||0})}/><button className="danger" onClick={()=>removeRule(rule.id)}>Supprimer</button></div>)}</div>{message&&<div className="packExportMessage">{message}</div>}</section>;
}
