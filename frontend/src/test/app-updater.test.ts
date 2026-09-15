import { beforeEach, describe, expect, it, vi } from 'vitest';

const release = {
  platform: 'android' as const,
  versionName: '2026.09.20.1',
  versionCode: 999_999,
  fileName: 'kankitu-pos.apk',
  fileSize: 40_000_000,
  sha256: 'ab',
  changelog: '- Perbaikan',
  mandatory: false,
  updateAvailable: true,
  publishedAt: '2026-09-20T00:00:00Z',
  downloadUrl: 'http://api/x',
};

const adapter = {
  platform: 'android' as const,
  fetchLatest: vi.fn(),
  isDownloaded: vi.fn(async () => false),
  download: vi.fn(async () => undefined),
  cancel: vi.fn(async () => undefined),
  canInstall: vi.fn(async () => true),
  openInstallSettings: vi.fn(async () => undefined),
  install: vi.fn(async () => undefined),
};

vi.mock('@/lib/app-updater/platform', () => ({
  resolveAdapter: async () => adapter,
  errorCode: (e: { code?: string }) => e?.code,
}));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn() } }));

/** Store menyimpan state di tingkat modul, jadi tiap tes memuat salinan baru. */
async function muat() {
  vi.resetModules();
  const busy = await import('@/lib/transaction-busy');
  const store = await import('@/lib/app-updater/store');
  return { busy, store };
}

const selesai = () => new Promise((r) => setTimeout(r, 0));

describe('update aplikasi', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
    adapter.fetchLatest.mockResolvedValue(release);
  });

  it('membuka dialog saat ada versi baru', async () => {
    const { store } = await muat();
    await store.startUpdateChecks();
    await selesai();
    expect(store.getUpdateState().status).toBe('available');
    expect(store.getUpdateState().sheetOpen).toBe(true);
  });

  it('menunda dialog selama keranjang terisi', async () => {
    const { busy, store } = await muat();
    busy.setTransactionBusy(true);
    await store.startUpdateChecks();
    await selesai();
    expect(store.getUpdateState().sheetOpen).toBe(false);

    busy.setTransactionBusy(false);
    expect(store.getUpdateState().sheetOpen).toBe(true);
  });

  it('"Nanti saja" menyembunyikan versi yang sama, tapi cek manual tetap membuka', async () => {
    const { store } = await muat();
    await store.startUpdateChecks();
    await selesai();
    store.dismissUpdate();

    await store.checkForUpdate();
    expect(store.getUpdateState().sheetOpen).toBe(false);

    await store.checkForUpdate({ manual: true });
    expect(store.getUpdateState().sheetOpen).toBe(true);
  });

  it('versi yang lebih baru dari yang ditunda tetap ditawarkan', async () => {
    const { store } = await muat();
    await store.startUpdateChecks();
    await selesai();
    store.dismissUpdate();

    adapter.fetchLatest.mockResolvedValue({ ...release, versionCode: release.versionCode + 1 });
    await store.checkForUpdate();
    expect(store.getUpdateState().sheetOpen).toBe(true);
  });

  it('update wajib tidak membuka dialog biasa', async () => {
    adapter.fetchLatest.mockResolvedValue({ ...release, mandatory: true });
    const { store } = await muat();
    await store.startUpdateChecks();
    await selesai();
    expect(store.getUpdateState().mandatory).toBe(true);
    expect(store.getUpdateState().sheetOpen).toBe(false);
  });

  it('offline tidak menyalakan status wajib dan tidak menampilkan error', async () => {
    adapter.fetchLatest.mockRejectedValue(new Error('offline'));
    const { store } = await muat();
    await store.startUpdateChecks();
    await selesai();
    const s = store.getUpdateState();
    expect(s.mandatory).toBe(false);
    expect(s.error).toBeNull();
    expect(s.status).toBe('idle');
  });

  it('file rusak kembali ke tahap unduh dengan pesan checksum', async () => {
    adapter.download.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'CHECKSUM' }));
    const { store } = await muat();
    await store.startUpdateChecks();
    await selesai();
    await store.downloadUpdate();
    expect(store.getUpdateState().status).toBe('available');
    expect(store.getUpdateState().error).toBe('checksum');
  });

  it('meminta izin pemasangan bila Android belum mengizinkan', async () => {
    adapter.canInstall.mockResolvedValueOnce(false);
    const { store } = await muat();
    await store.startUpdateChecks();
    await selesai();
    await store.downloadUpdate();
    await store.installUpdate();
    expect(store.getUpdateState().needsPermission).toBe(true);
    expect(adapter.install).not.toHaveBeenCalled();
  });
});
