import { prisma } from '@/lib/db';
import { BadRequestError, ForbiddenError } from '@/lib/error';
import { resolveMembership } from '@/middleware/store-access';

/**
 * Master data — katalog toko. Hanya **pemilik** yang boleh mendorongnya;
 * anggota lain menerimanya lewat `getStoreChanges`.
 *
 * Pembagian ini yang membuat sync dua arah aman tanpa mengganti id lokal
 * menjadi UUID: selama master data punya satu sumber, tidak ada dua perangkat
 * yang memperebutkan record yang sama, dan `localId` milik pemilik bisa
 * dipakai apa adanya sebagai primary key di perangkat karyawan.
 */
const MASTER_TABLES = [
  'categories',
  'products',
  'expenseCategories',
];

/**
 * Data yang lahir dari operasional harian. Setiap perangkat boleh mendorong
 * miliknya sendiri; tabrakan `localId` antar perangkat dicegah oleh kolom
 * `deviceId`, bukan oleh pembatasan siapa yang boleh menulis.
 */
const TRANSACTIONAL_TABLES = [
  'customers',
  'transactions',
  'transactionItems',
  'expenses',
  'debts',
  'debtPayments',
  'stockOpnames',
  'stockOpnameItems',
];

/**
 * `users` sengaja tidak ada di kedua daftar. Daftar karyawan dulu ikut
 * disinkronkan sebagai data biasa, tapi setelah multi-user cloud sumber
 * kebenarannya adalah tabel `store_members` — kalau keduanya jalan bersamaan,
 * penghapusan anggota di server bisa dibatalkan oleh perangkat yang mengunggah
 * daftar lamanya.
 */
const SYNC_TABLES = [...MASTER_TABLES, ...TRANSACTIONAL_TABLES];

/**
 * Baris yang ditulis sebelum kolom `deviceId` ada punya `deviceId` kosong.
 * Perangkat pertama yang push setelah upgrade mengklaimnya sebagai miliknya.
 *
 * Aman karena sebelum fitur ini tidak ada endpoint tarik sama sekali: dalam
 * praktiknya hanya satu perangkat per toko yang pernah mendorong data. Kalau
 * ternyata ada dua, baris-baris itu memang sudah saling menimpa sejak dulu —
 * mengklaimnya tidak membuat keadaan lebih buruk, dan mencegah seluruh riwayat
 * lama muncul sebagai duplikat begitu perangkat mulai mengirim `deviceId`.
 */
async function claimLegacyRecords(storeId: string, deviceId: string) {
  const adaMilikPerangkatIni = await prisma.syncRecord.findFirst({
    where: { storeId, deviceId },
    select: { id: true },
  });
  if (adaMilikPerangkatIni) return 0;

  const { count } = await prisma.syncRecord.updateMany({
    where: { storeId, deviceId: '' },
    data: { deviceId },
  });

  return count;
}

export async function syncStoreData(
  storeId: string,
  userId: string,
  payload: Record<string, unknown>,
) {
  // Akses ditentukan keanggotaan; hak sync ditentukan langganan **pemilik**.
  const membership = await resolveMembership(userId, storeId);
  const owner = membership.store.user;
  const isOwner = membership.role === 'OWNER';

  // Hanya anggota non-pemilik yang dicek masa aktifnya. Pemilik sengaja
  // dibiarkan seperti perilaku lama — endpoint ini belum pernah menolak
  // berdasarkan `syncExpiry`, dan mengetatkannya sekarang akan memutus user
  // yang selama ini sync tanpa langganan.
  const now = new Date();
  if (!isOwner && (!owner.syncExpiry || owner.syncExpiry <= now)) {
    throw new BadRequestError('Langganan pemilik toko sedang tidak aktif. Hubungi pemilik toko.');
  }

  const deviceId = typeof payload.deviceId === 'string' ? payload.deviceId.trim() : '';
  if (!deviceId) {
    throw new BadRequestError('deviceId wajib dikirim. Perbarui aplikasi KanPOS Anda.');
  }

  await claimLegacyRecords(storeId, deviceId);

  let total = 0;
  const ditolak: string[] = [];

  for (const tableName of SYNC_TABLES) {
    const records = payload[tableName];
    if (!Array.isArray(records) || records.length === 0) continue;

    // Karyawan tidak boleh mengubah katalog dari perangkatnya. Kalau
    // dibiarkan, dua sumber master data akan saling menimpa dan tidak ada
    // yang bisa menentukan mana yang benar.
    if (!isOwner && MASTER_TABLES.includes(tableName)) {
      ditolak.push(tableName);
      continue;
    }

    for (const record of records as Record<string, unknown>[]) {
      const localId = String(record.id ?? record.localId ?? '');
      if (!localId) continue;

      await prisma.syncRecord.upsert({
        where: {
          storeId_tableName_deviceId_localId: { storeId, tableName, deviceId, localId },
        },
        create: {
          storeId,
          userId,
          deviceId,
          tableName,
          localId,
          payload: record as object,
        },
        update: {
          payload: record as object,
          userId,
          syncedAt: new Date(),
        },
      });

      total++;
    }
  }

  return {
    message: `${total} data berhasil disinkronkan.`,
    // Dilaporkan, bukan didiamkan: aplikasi versi lama di perangkat karyawan
    // akan terus mengirim master data, dan pemiliknya perlu tahu kenapa
    // perubahan katalognya tidak pernah sampai.
    rejectedTables: ditolak,
  };
}

/**
 * Menarik master data toko untuk perangkat yang bukan sumbernya.
 *
 * Hanya `MASTER_TABLES` yang dikembalikan, dan hanya baris dari perangkat
 * **lain**. Data transaksi sengaja tidak ikut: tiap perangkat sudah punya
 * miliknya sendiri, dan menariknya masuk akan menabrakkan `localId` yang
 * dialokasikan Dexie secara independen.
 */
export async function getStoreChanges(
  storeId: string,
  userId: string,
  opts: { since?: string; deviceId?: string } = {},
) {
  const membership = await resolveMembership(userId, storeId);
  const owner = membership.store.user;

  const now = new Date();
  if (membership.role !== 'OWNER' && (!owner.syncExpiry || owner.syncExpiry <= now)) {
    throw new ForbiddenError('Langganan pemilik toko sedang tidak aktif. Hubungi pemilik toko.');
  }

  let since: Date | undefined;
  if (opts.since) {
    const parsed = new Date(opts.since);
    if (!isNaN(parsed.getTime())) since = parsed;
  }

  const records = await prisma.syncRecord.findMany({
    where: {
      storeId,
      tableName: { in: MASTER_TABLES },
      ...(opts.deviceId ? { deviceId: { not: opts.deviceId } } : {}),
      ...(since ? { syncedAt: { gt: since } } : {}),
    },
    orderBy: { syncedAt: 'asc' },
    // Batas aman untuk satu tarikan; klien melanjutkan dengan `since` dari
    // `syncedAt` terakhir yang diterima.
    take: 2000,
  });

  const tables: Record<string, unknown[]> = {};
  for (const tableName of MASTER_TABLES) tables[tableName] = [];
  for (const r of records) tables[r.tableName].push(r.payload);

  const terakhir = records.length > 0 ? records[records.length - 1].syncedAt : since ?? null;

  return {
    tables,
    total: records.length,
    /** Dipakai klien sebagai `since` pada tarikan berikutnya. */
    syncedAt: terakhir ? terakhir.toISOString() : null,
    /** true bila hasil terpotong `take` dan klien perlu menarik lagi. */
    hasMore: records.length === 2000,
    /** Peran perangkat ini di toko — menentukan apa yang boleh dia dorong. */
    role: membership.role,
    masterTables: MASTER_TABLES,
  };
}
