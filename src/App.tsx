import { useState } from 'react';
import './style.css';

type EventItem = { type: string; user: string; detail: string };

export default function App() {
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [events] = useState<EventItem[]>([]);

  async function connect() {
    if (!username.trim()) return;
    const ok = await window.nexora.connectTikTok(username.replace('@', ''));
    setConnected(ok);
  }

  return <div className="app">
    <aside>
      <div className="brand">NEXORA <b>LÉGEND</b></div>
      <nav>
        <button className="active">⌂ Tableau de bord</button>
        <button>⚡ Triggers</button>
        <button>▣ Overlays</button>
        <button>🔊 TTS</button>
        <button>🎮 Mini-jeux</button>
        <button>⌁ Actions</button>
        <button>▥ Analytics</button>
      </nav>
    </aside>
    <main>
      <header><div><h1>Tableau de bord</h1><p>Centre de contrôle de ton TikTok Live</p></div><span className={connected ? 'online' : 'offline'}>{connected ? '● Connecté' : '● Hors ligne'}</span></header>
      <section className="connect card">
        <div><h2>Connexion TikTok Live</h2><p>Entre le nom d'utilisateur du créateur actuellement en LIVE.</p></div>
        <div className="row"><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="@utilisateur"/><button onClick={connect}>Connexion</button></div>
      </section>
      <section className="stats"><div className="card"><small>ÉVÉNEMENTS</small><strong>{events.length}</strong></div><div className="card"><small>TRIGGERS ACTIFS</small><strong>0</strong></div><div className="card"><small>GIFTS</small><strong>0</strong></div><div className="card"><small>LIKES</small><strong>0</strong></div></section>
      <section className="card feed"><h2>Événements en direct</h2>{events.length === 0 ? <div className="empty">Les commentaires, cadeaux, likes et follows apparaîtront ici.</div> : events.map((e,i)=><div key={i}>{e.type} · {e.user} · {e.detail}</div>)}</section>
    </main>
  </div>;
}

declare global { interface Window { nexora: { connectTikTok(username:string): Promise<boolean> } } }
