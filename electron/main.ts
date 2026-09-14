import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { WebcastPushConnection } from 'tiktok-live-connector';

let win: BrowserWindow | null = null;
let connection: WebcastPushConnection | null = null;

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

function pushEvent(type: string, user = '', detail = '', raw: unknown = null) {
  win?.webContents.send('tiktok:event', {
    type,
    user,
    detail,
    raw,
    timestamp: Date.now()
  });
}

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
      win?.webContents.send('tiktok:stats', {
        viewerCount: data?.viewerCount ?? 0
      });
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
