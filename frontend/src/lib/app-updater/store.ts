import { useSyncExternalStore } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import versionData from '../../../version.json';
import { CLOUD_API_URL } from '@/lib/cloud-api';
import { isTransactionBusy, subscribeTransactionBusy } from '@/lib/transaction-busy';
import { errorCode, resolveAdapter, type LatestRelease, type Progress, type UpdaterAdapter } from './platform';

/**
 * Status update aplikasi di luar Play Store — satu sumber untuk dialog update,
 * layar wajib update, baris di Pengaturan, dan titik di navigasi.
 */

export type UpdateStatus =
  | 'unsupported'
  | 'idle'
  | 'checking'
  | 'uptodate'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export type UpdateError = 'checkFailed' | 'downloadFailed' | 'checksum' | 'fileMissing';

export interface UpdateState {
  status: UpdateStatus;
  release: LatestRelease | null;
  /** Ada rilis wajib di atas versi terpasang (hanya dari pengecekan yang berhasil). */
  mandatory: boolean;
  progress: Progress | null;
  /** Kunci terjemahan `settings:appUpdate.errors.*`. */
  error: UpdateError | null;
  lastChecked: number | null;
  sheetOpen: boolean;
  /** Android menolak pemasangan: izin "Instal aplikasi tak dikenal" belum diberi. */
  needsPermission: boolean;
  platform: 'android' | 'windows' | null;
}

export const CURRENT_VERSION_CODE: number = versionData.versionCode;

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DISMISS_MS = 24 * 60 * 60 * 1000;
const DISMISS_KEY = 'kanpos.update.dismissed';

let state: UpdateState = {
  status: 'idle',
  release: null,
  mandatory: false,
  progress: null,
  error: null,
  lastChecked: null,
  sheetOpen: false,
  needsPermission: false,
  platform: null,
};
const listeners = new Set<() => void>();
let adapter: UpdaterAdapter | null = null;
let started = false;
/** Dialog menunggu keranjang kosong sebelum dibuka. */
let pendingOpen = false;
/**
 * Dipasang komponen UI: unduhan yang selesai saat dialog ditutup ("Lanjut
 * jualan") perlu memberi tahu — HP membuka dialog lagi, Windows memakai toast.
 */
let onDownloadedInBackground: (() => void) | null = null;
export function setDownloadedHandler(fn: (() => void) | null) {
  onDownloadedInBackground = fn;
}
export { tryOpenSheet as openUpdateSheetWhenIdle };

function set(patch: Partial<UpdateState>) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

export const getUpdateState = () => state;

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}

/* ── "Nanti saja" ─────────────────────────────────────────────── */

function dismissedFor(versionCode: number): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw) as { versionCode: number; until: number };
    // Versi yang lebih baru dari yang ditunda tetap ditawarkan.
    return d.versionCode >= versionCode && Date.now() < d.until;
  } catch {
    return false;
  }
}

function tryOpenSheet() {
  if (state.mandatory) return;
  if (isTransactionBusy()) {
    pendingOpen = true;
    return;
  }
  pendingOpen = false;
  set({ sheetOpen: true });
}

/* ── Aksi ─────────────────────────────────────────────────────── */

export async function checkForUpdate(opts: { manual?: boolean } = {}) {
  if (!adapter || state.status === 'checking' || state.status === 'downloading') return;
  const sebelum = state.status;
  set({ status: 'checking', error: null });

  try {
    const url = `${CLOUD_API_URL}/api/releases/latest?platform=${adapter.platform}&currentCode=${CURRENT_VERSION_CODE}`;
    const mentah = await adapter.fetchLatest(url);
    // Pakai alamat API milik aplikasi, bukan domain yang disusun backend dari
    // header proxy (bisa jadi http://localhost/... bila proxy salah atur).
    const release = mentah && {
      ...mentah,
      downloadUrl: (() => {
        try {
          const u = new URL(mentah.downloadUrl, CLOUD_API_URL);
          return `${CLOUD_API_URL}${u.pathname}${u.search}`;
        } catch {
          return mentah.downloadUrl;
        }
      })(),
    };
    const lastChecked = Date.now();

    if (!release || !release.updateAvailable) {
      set({ status: 'uptodate', release, mandatory: false, lastChecked });
      return;
    }

    const downloaded = await adapter.isDownloaded(release.versionCode).catch(() => false);
    set({
      status: downloaded ? 'downloaded' : 'available',
      release,
      mandatory: release.mandatory,
      lastChecked,
    });

    if (!release.mandatory && (opts.manual || !dismissedFor(release.versionCode))) tryOpenSheet();
  } catch (err) {
    // Offline/API gagal: diam. Pengecekan otomatis tidak boleh mengganggu kasir,
    // dan status wajib tidak pernah dinyalakan dari pengecekan yang gagal.
    set({
      status: opts.manual ? 'error' : sebelum,
      error: opts.manual ? 'checkFailed' : null,
    });
    console.warn('[update] Cek update gagal:', err);
  }
}

export function openUpdateSheet() {
  pendingOpen = false;
  set({ sheetOpen: true });
}

export function dismissUpdate() {
  if (state.release) {
    try {
      localStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ versionCode: state.release.versionCode, until: Date.now() + DISMISS_MS }),
      );
    } catch {
      /* penyimpanan diblokir — cukup tutup */
    }
  }
  closeUpdateSheet();
}

export function closeUpdateSheet() {
  pendingOpen = false;
  set({ sheetOpen: false });
}

export async function downloadUpdate() {
  const release = state.release;
  if (!adapter || !release || state.status === 'downloading') return;
  set({ status: 'downloading', progress: { downloaded: 0, total: release.fileSize }, error: null });
  try {
    await adapter.download(release, (progress) => set({ progress }));
    set({ status: 'downloaded', progress: null });
    if (!state.sheetOpen) onDownloadedInBackground?.();
  } catch (err) {
    const code = errorCode(err);
    set({
      status: 'available',
      progress: null,
      error:
        code === 'CANCELLED'
          ? null
          : code === 'CHECKSUM'
            ? 'checksum'
            : 'downloadFailed',
    });
  }
}

export async function cancelDownload() {
  await adapter?.cancel().catch(() => undefined);
}

export async function installUpdate() {
  const release = state.release;
  if (!adapter || !release) return;
  if (!(await adapter.canInstall())) {
    set({ needsPermission: true, sheetOpen: true });
    return;
  }
  set({ needsPermission: false, error: null });
  try {
    await adapter.install(release.versionCode);
  } catch {
    // File hilang (mis. dibersihkan sistem): kembali ke tahap unduh.
    set({ status: 'available', error: 'fileMissing' });
  }
}

export async function openInstallPermission() {
  await adapter?.openInstallSettings();
}

/* ── Mulai ────────────────────────────────────────────────────── */

export async function startUpdateChecks() {
  if (started) return;
  started = true;

  adapter = await resolveAdapter();
  if (!adapter) {
    set({ status: 'unsupported' });
    return;
  }
  set({ platform: adapter.platform });

  subscribeTransactionBusy(() => {
    if (pendingOpen && !isTransactionBusy()) tryOpenSheet();
  });

  void checkForUpdate();
  setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS);

  if (Capacitor.isNativePlatform()) {
    // Kembali dari Setelan izin pemasangan: langsung lanjutkan pemasangan.
    void CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive || !adapter) return;
      if (state.needsPermission && (await adapter.canInstall())) {
        void installUpdate();
      } else if (state.lastChecked && Date.now() - state.lastChecked > CHECK_INTERVAL_MS) {
        void checkForUpdate();
      }
    });
  }
}
