import { useEffect, useMemo, useState } from 'react';
import './style.css';

type EventItem = {
  type: string;
  user: string;
  detail: string;
  timestamp: number;
};

type ConnectResult = { ok: boolean; roomId?: string | null; error?: string };

type Trigger = {
  id: string;
  eventType: 'gift' | 'comment' | 'like' | 'follow' | 'share';
  match: string;
  action: 'notify' | 'sound' | 'overlay';
  actionValue: string;
  enabled: boolean;
};

const icons: Record<string, string> = {
  comment: '💬', gift: '🎁', like: '❤️', follow: '➕', share: '↗️', member: '👋', system: '⚙️'
};

export default function App() {
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'triggers'>('dashboard');
  const [triggers, setTriggers] = useState<Trigger[]>([
    { id: 'rose-demo', eventType: 'gift', match: 'Rose', action: 'notify', actionValue: '🌹 Rose reçue !', enabled: true }
  ]);

  useEffect(() => {
    const offEvent = window.nexora.onTikTokEvent((event) => {
      setEvents(current => [event, ...current].slice(0, 250));
    });
    const offStatus = window.nexora.onTikTokStatus((status) => {
      setConnected(status.connected);
      if (!status.connected) setRoomId(null);
      if (status.roomId) setRoomId(String(status.roomId));
    });
    const offStats = window.nexora.onTikTokStats((stats) => {
      if (typeof stats.viewerCount === 'number') setViewerCount(stats.viewerCount);
    });
    return () => { offEvent(); offStatus(); offStats(); };
  }, []);

  const totals = useMemo(() => ({
    gifts: events.filter(e => e.type === 'gift').length,
    likes: events.filter(e => e.type === 'like').length,
    comments: events.filter(e => e.type === 'comment').length
  }), [events]);

  async function connect() {
    if (!username.trim() || connecting) return;
    setConnecting(true);
    setError('');
    const result = await window.nexora.connectTikTok(username.replace('@', '').trim());
    setConnecting(false);
    setConnected(result.ok);
    setRoomId(result.roomId ? String(result.roomId) : null);
    if (!result.ok) setError(result.error || 'Connexion impossible. Vérifie que le compte est actuellement en LIVE.');
  }

  async function disconnect() {
    await window.nexora.disconnectTikTok();
    setConnected(false);
    setRoomId(null);
  }

  function addTrigger() {
    setTriggers(current => [...current, {
      id: crypto.randomUUID(),
      eventType: 'gift',
      match: '',
      action: 'notify',
      actionValue: '',
      enabled: true
    }]);
  }

  function updateTrigger(id: string, patch: Partial<Trigger>) {
    setTriggers(current => current.map(trigger => trigger.id === id ? { ...trigger, ...patch } : trigger));
  }

  function deleteTrigger(id: string) {
    setTriggers(current => current.filter(trigger => trigger.id !== id));
  }

  return <div className="app">
    <aside>
      <div className="brand">NEXORA <b>LÉGEND</b></div>
      <nav>
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>⌂ Tableau de bord</button>
        <button className={activeTab === 'triggers' ? 'active' : ''} onClick={() => setActiveTab('triggers')}>⚡ Triggers</button>
        <button disabled>▣ Overlays <span>Bientôt</span></button>
        <button disabled>🔊 TTS <span>Bientôt</span></button>
        <button disabled>🎮 Mini-jeux <span>Bientôt</span></button>
        <button disabled>⌁ Actions <span>Bientôt</span></button>
        <button disabled>▥ Analytics <span>Bientôt</span></button>
      </nav>
    </aside>

    <main>
      <header>
        <div><h1>{activeTab === 'dashboard' ? 'Tableau de bord' : 'Triggers'}</h1><p>{activeTab === 'dashboard' ? 'Centre de contrôle de ton TikTok Live' : 'Automatise les réactions aux événements du live'}</p></div>
        <span className={connected ? 'online' : 'offline'}>{connected ? '● Connecté' : '● Hors ligne'}</span>
      </header>

      {activeTab === 'dashboard' ? <>
        <section className="connect card">
          <div>
            <h2>Connexion TikTok Live</h2>
            <p>Entre le nom d'utilisateur du créateur actuellement en LIVE.</p>
            {roomId && <small>Room ID : {roomId}</small>}
          </div>
          <div className="row">
            <input value={username} disabled={connecting || connected} onChange={e=>setUsername(e.target.value)} placeholder="@utilisateur" onKeyDown={e => e.key === 'Enter' && connect()}/>
            {!connected ? <button onClick={connect} disabled={connecting}>{connecting ? 'Connexion…' : 'Connexion'}</button> : <button className="danger" onClick={disconnect}>Déconnexion</button>}
          </div>
          {error && <div className="error">{error}</div>}
        </section>

        <section className="stats">
          <div className="card"><small>ÉVÉNEMENTS</small><strong>{events.length}</strong></div>
          <div className="card"><small>SPECTATEURS</small><strong>{viewerCount}</strong></div>
          <div className="card"><small>GIFTS</small><strong>{totals.gifts}</strong></div>
          <div className="card"><small>LIKES</small><strong>{totals.likes}</strong></div>
        </section>

        <section className="card feed">
          <div className="feedHead"><h2>Événements en direct</h2><span>{totals.comments} commentaire{totals.comments > 1 ? 's' : ''}</span></div>
          {events.length === 0 ? <div className="empty">Les commentaires, cadeaux, likes, follows et partages apparaîtront ici.</div> :
            <div className="eventList">{events.map((e,i)=><div className={`event event-${e.type}`} key={`${e.timestamp}-${i}`}>
              <div className="eventIcon">{icons[e.type] || '•'}</div>
              <div><b>{e.user || 'TikTok'}</b><p>{e.detail || e.type}</p></div>
              <time>{new Date(e.timestamp).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</time>
            </div>)}</div>}
        </section>
      </> : <section className="card triggerPanel">
        <div className="feedHead"><div><h2>Moteur de triggers</h2><p>La première version sauvegarde les règles pendant la session. Les actions réelles arrivent ensuite.</p></div><button onClick={addTrigger}>+ Nouveau trigger</button></div>
        <div className="triggerList">
          {triggers.map(trigger => <div className="trigger" key={trigger.id}>
            <label><input type="checkbox" checked={trigger.enabled} onChange={e => updateTrigger(trigger.id, {enabled:e.target.checked})}/> Actif</label>
            <select value={trigger.eventType} onChange={e => updateTrigger(trigger.id, {eventType:e.target.value as Trigger['eventType']})}>
              <option value="gift">Cadeau</option><option value="comment">Commentaire</option><option value="like">Like</option><option value="follow">Follow</option><option value="share">Partage</option>
            </select>
            <input value={trigger.match} onChange={e => updateTrigger(trigger.id, {match:e.target.value})} placeholder="Rose, !boom, 100 likes…"/>
            <select value={trigger.action} onChange={e => updateTrigger(trigger.id, {action:e.target.value as Trigger['action']})}>
              <option value="notify">Notification</option><option value="sound">Son</option><option value="overlay">Overlay</option>
            </select>
            <input value={trigger.actionValue} onChange={e => updateTrigger(trigger.id, {actionValue:e.target.value})} placeholder="Texte, fichier ou overlay"/>
            <button className="iconButton" onClick={() => deleteTrigger(trigger.id)}>✕</button>
          </div>)}
        </div>
      </section>}
    </main>
  </div>;
}

declare global {
  interface Window {
    nexora: {
      connectTikTok(username:string): Promise<ConnectResult>;
      disconnectTikTok(): Promise<boolean>;
      onTikTokEvent(callback:(event:EventItem)=>void): () => void;
      onTikTokStatus(callback:(status:{connected:boolean;roomId?:string|null;reason?:string})=>void): () => void;
      onTikTokStats(callback:(stats:{viewerCount?:number})=>void): () => void;
    }
  }
}
