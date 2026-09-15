require('./rt/electron-rt');
//////////////////////////////
// User Defined Preload scripts below
console.log('User Preload!');

// Jembatan update aplikasi (lihat src/updater.ts). Nama sengaja terpisah dari
// CapacitorCustomPlatform supaya tidak bentrok dengan plugin Capacitor.
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('kanposUpdater', {
  check: (url: string) => ipcRenderer.invoke('kanpos-updater:check', url),
  getDownloaded: (versionCode: number) => ipcRenderer.invoke('kanpos-updater:downloaded', versionCode),
  download: (opts: { url: string; sha256: string; versionCode: number }) =>
    ipcRenderer.invoke('kanpos-updater:download', opts),
  cancel: () => ipcRenderer.invoke('kanpos-updater:cancel'),
  install: (versionCode: number) => ipcRenderer.invoke('kanpos-updater:install', versionCode),
  onProgress: (fn: (p: { downloaded: number; total: number }) => void) => {
    const handler = (_e: unknown, p: { downloaded: number; total: number }) => fn(p);
    ipcRenderer.on('kanpos-updater:progress', handler);
    return () => ipcRenderer.removeListener('kanpos-updater:progress', handler);
  },
});
