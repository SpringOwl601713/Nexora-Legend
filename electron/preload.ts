import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('nexora',{connectTikTok:(username:string)=>ipcRenderer.invoke('tiktok:connect',username)});
