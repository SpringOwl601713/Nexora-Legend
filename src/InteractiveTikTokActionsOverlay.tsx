import { useMemo, useState } from 'react';

type ActionRule={id:string;label:string;match:string;action:string;icon:string;enabled:boolean};
type Props={previewOverlay:(payload:unknown)=>Promise<unknown>};

const defaults:ActionRule[]=[
  {id:'airport',label:'TP Aéroport',match:'Rose',action:'tp:airport',icon:'✈️',enabled:true},
  {id:'delete-vehicle',label:'Supprime véhicule',match:'Finger Heart',action:'vehicle:delete',icon:'🌹',enabled:true},
  {id:'return-vehicle',label:'Retour véhicule',match:'TikTok',action:'vehicle:return',icon:'↩️',enabled:true},
  {id:'black-hole',label:'Trou noir',match:'Doughnut',action:'effect:black-hole',icon:'🕳️',enabled:true},
  {id:'earthquake',label:'Séisme',match:'Cap',action:'effect:earthquake',icon:'🌎',enabled:true},
  {id:'sky-tp',label:'TP ciel',match:'Galaxy',action:'tp:sky',icon:'☁️',enabled:true},
  {id:'big-jump',label:'Big jump',match:'Corgi',action:'player:big-jump',icon:'⬆️',enabled:true},
  {id:'instant-death',label:'Mort instantanée',match:'Lion',action:'player:kill',icon:'💥',enabled:true},
  {id:'change-vehicle',label:'Change véhicule',match:'Roses',action:'vehicle:random',icon:'🚗',enabled:true},
  {id:'burn',label:'Je brûle',match:'Fire',action:'player:burn',icon:'🔥',enabled:true},
  {id:'wanted',label:'Recherche max',match:'Sunglasses',action:'wanted:max',icon:'🚨',enabled:true},
  {id:'prison',label:'Prison',match:'Bear',action:'player:prison',icon:'🔒',enabled:true},
  {id:'flip',label:'Flip',match:'Cat',action:'vehicle:flip',icon:'🔄',enabled:true},
  {id:'random-tp',label:'TP aléatoire',match:'Love',action:'tp:random',icon:'🎲',enabled:true},
  {id:'spawn-alien',label:'Spawn alien',match:'Planet',action:'spawn:alien',icon:'👽',enabled:true},
  {id:'spawn-monkey',label:'Spawn singe',match:'Diamond',action:'spawn:monkey',icon:'🐒',enabled:true}
];

export default function InteractiveTikTokActionsOverlay({previewOverlay}:Props){
  const [title,setTitle]=useState('ACTIONS LIVE');
  const [background,setBackground]=useState('linear-gradient(135deg,#11b6e8,#0b83d8)');
  const [backgroundMedia,setBackgroundMedia]=useState('');
  const [accent,setAccent]=useState('#ffffff');
  const [rules,setRules]=useState<ActionRule[]>(()=>{try{return JSON.parse(localStorage.getItem('nexora.interactiveActions.rules.v1')||'null')||defaults}catch{return defaults}});
  const [message,setMessage]=useState('');
  const previewStyle=useMemo(()=>({background,boxShadow:'0 20px 60px #0005'}),[background]);
  function patchRule(id:string,patch:Partial<ActionRule>){setRules(cur=>cur.map(r=>r.id===id?{...r,...patch}:r));}
  function addRule(){setRules(cur=>[...cur,{id:crypto.randomUUID(),label:'Nouvelle action',match:'',action:'custom:action',icon:'🎮',enabled:true}]);}
  function removeRule(id:string){setRules(cur=>cur.filter(r=>r.id!==id));}
  function save(){localStorage.setItem('nexora.interactiveActions.rules.v1',JSON.stringify(rules));setMessage('Profil d’actions sauvegardé.');}
  async function preview(){await previewOverlay({kind:'interactive-actions-overlay',template:'glass',title,background,backgroundMedia:backgroundMedia||undefined,accent,rules:rules.filter(r=>r.enabled)});setMessage('Aperçu des actions envoyé à l’overlay OBS.');}
  return <section className="interactiveActionsOverlay"><div className="feedHead"><div><h2>Overlay Actions TikTok</h2><p>Associe un cadeau/événement à une action de jeu, sans toucher aux autres overlays.</p></div><div className="row"><button onClick={save}>Sauvegarder</button><button onClick={preview}>Prévisualiser dans OBS</button></div></div><div className="interactiveOverlayGrid"><div className="interactiveOverlayControls"><label>Titre<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Fond CSS sûr<input value={background} onChange={e=>setBackground(e.target.value)} placeholder="linear-gradient(...)"/></label><label>Image/vidéo de fond<input value={backgroundMedia} onChange={e=>setBackgroundMedia(e.target.value)} placeholder="URL/chemin local"/></label><label>Couleur texte<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label><button onClick={addRule}>+ Ajouter une action</button></div><div className="interactiveOverlayPreview" style={previewStyle}><h3 style={{color:accent}}>{title}</h3><div className="interactiveRuleGrid">{rules.filter(r=>r.enabled).map(rule=><div className="interactiveRuleCard" key={rule.id}><span>{rule.icon}</span><b>{rule.label}</b><small>{rule.match||'Événement'}</small></div>)}</div></div></div><div className="interactiveRulesEditor">{rules.map(rule=><div className="interactiveRuleEditor actionRuleEditor" key={rule.id}><label><input type="checkbox" checked={rule.enabled} onChange={e=>patchRule(rule.id,{enabled:e.target.checked})}/> Actif</label><input value={rule.icon} onChange={e=>patchRule(rule.id,{icon:e.target.value})}/><input value={rule.label} onChange={e=>patchRule(rule.id,{label:e.target.value})} placeholder="Nom affiché"/><input value={rule.match} onChange={e=>patchRule(rule.id,{match:e.target.value})} placeholder="Cadeau / événement"/><input value={rule.action} onChange={e=>patchRule(rule.id,{action:e.target.value})} placeholder="Action interne"/><button className="danger" onClick={()=>removeRule(rule.id)}>Supprimer</button></div>)}</div>{message&&<div className="packExportMessage">{message}</div>}</section>;
}
