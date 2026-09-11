/**
 * Menarik isi sebuah toko cloud ke perangkat ini.
 *
 * Sebelumnya jalur ini hanya ada untuk karyawan yang menerima undangan.
 * Pemilik yang install ulang atau ganti HP tidak punya padanannya — dia masuk,
 * lalu melihat aplikasi kosong dan menyimpulkan datanya hilang. Fungsi di sini
 * dipakai kedua-duanya.
 */
import { db } from './db';
import { syncCloudMembers } from './members';
import { pullSyncData } from './sync';
import { markAllFeaturesSeen } from './whats-new';
import type { CloudStore, StoreRole } from './cloud-api';

export type HydrationStep = 'settings' | 'members' | 'data' | 'done';

export interface HydrationProgress {
  step: HydrationStep;
  /** Jumlah record yang sudah masuk; hanya terisi pada langkah 'data'. */
  applied?: number;
}

export interface HydrationResult {
  applied: number;
  /** Langkah yang gagal, kalau ada. Kegagalan sebagian tidak membatalkan sisanya. */
  warnings: HydrationStep[];
}

/** Menyimpan/menyisipkan baris storeSettings yang menunjuk ke toko cloud ini. */
export async function bindStoreToDevice(store: CloudStore, role: StoreRole) {
  const existing = await db.storeSettings.toCollection().first();
  const patch = {
    storeName: store.name,
    onboardingDone: true,
    cloudStoreId: store.id,
    cloudRole: role,
    // Perangkat non-pemilik hampir selalu dipakai bergantian, jadi login
    // per-orang diaktifkan sejak awal.
    ...(role === 'OWNER' ? {} : { multiUserEnabled: true }),
  };

  if (existing?.id) {
    await db.storeSettings.update(existing.id, patch);
    return;
  }

  await db.storeSettings.add({
    ...patch,
    address: store.address1 ?? '',
    phone: store.phone ?? '',
    receiptFooter: 'Terima kasih atas kunjungan Anda!',
    printLogo: false,
    lastBackupAt: null,
    deviceId: crypto.randomUUID(),
  });
}

/**
 * Ikat toko ke perangkat lalu tarik anggota dan katalognya.
 *
 * Kegagalan menarik anggota atau katalog tidak dianggap fatal — toko sudah
 * terikat, dan sync berikutnya akan menyusul. Yang penting user tidak
 * ditinggalkan di layar kosong tanpa penjelasan, karena itu langkah yang gagal
 * dilaporkan lewat `warnings`.
 */
export async function hydrateStore(
  store: CloudStore,
  onProgress?: (p: HydrationProgress) => void,
): Promise<HydrationResult> {
  const role = (store.role ?? 'STAFF') as StoreRole;
  const warnings: HydrationStep[] = [];

  onProgress?.({ step: 'settings' });
  await bindStoreToDevice(store, role);

  onProgress?.({ step: 'members' });
  try {
    await syncCloudMembers(store.id);
  } catch {
    warnings.push('members');
  }

  onProgress?.({ step: 'data' });
  let applied = 0;
  try {
    const hasil = await pullSyncData(store.id);
    applied = hasil.applied;
  } catch {
    warnings.push('data');
  }

  // Instalasi baru tidak perlu melihat modal "Apa yang Baru" untuk fitur yang
  // sudah ada sejak dia memasang aplikasi.
  await markAllFeaturesSeen();

  onProgress?.({ step: 'done', applied });
  return { applied, warnings };
}

export type LinkResult =
  | { status: 'linked'; store: CloudStore; pushed: boolean }
  | { status: 'has-stores'; count: number }
  | { status: 'quota' };

/**
 * Mendaftarkan toko lokal ("mode tanpa akun") ke cloud setelah user
 * menghubungkan akun Google-nya.
 *
 * Sengaja menolak bertindak kalau akun itu sudah punya toko di cloud: menebak
 * toko mana yang harus dipakai berisiko menimpa data toko lain. Kasus itu
 * dilempar ke halaman Toko Cloud yang memang punya UI pilih/ikat.
 */
export async function linkLocalStoreToCloud(): Promise<LinkResult> {
  const { fetchBootstrap, createStore } = await import('./cloud-api');
  const { pushSyncData } = await import('./sync');

  const boot = await fetchBootstrap();
  if (boot.stores.length > 0) return { status: 'has-stores', count: boot.stores.length };
  if (!boot.canCreateStore) return { status: 'quota' };

  const settings = await db.storeSettings.toCollection().first();
  const store = await createStore(settings?.storeName?.trim() || 'Toko Saya');

  if (settings?.id) {
    await db.storeSettings.update(settings.id, { cloudStoreId: store.id, cloudRole: 'OWNER' });
  }

  // Push pertama boleh gagal (offline, data besar) tanpa membatalkan
  // penautan — toko sudah terikat dan sync berikutnya akan menyusul.
  let pushed = false;
  try {
    const hasil = await pushSyncData(store.id);
    pushed = hasil.success;
  } catch {
    pushed = false;
  }

  return { status: 'linked', store, pushed };
}
