import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { WebcastPushConnection } from 'tiktok-live-connector';

let win: BrowserWindow | null = null;
let connection: WebcastPushConnection | null = null;

type Trigger = {
  id: string;
  eventType: 'gift' | 'comment' | 'like' | 'follow' | 'share';
  match: string;
  action: 'notify' | 'sound' | 'overlay' | 'tts' | 'webhook';
  actionValue: string;
  enabled: boolean;
};

function createWindow(){
  win = new BrowserWindow({
    width:1280,
    height:800,
    minWidth:900,
    minHeight:620,
    backgroundColor:'#080b12',
    webPreferences:{
      preload:path.join(__dirname,'preload.js'),
      contextIsolation:true,
      nodeIntegration:false
    }
  });

  if(!app.isPackaged) win.loadURL('http://localhost:5173');
  else win.loadFile(path.join(__dirname,'../dist/index.html'));
}

function triggerFile(){
  return path.join(app.getPath('userData'), 'triggers.json');
}

function readTriggers(): Trigger[] {
  try {
    return JSON.parse(fs.readFileSync(triggerFile(), 'utf8'));
  } catch {
    return [];
  }
}

function writeTriggers(triggers: Trigger[]){
  fs.mkdirSync(path.dirname(triggerFile()), { recursive: true });
  fs.writeFileSync(triggerFile(), JSON.stringify(triggers, null, 2), 'utf8');
}

function matchesTrigger(trigger: Trigger, eventType: string, detail: string) {
  if (!trigger.enabled || trigger.eventType !== eventType) return false;
  const needle = trigger.match.trim().toLowerCase();
  if (!needle) return true;
  return detail.toLowerCase().includes(needle);
}

function executeTrigger(trigger: Trigger, payload: { type: string; user: string; detail: string; raw?: unknown }) {
  const value = trigger.actionValue
    .replaceAll('{user}', payload.user)
    .replaceAll('{detail}', payload.detail)
    .replaceAll('{event}', payload.type);

  if (trigger.action === 'notify') {
    if (Notification.isSupported()) new Notification({ title: 'Nexora Légend', body: value || `${payload.user} · ${payload.detail}` }).show();
  } else if (trigger.action === 'sound') {
    win?.webContents.send('trigger:action', { action: 'sound', value, payload });
  } else if (trigger.action === 'overlay') {
    win?.webContents.send('trigger:action', { action: 'overlay', value, payload });
  } else if (trigger.action === 'tts') {
    win?.webContents.send('trigger:action', { action: 'tts', value, payload });
  } else if (trigger.action === 'webhook' && /^https?:\/\//i.test(value)) {
    fetch(value, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
  }
}

function pushEvent(type: string, user = '', detail = '', raw: unknown = null) {
  const payload = { type, user, detail, raw, timestamp: Date.now() };
  win?.webContents.send('tiktok:event', payload);

  for (const trigger of readTriggers()) {
    if (matchesTrigger(trigger, type, detail)) executeTrigger(trigger, payload);
  }
}

ipcMain.handle('triggers:get', async () => readTriggers());
ipcMain.handle('triggers:save', async (_event, triggers: Trigger[]) => {
  writeTriggers(triggers);
  return true;
});

ipcMain.handle('system:openExternal', async (_event, url: string) => {
  if (/^https?:\/\//i.test(url)) await shell.openExternal(url);
  return true;
});

ipcMain.handle('tiktok:connect', async (_event, username:string) => {
  try {
    if(connection) {
      try { connection.disconnect(); } catch {}
    }

    connection = new WebcastPushConnection(username, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 1000
    });

    const state = await connection.connect();

    connection.on('chat', (data: any) => {
      pushEvent('comment', data?.uniqueId || data?.nickname || 'Utilisateur', data?.comment || '', data);
    });

    connection.on('gift', (data: any) => {
      if (data?.giftType === 1 && !data?.repeatEnd) return;
      const giftName = data?.giftName || data?.extendedGiftInfo?.name || 'Cadeau';
      const count = data?.repeatCount || 1;
      pushEvent('gift', data?.uniqueId || data?.nickname || 'Utilisateur', `${giftName} ×${count}`, data);
    });

    connection.on('like', (data: any) => {
      const count = data?.likeCount || 1;
      pushEvent('like', data?.uniqueId || data?.nickname || 'Utilisateur', `+${count} like${count > 1 ? 's' : ''}`, data);
    });

    connection.on('follow', (data: any) => {
      pushEvent('follow', data?.uniqueId || data?.nickname || 'Utilisateur', 'Nouvel abonnement', data);
    });

    connection.on('share', (data: any) => {
      pushEvent('share', data?.uniqueId || data?.nickname || 'Utilisateur', 'A partagé le live', data);
    });

    connection.on('member', (data: any) => {
      pushEvent('member', data?.uniqueId || data?.nickname || 'Utilisateur', 'A rejoint le live', data);
    });

    connection.on('roomUser', (data: any) => {
      win?.webContents.send('tiktok:stats', { viewerCount: data?.viewerCount ?? 0 });
    });

    connection.on('streamEnd', () => {
      win?.webContents.send('tiktok:status', { connected: false, reason: 'stream-end' });
    });

    pushEvent('system', username, `Connecté à la room ${state?.roomId ?? ''}`.trim(), state);
    win?.webContents.send('tiktok:status', { connected: true, roomId: state?.roomId ?? null });
    return { ok: true, roomId: state?.roomId ?? null };
  } catch(err:any){
    console.error('TikTok connection error',err);
    win?.webContents.send('tiktok:status', { connected: false, reason: err?.message || 'connection-error' });
    return { ok: false, error: err?.message || 'Impossible de se connecter au live.' };
  }
});

ipcMain.handle('tiktok:disconnect', async () => {
  try {
    connection?.disconnect();
    connection = null;
    win?.webContents.send('tiktok:status', { connected: false, reason: 'manual' });
    return true;
  } catch {
    return false;
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
