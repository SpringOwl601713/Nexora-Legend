import { useEffect, useMemo, useState } from 'react';
import './style.css';

type EventItem={type:string;user:string;detail:string;timestamp:number};
type ConnectResult={ok:boolean;roomId?:string|null;error?:string};
type Trigger={id:string;eventType:'gift'|'comment'|'like'|'follow'|'share';match:string;action:'notify'|'sound'|'overlay'|'tts'|'webhook'|'media'|'launch';actionValue:string;enabled:boolean};
type Profile={id:string;name:string;triggers:Trigger[]};
type Settings={activeProfileId:string;overlayPort:number};
type Analytics={startedAt:number;events:number;comments:number;likes:number;gifts:number;follows:number;shares:number;viewersPeak:number;giftCoins:number};
type TriggerAction={action:'sound'|'overlay'|'tts'|'media';value:string;payload:EventItem};
type Tab='dashboard'|'triggers'|'overlays'|'tts'|'actions'|'analytics'|'games';

const icons:Record<string,string>={comment:'💬',gift:'🎁',like:'❤️',follow:'➕',share:'↗️',member:'👋',system:'⚙️'};
const emptyAnalytics:Analytics={startedAt:Date.now(),events:0,comments:0,likes:0,gifts:0,follows:0,shares:0,viewersPeak:0,giftCoins:0};

export default function App(){
  const [username,setUsername]=useState('');
  const [connected,setConnected]=useState(false);
  const [connecting,setConnecting]=useState(false);
  const [error,setError]=useState('');
  const [roomId,setRoomId]=useState<string|null>(null);
  const [events,setEvents]=useState<EventItem[]>([]);
  const [viewerCount,setViewerCount]=useState(0);
  const [activeTab,setActiveTab]=useState<Tab>('dashboard');
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [settings,setSettings]=useState<Settings>({activeProfileId:'default',overlayPort:18181});
  const [overlayMessage,setOverlayMessage]=useState('');
  const [overlayUrl,setOverlayUrl]=useState('');
  const [analytics,setAnalytics]=useState<Analytics>(emptyAnalytics);
  const [ttsText,setTtsText]=useState('Bienvenue sur Nexora Légend');
  const [launchCommand,setLaunchCommand]=useState('');

  const activeProfile=profiles.find(p=>p.id===settings.activeProfileId)||profiles[0];
  const triggers=activeProfile?.triggers||[];

  useEffect(()=>{
    window.nexora.getProfiles().then(({profiles,settings})=>{setProfiles(profiles);setSettings(settings);});
    window.nexora.getOverlayUrl().then(setOverlayUrl);
    window.nexora.getAnalytics().then(setAnalytics);
    const offEvent=window.nexora.onTikTokEvent(event=>setEvents(cur=>[event,...cur].slice(0,500)));
    const offStatus=window.nexora.onTikTokStatus(status=>{setConnected(status.connected);if(!status.connected)setRoomId(null);if(status.roomId)setRoomId(String(status.roomId));});
    const offStats=window.nexora.onTikTokStats(stats=>{if(typeof stats.viewerCount==='number')setViewerCount(stats.viewerCount);});
    const offAction=window.nexora.onTriggerAction(runRendererAction);
    const offAnalytics=window.nexora.onAnalytics(data=>setAnalytics(data));
    return()=>{offEvent();offStatus();offStats();offAction();offAnalytics();};
  },[]);

  useEffect(()=>{if(profiles.length)window.nexora.saveProfiles(profiles,settings).then(()=>window.nexora.getOverlayUrl().then(setOverlayUrl));},[profiles,settings]);

  const totals=useMemo(()=>({comments:events.filter(e=>e.type==='comment').length,gifts:events.filter(e=>e.type==='gift').length,likes:events.filter(e=>e.type==='like').length}),[events]);

  function runRendererAction(action:TriggerAction){
    if(action.action==='tts'){const text=action.value||`${action.payload.user} ${action.payload.detail}`;speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(text));}
    if((action.action==='sound'||action.action==='media')&&action.value){const audio=new Audio(action.value);audio.play().catch(()=>{});}
    if(action.action==='overlay'){const text=action.value||`${action.payload.user} · ${action.payload.detail}`;setOverlayMessage(text);window.setTimeout(()=>setOverlayMessage(''),5000);}
  }

  async function connect(){if(!username.trim()||connecting)return;setConnecting(true);setError('');const r=await window.nexora.connectTikTok(username.replace('@','').trim());setConnecting(false);setConnected(r.ok);setRoomId(r.roomId?String(r.roomId):null);if(!r.ok)setError(r.error||'Connexion impossible. Vérifie que le compte est en LIVE.');}
  async function disconnect(){await window.nexora.disconnectTikTok();setConnected(false);setRoomId(null);}

  function patchActiveProfile(patch:(p:Profile)=>Profile){setProfiles(cur=>cur.map(p=>p.id===settings.activeProfileId?patch(p):p));}
  function addTrigger(){patchActiveProfile(p=>({...p,triggers:[...p.triggers,{id:crypto.randomUUID(),eventType:'gift',match:'',action:'notify',actionValue:'',enabled:true}]}));}
  function updateTrigger(id:string,patch:Partial<Trigger>){patchActiveProfile(p=>({...p,triggers:p.triggers.map(t=>t.id===id?{...t,...patch}:t)}));}
  function deleteTrigger(id:string){patchActiveProfile(p=>({...p,triggers:p.triggers.filter(t=>t.id!==id)}));}
  function addProfile(){const id=crypto.randomUUID();setProfiles(cur=>[...cur,{id,name:`Profil ${cur.length+1}`,triggers:[]}]);setSettings(s=>({...s,activeProfileId:id}));}
  function deleteProfile(){if(profiles.length<=1)return;const next=profiles.find(p=>p.id!==settings.activeProfileId)!;setProfiles(cur=>cur.filter(p=>p.id!==settings.activeProfileId));setSettings(s=>({...s,activeProfileId:next.id}));}
  function renameProfile(name:string){patchActiveProfile(p=>({...p,name}));}

  function testTts(){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(ttsText));}
  async function resetAnalytics(){setAnalytics(await window.nexora.resetAnalytics());}

  const nav=(tab:Tab,label:string)=><button className={activeTab===tab?'active':''} onClick={()=>setActiveTab(tab)}>{label}</button>;

  return <div className="app">
    {overlayMessage&&<div className="liveOverlay">{overlayMessage}</div>}
    <aside><div className="brand">NEXORA <b>LÉGEND</b></div><nav>
      {nav('dashboard','⌂ Tableau de bord')}{nav('triggers','⚡ Triggers')}{nav('overlays','▣ Overlays')}{nav('tts','🔊 TTS')}{nav('games','🎮 Mini-jeux')}{nav('actions','⌁ Actions')}{nav('analytics','▥ Analytics')}
    </nav></aside>
    <main>
      <header><div><h1>{({dashboard:'Tableau de bord',triggers:'Triggers',overlays:'Overlays OBS',tts:'Text-to-Speech',games:'Mini-jeux',actions:'Actions système',analytics:'Analytics'} as Record<Tab,string>)[activeTab]}</h1><p>Centre de contrôle de ton TikTok Live</p></div><span className={connected?'online':'offline'}>{connected?'● Connecté':'● Hors ligne'}</span></header>

      {activeTab==='dashboard'&&<>
        <section className="connect card"><div><h2>Connexion TikTok Live</h2><p>Entre le nom d'utilisateur du créateur actuellement en LIVE.</p>{roomId&&<small>Room ID : {roomId}</small>}</div><div className="row"><input value={username} disabled={connecting||connected} onChange={e=>setUsername(e.target.value)} placeholder="@utilisateur" onKeyDown={e=>e.key==='Enter'&&connect()}/>{!connected?<button onClick={connect} disabled={connecting}>{connecting?'Connexion…':'Connexion'}</button>:<button className="danger" onClick={disconnect}>Déconnexion</button>}</div>{error&&<div className="error">{error}</div>}</section>
        <section className="stats"><div className="card"><small>ÉVÉNEMENTS</small><strong>{events.length}</strong></div><div className="card"><small>SPECTATEURS</small><strong>{viewerCount}</strong></div><div className="card"><small>GIFTS</small><strong>{analytics.gifts}</strong></div><div className="card"><small>LIKES</small><strong>{analytics.likes}</strong></div></section>
        <section className="card feed"><div className="feedHead"><h2>Événements en direct</h2><span>{totals.comments} commentaire{totals.comments>1?'s':''}</span></div>{events.length===0?<div className="empty">Les commentaires, cadeaux, likes, follows et partages apparaîtront ici.</div>:<div className="eventList">{events.map((e,i)=><div className={`event event-${e.type}`} key={`${e.timestamp}-${i}`}><div className="eventIcon">{icons[e.type]||'•'}</div><div><b>{e.user||'TikTok'}</b><p>{e.detail||e.type}</p></div><time>{new Date(e.timestamp).toLocaleTimeString('fr-FR')}</time></div>)}</div>}</section>
      </>}

      {activeTab==='triggers'&&<section className="card triggerPanel"><div className="profileBar"><select value={settings.activeProfileId} onChange={e=>setSettings(s=>({...s,activeProfileId:e.target.value}))}>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><input value={activeProfile?.name||''} onChange={e=>renameProfile(e.target.value)} placeholder="Nom du profil"/><button onClick={addProfile}>+ Profil</button><button className="danger" onClick={deleteProfile}>Supprimer profil</button></div><div className="feedHead"><div><h2>Moteur de triggers</h2><p>Chaque profil garde ses propres automatisations.</p></div><button onClick={addTrigger}>+ Nouveau trigger</button></div><div className="triggerList">{triggers.map(trigger=><div className="trigger" key={trigger.id}><label><input type="checkbox" checked={trigger.enabled} onChange={e=>updateTrigger(trigger.id,{enabled:e.target.checked})}/> Actif</label><select value={trigger.eventType} onChange={e=>updateTrigger(trigger.id,{eventType:e.target.value as Trigger['eventType']})}><option value="gift">Cadeau</option><option value="comment">Commentaire</option><option value="like">Like</option><option value="follow">Follow</option><option value="share">Partage</option></select><input value={trigger.match} onChange={e=>updateTrigger(trigger.id,{match:e.target.value})} placeholder="Rose, !boom, 100 likes…"/><select value={trigger.action} onChange={e=>updateTrigger(trigger.id,{action:e.target.value as Trigger['action']})}><option value="notify">Notification</option><option value="sound">Son</option><option value="overlay">Overlay OBS</option><option value="tts">TTS</option><option value="webhook">Webhook</option><option value="media">Média</option><option value="launch">Lancer programme</option></select><input value={trigger.actionValue} onChange={e=>updateTrigger(trigger.id,{actionValue:e.target.value})} placeholder="Texte, URL, fichier ou commande"/><button className="iconButton" onClick={()=>deleteTrigger(trigger.id)}>✕</button></div>)}</div><p className="hint">Variables : {'{user}'}, {'{detail}'}, {'{event}'}. Les profils sont sauvegardés automatiquement.</p></section>}

      {activeTab==='overlays'&&<section className="card"><h2>Overlay navigateur pour OBS</h2><p>Ajoute cette URL comme « Source navigateur » dans OBS.</p><div className="copyBox"><input value={overlayUrl} readOnly/><button onClick={()=>navigator.clipboard.writeText(overlayUrl)}>Copier</button><button onClick={()=>window.nexora.openExternal(overlayUrl)}>Ouvrir</button></div><div className="settingsRow"><label>Port local</label><input type="number" value={settings.overlayPort} onChange={e=>setSettings(s=>({...s,overlayPort:Number(e.target.value)||18181}))}/></div><p className="hint">Les triggers de type « Overlay OBS » s'affichent sur cette source transparente.</p></section>}

      {activeTab==='tts'&&<section className="card"><h2>Test Text-to-Speech</h2><p>Utilise les voix installées sur Windows.</p><textarea value={ttsText} onChange={e=>setTtsText(e.target.value)} rows={5}/><div className="row"><button onClick={testTts}>▶ Lire</button><button onClick={()=>speechSynthesis.cancel()}>■ Stop</button></div><p className="hint">Dans un trigger, choisis l'action TTS et utilise par exemple « Merci {'{user}'} pour {'{detail}'} ».</p></section>}

      {activeTab==='actions'&&<section className="card"><h2>Actions système</h2><p>Tu peux déclencher un programme/commande depuis un trigger ou tester ici.</p><div className="copyBox"><input value={launchCommand} onChange={e=>setLaunchCommand(e.target.value)} placeholder="notepad.exe"/><button onClick={()=>window.nexora.launch(launchCommand)}>Lancer</button></div><p className="hint">Pour des raisons de sécurité, utilise uniquement des commandes que tu connais et contrôles.</p></section>}

      {activeTab==='analytics'&&<section className="analyticsGrid"><div className="card"><small>Événements</small><strong>{analytics.events}</strong></div><div className="card"><small>Commentaires</small><strong>{analytics.comments}</strong></div><div className="card"><small>Likes</small><strong>{analytics.likes}</strong></div><div className="card"><small>Gifts</small><strong>{analytics.gifts}</strong></div><div className="card"><small>Followers</small><strong>{analytics.follows}</strong></div><div className="card"><small>Partages</small><strong>{analytics.shares}</strong></div><div className="card"><small>Pic spectateurs</small><strong>{analytics.viewersPeak}</strong></div><div className="card"><small>Diamants estimés</small><strong>{analytics.giftCoins}</strong></div><button className="danger analyticsReset" onClick={resetAnalytics}>Réinitialiser les statistiques</button></section>}

      {activeTab==='games'&&<section className="card"><h2>Mini-jeux</h2><p>Première base prête : les événements TikTok peuvent déjà servir d'entrées aux jeux. Les modules roue, giveaway et sondage seront ajoutés par-dessus ce moteur.</p><div className="gameCards"><div><b>🎡 Roue</b><p>Déclenchable par commentaire ou cadeau.</p></div><div><b>🎁 Giveaway</b><p>Inscription par mot-clé dans le chat.</p></div><div><b>📊 Sondage</b><p>Votes via commentaires.</p></div></div></section>}
    </main>
  </div>;
}

declare global{interface Window{nexora:{connectTikTok(username:string):Promise<ConnectResult>;disconnectTikTok():Promise<boolean>;getProfiles():Promise<{profiles:Profile[];settings:Settings}>;saveProfiles(profiles:Profile[],settings:Settings):Promise<boolean>;getAnalytics():Promise<Analytics>;resetAnalytics():Promise<Analytics>;getOverlayUrl():Promise<string>;openExternal(url:string):Promise<boolean>;launch(command:string):Promise<boolean>;onTikTokEvent(cb:(event:EventItem)=>void):()=>void;onTikTokStatus(cb:(s:{connected:boolean;roomId?:string|null;reason?:string})=>void):()=>void;onTikTokStats(cb:(s:{viewerCount?:number})=>void):()=>void;onTriggerAction(cb:(a:TriggerAction)=>void):()=>void;onAnalytics(cb:(a:Analytics)=>void):()=>void}}}
