import { db } from './db';
import { syncStoreData, fetchStoreChanges, SyncPayload, hasCloudToken } from './cloud-api';
import { syncCloudMembers } from './members';

var syncDebounceTimer: any = null;
var isSyncing = false;

/**
 * Pemicu sinkronisasi otomatis ke cloud dengan mekanisme debounce dan locking.
 */
export function triggerBackgroundSync() {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(async () => {
    if (isSyncing) return;

    try {
      const storeSettings = await db.storeSettings.toCollection().first();
      if (storeSettings && storeSettings.cloudStoreId && hasCloudToken()) {
        isSyncing = true;
        console.log('[Sync] Memulai background sync untuk toko:', storeSettings.cloudStoreId);
        // Tarik lebih dulu supaya transaksi yang didorong sesudahnya sudah
        // merujuk katalog terbaru dari pemilik.
        try {
          const tarik = await pullSyncData(storeSettings.cloudStoreId);
          if (tarik.applied > 0) console.log(`[Sync] ${tarik.applied} master data ditarik.`);
        } catch (err) {
          console.warn('[Sync] Tarik master data gagal:', err);
        }

        const result = await pushSyncData(storeSettings.cloudStoreId);
        console.log('[Sync] Background sync selesai:', result.message);

        // Daftar anggota ditarik terpisah karena arahnya berlawanan: cloud
        // adalah sumber kebenarannya, bukan perangkat ini. Kegagalannya tidak
        // boleh menggagalkan sync data — mis. saat server masih versi lama.
        try {
          await syncCloudMembers(storeSettings.cloudStoreId);
        } catch (err) {
          console.warn('[Sync] Anggota cloud tidak bisa ditarik:', err);
        }
      }
    } catch (err) {
      console.warn('[Sync] Background sync gagal:', err);
    } finally {
      isSyncing = false;
    }
  }, 2000); // debounce 2 detik
}

/**
 * Fungsi inti untuk melakukan PUSH data lokal yang kotor (dirty) ke cloud.
 *
 * Tabel `users` (daftar karyawan) tidak ikut: sejak multi-user cloud, anggota
 * dikelola lewat endpoint `/api/stores/:id/members`, dan server menolak tabel
 * itu di payload. Lihat `syncCloudMembers` di lib/members.ts untuk arah
 * sebaliknya — menarik anggota dari cloud ke tabel lokal.
 */
export async function pushSyncData(storeId: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Ambil data lokal yang berubah (updatedAt > syncedAt atau syncedAt === null)
    const getDirtyRecords = async (tableName: string) => {
      const table = db.table(tableName);
      return table.filter(item => {
        if (!item.syncedAt) return true;
        if (!item.updatedAt) return false;
        return new Date(item.updatedAt).getTime() > new Date(item.syncedAt).getTime();
      }).toArray();
    };

    const settings = await db.storeSettings.toCollection().first();
    const deviceId = settings?.deviceId;
    if (!deviceId) {
      return { success: false, message: 'Perangkat belum punya deviceId.' };
    }

    // Perangkat replika (karyawan) tidak mendorong katalog: server menolaknya,
    // dan mengirimnya hanya membuat record lokal tampak "sudah sinkron"
    // padahal tidak pernah diterima.
    const replika = settings.cloudRole != null && settings.cloudRole !== 'OWNER';

    const categories = replika ? [] : await getDirtyRecords('categories');
    const products = replika ? [] : await getDirtyRecords('products');
    const customers = await getDirtyRecords('customers');
    const transactions = await getDirtyRecords('transactions');
    const expenseCategories = replika ? [] : await getDirtyRecords('expenseCategories');
    const expenses = await getDirtyRecords('expenses');
    const debts = await getDirtyRecords('debts');
    const debtPayments = await getDirtyRecords('debtPayments');
    const stockOpnames = await getDirtyRecords('stockOpnames');

    // 2. Ambil detail records yang berelasi dengan data induk yang kotor
    const dirtyTxIds = transactions.map(t => t.id).filter(id => id !== undefined) as number[];
    const transactionItems = dirtyTxIds.length > 0
      ? await db.transactionItems.where('transactionId').anyOf(dirtyTxIds).toArray()
      : [];

    const dirtyOpnameIds = stockOpnames.map(o => o.id).filter(id => id !== undefined) as number[];
    const stockOpnameItems = dirtyOpnameIds.length > 0
      ? await db.stockOpnameItems.where('opnameId').anyOf(dirtyOpnameIds).toArray()
      : [];

    const totalDirtyCount =
      categories.length + products.length + customers.length +
      transactions.length + transactionItems.length + expenseCategories.length +
      expenses.length + debts.length + debtPayments.length + stockOpnames.length + stockOpnameItems.length;

    if (totalDirtyCount === 0) {
      return { success: true, message: 'Semua data lokal sudah sinkron.' };
    }

    console.log(`[Sync] Mengirimkan ${totalDirtyCount} data kotor ke server...`);

    // 3. Bangun payload push
    const payload: SyncPayload = {
      deviceId,
      categories,
      products,
      customers,
      transactions,
      transactionItems,
      expenseCategories,
      expenses,
      debts,
      debtPayments,
      stockOpnames,
      stockOpnameItems
    };

    // 4. Kirim ke API cloud sync
    const response = await syncStoreData(storeId, payload);

    // 5. Perbarui status syncedAt di lokal ke waktu sekarang
    const syncTime = new Date();
    await db.transaction('rw', [
      'categories', 'products', 'customers', 'transactions',
      'expenseCategories', 'expenses', 'debts', 'debtPayments', 'stockOpnames'
    ], async () => {
      const updateSyncTime = async (tableName: string, records: any[]) => {
        const table = db.table(tableName);
        for (const record of records) {
          if (record.id !== undefined) {
            await table.update(record.id, { syncedAt: syncTime });
          }
        }
      };

      await updateSyncTime('categories', categories);
      await updateSyncTime('products', products);
      await updateSyncTime('customers', customers);
      await updateSyncTime('transactions', transactions);
      await updateSyncTime('expenseCategories', expenseCategories);
      await updateSyncTime('expenses', expenses);
      await updateSyncTime('debts', debts);
      await updateSyncTime('debtPayments', debtPayments);
      await updateSyncTime('stockOpnames', stockOpnames);
    });

    if (response.rejectedTables?.length) {
      console.warn('[Sync] Tabel ditolak server (bukan perangkat pemilik):', response.rejectedTables);
    }

    return { success: true, message: response.message || 'Sinkronisasi berhasil.' };
  } catch (err) {
    console.error('[Sync] Gagal push data:', err);
    throw err;
  }
}

/** Cocok dengan tanggal ISO 8601 yang dihasilkan `JSON.stringify(new Date())`. */
const POLA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Mengembalikan string tanggal hasil JSON menjadi objek `Date`.
 *
 * Payload dari server melewati JSON, jadi `createdAt` dkk. sampai sebagai
 * string. Dexie mengindeks dan membandingkan nilai apa adanya — string yang
 * dibiarkan akan membuat filter rentang tanggal dan pengurutan diam-diam
 * salah, bukan error. Lihat juga `sanitizeTableDates` yang menambal masalah
 * yang sama untuk data lama.
 */
function hidupkanTanggal(record: Record<string, unknown>): Record<string, unknown> {
  const hasil: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    hasil[key] = typeof value === 'string' && POLA_ISO.test(value) ? new Date(value) : value;
  }
  return hasil;
}

/**
 * Menarik master data dari cloud dan menuliskannya sebagai **replika**.
 *
 * Record ditulis dengan `id` asal dari perangkat pemilik, bukan id baru:
 * inilah yang membuat `productId` di transaksi karyawan menunjuk produk yang
 * sama dengan yang dilihat pemilik, tanpa perlu tabel pemetaan id.
 *
 * Konsekuensinya, produk yang dibuat lokal di perangkat replika bisa tertimpa
 * kalau id-nya kebetulan sama dengan milik pemilik. Itu sebabnya server juga
 * menolak katalog dari perangkat replika — jangan buat master data di sana.
 */
export async function pullSyncData(storeId: string): Promise<{ applied: number; role: string | null }> {
  const settings = await db.storeSettings.toCollection().first();
  if (!settings?.id) return { applied: 0, role: null };

  let since = settings.lastPullAt ?? null;
  let applied = 0;
  let role: string | null = settings.cloudRole ?? null;

  // Server memotong hasil pada batas tertentu; lanjutkan selama masih ada.
  for (let putaran = 0; putaran < 20; putaran++) {
    const changes = await fetchStoreChanges(storeId, { since, deviceId: settings.deviceId });
    role = changes.role;

    for (const tableName of changes.masterTables) {
      const records = changes.tables[tableName];
      if (!Array.isArray(records) || records.length === 0) continue;

      const table = db.table(tableName);
      for (const record of records) {
        if (record?.id === undefined || record.id === null) continue;
        // `put` menimpa berdasarkan primary key; `syncedAt` diisi supaya
        // record hasil tarikan tidak ikut terdorong balik sebagai "kotor".
        await table.put({ ...hidupkanTanggal(record), syncedAt: new Date() });
        applied++;
      }
    }

    if (changes.syncedAt) since = changes.syncedAt;
    if (!changes.hasMore) break;
  }

  await db.storeSettings.update(settings.id, {
    lastPullAt: since,
    cloudRole: (role as 'OWNER' | 'ADMIN' | 'STAFF' | null) ?? null,
  });

  return { applied, role };
}
