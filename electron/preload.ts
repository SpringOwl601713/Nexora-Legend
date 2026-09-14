import { contextBridge, ipcRenderer } from 'electron';

type LiveEvent = { type:string; user:string; detail:string; raw?:unknown; timestamp:number };
type LiveStatus = { connected:boolean; roomId?:string|null; reason?:string };
type LiveStats = { viewerCount?:number };
type TriggerAction = { action:'sound'|'overlay'|'tts'|'media'; value:string; payload:LiveEvent };

contextBridge.exposeInMainWorld('nexora', {
  connectTikTok:(username:string)=>ipcRenderer.invoke('tiktok:connect',username),
  disconnectTikTok:()=>ipcRenderer.invoke('tiktok:disconnect'),
  getProfiles:()=>ipcRenderer.invoke('profiles:get'),
  saveProfiles:(profiles:unknown,settings:unknown)=>ipcRenderer.invoke('profiles:save',profiles,settings),
  getAnalytics:()=>ipcRenderer.invoke('analytics:get'),
  resetAnalytics:()=>ipcRenderer.invoke('analytics:reset'),
  getOverlayUrl:()=>ipcRenderer.invoke('overlay:url'),
  testOverlay:(text:string)=>ipcRenderer.invoke('overlay:test',text),
  getOverlayConfig:()=>ipcRenderer.invoke('overlay:config:get'),
  saveOverlayConfig:(config:unknown)=>ipcRenderer.invoke('overlay:config:save',config),
  previewOverlay:(payload:unknown)=>ipcRenderer.invoke('overlay:preview',payload),
  openExternal:(url:string)=>ipcRenderer.invoke('system:openExternal',url),
  launch:(command:string)=>ipcRenderer.invoke('system:launch',command),
  hotkey:(value:string)=>ipcRenderer.invoke('system:hotkey',value),
  mouse:(value:string)=>ipcRenderer.invoke('system:mouse',value),
  connectObs:()=>ipcRenderer.invoke('obs:connect'),
  disconnectObs:()=>ipcRenderer.invoke('obs:disconnect'),
  getObsScenes:()=>ipcRenderer.invoke('obs:scenes'),
  obsAction:(value:string)=>ipcRenderer.invoke('obs:action',value),
  getMedia:()=>ipcRenderer.invoke('media:list'),
  addMedia:()=>ipcRenderer.invoke('media:add'),
  removeMedia:(id:string)=>ipcRenderer.invoke('media:remove',id),
  getGames:()=>ipcRenderer.invoke('games:get'),
  saveGames:(state:unknown)=>ipcRenderer.invoke('games:save',state),
  spinWheel:()=>ipcRenderer.invoke('games:wheelSpin'),
  pickGiveaway:()=>ipcRenderer.invoke('games:giveawayPick'),
  getGifts:()=>ipcRenderer.invoke('gifts:list'),
  getAccessState:()=>ipcRenderer.invoke('access:state'),
  checkAccess:(tiktok:string)=>ipcRenderer.invoke('access:check',tiktok),
  founderLogin:(password:string)=>ipcRenderer.invoke('access:founderLogin',password),
  founderChangePassword:(token:string,currentPassword:string,newPassword:string)=>ipcRenderer.invoke('access:founderPassword',token,currentPassword,newPassword),
  founderMembers:(token:string)=>ipcRenderer.invoke('access:members',token),
  founderEnable:(token:string,tiktok:string,note:string)=>ipcRenderer.invoke('access:enable',token,tiktok,note),
  founderRevoke:(token:string,tiktok:string)=>ipcRenderer.invoke('access:revoke',token,tiktok),
  onAccessStatus:(callback:(data:unknown)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:unknown)=>callback(p);ipcRenderer.on('access:status',listener);return()=>ipcRenderer.removeListener('access:status',listener);},
  onTikTokEvent:(callback:(event:LiveEvent)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:LiveEvent)=>callback(p);ipcRenderer.on('tiktok:event',listener);return()=>ipcRenderer.removeListener('tiktok:event',listener);},
  onTikTokStatus:(callback:(status:LiveStatus)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:LiveStatus)=>callback(p);ipcRenderer.on('tiktok:status',listener);return()=>ipcRenderer.removeListener('tiktok:status',listener);},
  onTikTokStats:(callback:(stats:LiveStats)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:LiveStats)=>callback(p);ipcRenderer.on('tiktok:stats',listener);return()=>ipcRenderer.removeListener('tiktok:stats',listener);},
  onTriggerAction:(callback:(action:TriggerAction)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:TriggerAction)=>callback(p);ipcRenderer.on('trigger:action',listener);return()=>ipcRenderer.removeListener('trigger:action',listener);},
  onAnalytics:(callback:(data:unknown)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:unknown)=>callback(p);ipcRenderer.on('analytics:update',listener);return()=>ipcRenderer.removeListener('analytics:update',listener);},
  onObsStatus:(callback:(data:unknown)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:unknown)=>callback(p);ipcRenderer.on('obs:status',listener);return()=>ipcRenderer.removeListener('obs:status',listener);},
  onGifts:(callback:(data:unknown)=>void)=>{const listener=(_e:Electron.IpcRendererEvent,p:unknown)=>callback(p);ipcRenderer.on('gifts:update',listener);return()=>ipcRenderer.removeListener('gifts:update',listener);}
});
