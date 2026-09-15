import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/**
 * Adaptor per platform untuk update di luar Play Store. Android memakai plugin
 * lokal `ApkUpdater` (android/app/.../ApkUpdaterPlugin.java), Windows memakai
 * jembatan `window.kanposUpdater` dari preload Electron.
 */

export interface LatestRelease {
  platform: 'android' | 'windows';
  versionName: string;
  versionCode: number;
  fileName: string;
  fileSize: number;
  sha256: string;
  changelog: string;
  mandatory: boolean;
  updateAvailable: boolean;
  publishedAt: string;
  downloadUrl: string;
}

export interface Progress {
  downloaded: number;
  total: number;
}

export interface UpdaterAdapter {
  platform: 'android' | 'windows';
  fetchLatest(url: string): Promise<LatestRelease | null>;
  isDownloaded(versionCode: number): Promise<boolean>;
  download(r: LatestRelease, onProgress: (p: Progress) => void): Promise<void>;
  cancel(): Promise<void>;
  /** false = perlu izin "Instal aplikasi tak dikenal" dulu (Android). */
  canInstall(): Promise<boolean>;
  openInstallSettings(): Promise<void>;
  install(versionCode: number): Promise<void>;
}

interface ApkUpdaterPlugin {
  getInstallSource(): Promise<{ installer: string | null }>;
  getDownloaded(o: { versionCode: number }): Promise<{ downloaded: boolean }>;
  download(o: { url: string; sha256: string; versionCode: number }): Promise<{ path: string }>;
  cancel(): Promise<void>;
  canInstall(): Promise<{ allowed: boolean }>;
  openInstallSettings(): Promise<void>;
  install(o: { versionCode: number }): Promise<void>;
  addListener(event: 'progress', fn: (p: Progress) => void): Promise<PluginListenerHandle>;
}

interface ElectronUpdaterBridge {
  check(url: string): Promise<LatestRelease | null>;
  getDownloaded(versionCode: number): Promise<boolean>;
  download(o: { url: string; sha256: string; versionCode: number }): Promise<{ path: string }>;
  cancel(): Promise<void>;
  install(versionCode: number): Promise<void>;
  onProgress(fn: (p: Progress) => void): () => void;
}

declare global {
  interface Window {
    kanposUpdater?: ElectronUpdaterBridge;
  }
}

const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater');

/** Pesan error dari plugin/IPC membawa `code` (CHECKSUM, CANCELLED, NETWORK). */
export function errorCode(err: unknown): string | undefined {
  const e = err as { code?: string; message?: string };
  if (e?.code) return e.code;
  const m = /CHECKSUM|CANCELLED/.exec(e?.message ?? '');
  return m?.[0];
}

function androidAdapter(): UpdaterAdapter {
  return {
    platform: 'android',
    async fetchLatest(url) {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    isDownloaded: async (versionCode) => (await ApkUpdater.getDownloaded({ versionCode })).downloaded,
    async download(r, onProgress) {
      const handle = await ApkUpdater.addListener('progress', onProgress);
      try {
        await ApkUpdater.download({ url: r.downloadUrl, sha256: r.sha256, versionCode: r.versionCode });
      } finally {
        await handle.remove();
      }
    },
    cancel: () => ApkUpdater.cancel(),
    canInstall: async () => (await ApkUpdater.canInstall()).allowed,
    openInstallSettings: () => ApkUpdater.openInstallSettings(),
    install: (versionCode) => ApkUpdater.install({ versionCode }),
  };
}

function electronAdapter(bridge: ElectronUpdaterBridge): UpdaterAdapter {
  return {
    platform: 'windows',
    fetchLatest: (url) => bridge.check(url),
    isDownloaded: (versionCode) => bridge.getDownloaded(versionCode),
    async download(r, onProgress) {
      const off = bridge.onProgress(onProgress);
      try {
        await bridge.download({ url: r.downloadUrl, sha256: r.sha256, versionCode: r.versionCode });
      } finally {
        off();
      }
    },
    cancel: () => bridge.cancel(),
    canInstall: async () => true,
    openInstallSettings: async () => undefined,
    install: (versionCode) => bridge.install(versionCode),
  };
}

/**
 * null = platform ini tidak memakai update mandiri: web/PWA (selalu terbaru),
 * atau Android yang dipasang dari Play Store (update lewat Play, lihat
 * use-app-update.ts).
 */
export async function resolveAdapter(): Promise<UpdaterAdapter | null> {
  if (Capacitor.getPlatform() === 'android') {
    try {
      const { installer } = await ApkUpdater.getInstallSource();
      if (installer === 'com.android.vending') return null;
    } catch {
      // Build lama tanpa plugin native — jangan tawarkan update mandiri.
      return null;
    }
    return androidAdapter();
  }
  if (window.kanposUpdater) return electronAdapter(window.kanposUpdater);
  return null;
}

export async function isPlayStoreInstall(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return false;
  try {
    return (await ApkUpdater.getInstallSource()).installer === 'com.android.vending';
  } catch {
    // Build tanpa plugin native: perilaku lama (update lewat Play) dipertahankan.
    return true;
  }
}
