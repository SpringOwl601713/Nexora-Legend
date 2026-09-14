import { contextBridge, ipcRenderer } from 'electron';

type LiveEvent = {
  type: string;
  user: string;
  detail: string;
  raw?: unknown;
  timestamp: number;
};

type LiveStatus = { connected: boolean; roomId?: string | null; reason?: string };
type LiveStats = { viewerCount?: number };

type Trigger = {
  id: string;
  eventType: 'gift' | 'comment' | 'like' | 'follow' | 'share';
  match: string;
  action: 'notify' | 'sound' | 'overlay' | 'tts' | 'webhook';
  actionValue: string;
  enabled: boolean;
};

type TriggerAction = {
  action: 'sound' | 'overlay' | 'tts';
  value: string;
  payload: LiveEvent;
};

contextBridge.exposeInMainWorld('nexora', {
  connectTikTok: (username:string) => ipcRenderer.invoke('tiktok:connect', username),
  disconnectTikTok: () => ipcRenderer.invoke('tiktok:disconnect'),
  getTriggers: () => ipcRenderer.invoke('triggers:get'),
  saveTriggers: (triggers: Trigger[]) => ipcRenderer.invoke('triggers:save', triggers),
  openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  onTikTokEvent: (callback: (event: LiveEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: LiveEvent) => callback(payload);
    ipcRenderer.on('tiktok:event', listener);
    return () => ipcRenderer.removeListener('tiktok:event', listener);
  },
  onTikTokStatus: (callback: (status: LiveStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: LiveStatus) => callback(payload);
    ipcRenderer.on('tiktok:status', listener);
    return () => ipcRenderer.removeListener('tiktok:status', listener);
  },
  onTikTokStats: (callback: (stats: LiveStats) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: LiveStats) => callback(payload);
    ipcRenderer.on('tiktok:stats', listener);
    return () => ipcRenderer.removeListener('tiktok:stats', listener);
  },
  onTriggerAction: (callback: (action: TriggerAction) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TriggerAction) => callback(payload);
    ipcRenderer.on('trigger:action', listener);
    return () => ipcRenderer.removeListener('trigger:action', listener);
  }
});
