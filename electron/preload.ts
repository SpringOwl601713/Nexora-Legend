import { contextBridge, ipcRenderer } from 'electron';

type LiveEvent = { type:string; user:string; detail:string; raw?:unknown; timestamp:number };
type LiveStatus = { connected:boolean; roomId?:string|null; reason?:string };
type LiveStats = { viewerCount?:number };
type TriggerAction = { action:'sound'|'overlay'|'tts'|'media'|'hotkey'|'obs'; value:string; payload:LiveEvent };

contextBridge.exposeInMainWorld('nexora', {
  connectTikTok:(username:string)=>ipcRenderer.invoke('tiktok:connect',username),
  disconnectTikTok:()=>ipcRenderer.invoke('tiktok:disconnect'),
  getProfiles:()=>ipcRenderer.invoke('profiles:get'),
  saveProfiles:(profiles:unknown,settings:unknown)=>ipcRenderer.invoke('profiles:save',profiles,settings),
  getAnalytics:()=>ipcRenderer.invoke('analytics:get'),
  resetAnalytics:()=>ipcRenderer.invoke('analytics:reset'),
  getOverlayUrl:()=>ipcRenderer.invoke('overlay:url'),
  testOverlay:(text:string)=>ipcRenderer.invoke('overlay:test',text),
  openExternal:(url:string)=>ipcRenderer.invoke('system:openExternal',url),
  launch:(command:string)=>ipcRenderer.invoke('system:launch',command),
  getMedia:()=>ipcRenderer.invoke('media:list'),
  addMedia:()=>ipcRenderer.invoke('media:add'),
  removeMedia:(id:string)=>ipcRenderer.invoke('media:remove',id),
  getGames:()=>ipcRenderer.invoke('games:get'),
  saveGames:(state:unknown)=>ipcRenderer.invoke('games:save',state),
  spinWheel:()=>ipcRenderer.invoke('games:wheelSpin'),
  pickGiveaway:()=>ipcRenderer.invoke('games:giveawayPick'),
  onTikTokEvent:(callback:(event:LiveEvent)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:LiveEvent)=>callback(p);ipcRenderer.on('tiktok:event',listener);return()=>ipcRenderer.removeListener('tiktok:event',listener);},
  onTikTokStatus:(callback:(status:LiveStatus)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:LiveStatus)=>callback(p);ipcRenderer.on('tiktok:status',listener);return()=>ipcRenderer.removeListener('tiktok:status',listener);},
  onTikTokStats:(callback:(stats:LiveStats)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:LiveStats)=>callback(p);ipcRenderer.on('tiktok:stats',listener);return()=>ipcRenderer.removeListener('tiktok:stats',listener);},
  onTriggerAction:(callback:(action:TriggerAction)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:TriggerAction)=>callback(p);ipcRenderer.on('trigger:action',listener);return()=>ipcRenderer.removeListener('trigger:action',listener);},
  onAnalytics:(callback:(data:unknown)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:unknown)=>callback(p);ipcRenderer.on('analytics:update',listener);return()=>ipcRenderer.removeListener('analytics:update',listener);}
});
