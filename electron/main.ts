import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { WebcastPushConnection } from 'tiktok-live-connector';

let win: BrowserWindow | null = null;
let connection: WebcastPushConnection | null = null;

function createWindow(){
  win = new BrowserWindow({width:1280,height:800,minWidth:900,minHeight:620,backgroundColor:'#080b12',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
  if(!app.isPackaged) win.loadURL('http://localhost:5173');
  else win.loadFile(path.join(__dirname,'../dist/index.html'));
}

ipcMain.handle('tiktok:connect', async (_event, username:string) => {
  try {
    if(connection) connection.disconnect();
    connection = new WebcastPushConnection(username);
    await connection.connect();
    return true;
  } catch(err){ console.error('TikTok connection error',err); return false; }
});

app.whenReady().then(createWindow);
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
