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

contextBridge.exposeInMainWorld('nexora', {
  connectTikTok: (username:string) => ipcRenderer.invoke('tiktok:connect', username),
  disconnectTikTok: () => ipcRenderer.invoke('tiktok:disconnect'),
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
  }
});
