import { useMemo, useState } from 'react';

type ThemeId='neon'|'fire'|'ice'|'royal'|'cyberpunk'|'anime'|'esport';
type SceneKind='vs'|'victory'|'defeat'|'gift'|'player'|'ranking'|'alert'|'transition';
type Preset={id:string;name:string;theme:ThemeId;scene:SceneKind;accent:string;secondary:string;background:string;text:string;subtext:string;left:string;right:string;scoreA:number;scoreB:number;logoLeft:string;logoRight:string;duration:number;animation:'pop'|'slide'|'fade';particles:'none'|'sparks'|'snow'|'stars'|'grid';};

type Props={previewOverlay:(payload:unknown)=>Promise<unknown>};

const themes:Record<ThemeId,{accent:string;secondary:string;background:string;animation:Preset['animation'];particles:Preset['particles']}>= {
  neon:{accent:'#8b7cff',secondary:'#ff5f8f',background:'linear-gradient(135deg,#090b14,#17122e)',animation:'pop',particles:'grid'},
  fire:{accent:'#ff5b2e',secondary:'#ffc857',background:'linear-gradient(135deg,#1b0704,#44120a)',animation:'slide',particles:'sparks'},
  ice:{accent:'#7ee8ff',secondary:'#b7c7ff',background:'linear-gradient(135deg,#06131a,#102c3d)',animation:'fade',particles:'snow'},
  royal:{accent:'#f2c14e',secondary:'#8b5cf6',background:'linear-gradient(135deg,#120d08,#24173d)',animation:'pop',particles:'stars'},
  cyberpunk:{accent:'#00e5ff',secondary:'#ff3df2',background:'linear-gradient(135deg,#02070c,#151026)',animation:'slide',particles:'grid'},
  anime:{accent:'#ff83c6',secondary:'#7c9cff',background:'linear-gradient(135deg,#1b1026,#2b1740)',animation:'pop',particles:'stars'},
  esport:{accent:'#39ff88',secondary:'#4d6bff',background:'linear-gradient(135deg,#06110c,#0c1738)',animation:'slide',particles:'grid'}
};

function inferTheme(prompt:string):ThemeId{
  const p=prompt.toLowerCase();
  if(/feu|flamme|rouge|fire/.test(p))return 'fire';
  if(/glace|ice|bleu|froid/.test(p))return 'ice';
  if(/royal|or|gold|couronne/.test(p))return 'royal';
  if(/cyber|futur|neon rose|néon rose/.test(p))return 'cyberpunk';
  if(/anime|manga/.test(p))return 'anime';
  if(/esport|compétition|competition/.test(p))return 'esport';
  return 'neon';
}

export default function OverlayAIStudio({previewOverlay}:Props){
  const [scene,setScene]=useState<SceneKind>('vs');
  const [theme,setTheme]=useState<ThemeId>('neon');
  const [accent,setAccent]=useState(themes.neon.accent);const [secondary,setSecondary]=useState(themes.neon.secondary);const [background,setBackground]=useState(themes.neon.background);
  const [text,setText]=useState('NEXORA BATTLE');const [subtext,setSubtext]=useState('Préparez-vous');const [left,setLeft]=useState('Joueur A');const [right,setRight]=useState('Joueur B');const [scoreA,setScoreA]=useState(0);const [scoreB,setScoreB]=useState(0);const [logoLeft,setLogoLeft]=useState('');const [logoRight,setLogoRight]=useState('');
  const [duration,setDuration]=useState(5000);const [animation,setAnimation]=useState<Preset['animation']>('pop');const [particles,setParticles]=useState<Preset['particles']>('grid');const [prompt,setPrompt]=useState('');const [presetName,setPresetName]=useState('Mon thème IA');
  const [presets,setPresets]=useState<Preset[]>(()=>{try{return JSON.parse(localStorage.getItem('nexora.overlayAI.presets.v1')||'[]')}catch{return []}});const [message,setMessage]=useState('');
  const previewStyle=useMemo(()=>({background,boxShadow:`0 0 60px ${accent}33`,borderColor:accent}),[background,accent]);
  function applyTheme(id:ThemeId){const t=themes[id];setTheme(id);setAccent(t.accent);setSecondary(t.secondary);setBackground(t.background);setAnimation(t.animation);setParticles(t.particles);}
  function generateFromAI(){const id=inferTheme(prompt);applyTheme(id);const p=prompt.trim();if(p){const name=p.match(/nom\s+([A-Z0-9_-]+)/i)?.[1];if(name)setText(name.toUpperCase());if(/victoire|victory/.test(p.toLowerCase()))setScene('victory');else if(/défaite|defeat/.test(p.toLowerCase()))setScene('defeat');else if(/cadeau|gift/.test(p.toLowerCase()))setScene('gift');else if(/classement|ranking/.test(p.toLowerCase()))setScene('ranking');else if(/transition/.test(p.toLowerCase()))setScene('transition');}setMessage(`Nouvelle variante générée à partir du thème ${id}. L’original n’a pas été écrasé.`);}
  function payload(){return {kind:'ai-overlay',template:'glass',scene,theme,title:text,text:subtext,left,right,scoreA,scoreB,logoLeft:logoLeft||undefined,logoRight:logoRight||undefined,accent,secondary,background,animation,particles,duration};}
  async function preview(){await previewOverlay(payload());setMessage('Aperçu envoyé à l’overlay OBS.');}
  function savePreset(){const item:Preset={id:crypto.randomUUID(),name:presetName.trim()||`Preset ${presets.length+1}`,theme,scene,accent,secondary,background,text,subtext,left,right,scoreA,scoreB,logoLeft,logoRight,duration,animation,particles};const next=[...presets,item];setPresets(next);localStorage.setItem('nexora.overlayAI.presets.v1',JSON.stringify(next));setMessage(`Preset « ${item.name} » sauvegardé.`)}
  function loadPreset(p:Preset){setTheme(p.theme);setScene(p.scene);setAccent(p.accent);setSecondary(p.secondary);setBackground(p.background);setText(p.text);setSubtext(p.subtext);setLeft(p.left);setRight(p.right);setScoreA(p.scoreA);setScoreB(p.scoreB);setLogoLeft(p.logoLeft);setLogoRight(p.logoRight);setDuration(p.duration);setAnimation(p.animation);setParticles(p.particles);setMessage(`Preset « ${p.name} » chargé.`)}
  function removePreset(id:string){const next=presets.filter(p=>p.id!==id);setPresets(next);localStorage.setItem('nexora.overlayAI.presets.v1',JSON.stringify(next));}
  return <div className="overlayAIStudio"><div className="feedHead"><div><h2>Studio Overlay IA</h2><p>Crée une variante d’overlay sans écraser l’original.</p></div><button onClick={preview}>Prévisualiser dans OBS</button></div><div className="overlayAIGrid"><div className="overlayAIControls"><label>Modèle d’animation<select value={scene} onChange={e=>setScene(e.target.value as SceneKind)}><option value="vs">VS</option><option value="victory">Victoire</option><option value="defeat">Défaite</option><option value="gift">Cadeau</option><option value="player">Entrée joueur</option><option value="ranking">Classement</option><option value="alert">Alerte</option><option value="transition">Transition</option></select></label><label>Thème<select value={theme} onChange={e=>applyTheme(e.target.value as ThemeId)}>{Object.keys(themes).map(t=><option key={t} value={t}>{t}</option>)}</select></label><label>Texte principal<input value={text} onChange={e=>setText(e.target.value)}/></label><label>Sous-texte<input value={subtext} onChange={e=>setSubtext(e.target.value)}/></label><label>Nom A<input value={left} onChange={e=>setLeft(e.target.value)}/></label><label>Nom B<input value={right} onChange={e=>setRight(e.target.value)}/></label><label>Score A<input type="number" value={scoreA} onChange={e=>setScoreA(Number(e.target.value)||0)}/></label><label>Score B<input type="number" value={scoreB} onChange={e=>setScoreB(Number(e.target.value)||0)}/></label><label>Logo A<input value={logoLeft} onChange={e=>setLogoLeft(e.target.value)} placeholder="URL/chemin"/></label><label>Logo B<input value={logoRight} onChange={e=>setLogoRight(e.target.value)} placeholder="URL/chemin"/></label><label>Couleur principale<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label><label>Couleur secondaire<input type="color" value={secondary} onChange={e=>setSecondary(e.target.value)}/></label><label>Animation<select value={animation} onChange={e=>setAnimation(e.target.value as Preset['animation'])}><option value="pop">Pop</option><option value="slide">Slide</option><option value="fade">Fade</option></select></label><label>Particules<select value={particles} onChange={e=>setParticles(e.target.value as Preset['particles'])}><option value="none">Aucune</option><option value="sparks">Étincelles</option><option value="snow">Neige</option><option value="stars">Étoiles</option><option value="grid">Grille</option></select></label><label>Durée<input type="number" min="1000" max="30000" step="500" value={duration} onChange={e=>setDuration(Number(e.target.value)||5000)}/></label></div><div className="overlayAIPreview" style={previewStyle}><small>{scene.toUpperCase()} · {theme.toUpperCase()}</small><b>{text}</b><span>{scene==='vs'?`${left}  ${scoreA} — ${scoreB}  ${right}`:subtext}</span><em>{animation} · {particles}</em></div></div><div className="overlayAIPrompt"><textarea rows={3} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Ex: fais-moi une intro rouge/noire futuriste avec flammes et le nom NEXORA"/><button onClick={generateFromAI}>Créer un thème avec l’IA</button></div><div className="packPresetBar"><input value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Nom du preset"/><button onClick={savePreset}>Sauvegarder le thème</button>{presets.map(p=><div className="packPresetChip" key={p.id}><button onClick={()=>loadPreset(p)}>{p.name}</button><button className="danger" onClick={()=>removePreset(p.id)}>×</button></div>)}</div>{message&&<div className="packExportMessage">{message}</div>}</div>;
}
