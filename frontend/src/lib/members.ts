/**
 * Jembatan antara anggota cloud (akun Google) dan tabel `users` lokal (login
 * username + PIN).
 *
 * Dua identitas ini sengaja tidak digabung. Login PIN tetap jadi jalur utama
 * di mesin kasir — cepat, jalan tanpa internet, dan tidak menaruh kredensial
 * Google di perangkat toko. Yang ditambahkan cloud adalah: daftar karyawan
 * jadi konsisten di semua perangkat, dan pencabutan akses berlaku dari sisi
 * server, bukan hanya dari perangkat tempat karyawan dihapus.
 */
import { db, type User, type PermissionKey, ALL_PERMISSIONS } from './db';
import {
  fetchStoreMembers,
  type StoreMember,
  type StoreRole,
} from './cloud-api';

/** Peran cloud -> peran lokal. ADMIN cloud tetap 'staff' lokal, tapi dengan
 *  seluruh permission; 'owner' lokal disediakan hanya untuk OWNER cloud. */
function toLocalRole(role: StoreRole): User['role'] {
  return role === 'OWNER' ? 'owner' : 'staff';
}

function toLocalPermissions(member: StoreMember): PermissionKey[] {
  if (member.role === 'OWNER' || member.role === 'ADMIN') return [...ALL_PERMISSIONS];
  const dari = member.permissions ?? [];
  return ALL_PERMISSIONS.filter((p) => dari.includes(p));
}

/** Username lokal dari email, dibuat unik dengan akhiran angka bila bentrok. */
export async function buildUsername(email: string | null, fallback: string): Promise<string> {
  const dasar = (email?.split('@')[0] ?? fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 18) || 'karyawan';

  let kandidat = dasar;
  let n = 1;
  while (await db.users.where('username').equals(kandidat).first()) {
    kandidat = `${dasar}${n}`.slice(0, 20);
    n++;
  }
  return kandidat;
}

export interface MemberSyncResult {
  ditambahkan: number;
  diperbarui: number;
  dinonaktifkan: number;
}

/**
 * Menarik daftar anggota dari cloud dan mencerminkannya ke tabel `users`.
 *
 * Anggota yang hilang dari cloud **dinonaktifkan**, bukan dihapus: baris user
 * masih dirujuk oleh transaksi lama lewat `createdBy`, jadi menghapusnya akan
 * membuat riwayat kehilangan nama kasirnya.
 *
 * User lokal murni (tanpa `cloudUserId`) tidak disentuh sama sekali — toko
 * boleh tetap punya kasir yang hanya ada di satu perangkat.
 */
export async function syncCloudMembers(storeId: string): Promise<MemberSyncResult> {
  const { members } = await fetchStoreMembers(storeId);

  const lokal = await db.users.toArray();
  const byCloudId = new Map(
    lokal.filter((u) => u.cloudUserId).map((u) => [u.cloudUserId as string, u]),
  );

  const hasil: MemberSyncResult = { ditambahkan: 0, diperbarui: 0, dinonaktifkan: 0 };
  const now = new Date();
  const terlihat = new Set<string>();

  for (const m of members) {
    terlihat.add(m.userId);
    const existing = byCloudId.get(m.userId);
    const permissions = toLocalPermissions(m);
    const role = toLocalRole(m.role);

    if (existing) {
      await db.users.update(existing.id!, {
        name: m.name ?? existing.name,
        cloudEmail: m.email ?? null,
        role,
        permissions,
        isActive: 1,
        updatedAt: now,
      });
      hasil.diperbarui++;
      continue;
    }

    // Anggota baru dari cloud belum punya PIN. `pinHash` kosong membuat
    // `verifyLogin` selalu gagal — disengaja: karyawan menetapkan PIN-nya
    // sendiri di perangkat ini lewat menu Karyawan.
    await db.users.add({
      username: await buildUsername(m.email, `user${m.userId.slice(-4)}`),
      pinHash: '',
      name: m.name ?? m.email ?? 'Karyawan',
      role,
      permissions,
      isActive: 1,
      createdAt: now,
      lastLoginAt: null,
      updatedAt: now,
      cloudUserId: m.userId,
      cloudEmail: m.email ?? null,
    } as User);
    hasil.ditambahkan++;
  }

  // Dicabut di cloud -> nonaktif di sini.
  for (const [cloudId, u] of byCloudId) {
    if (terlihat.has(cloudId) || u.isActive === 0) continue;
    await db.users.update(u.id!, { isActive: 0, updatedAt: now });
    hasil.dinonaktifkan++;
  }

  return hasil;
}

/** Apakah baris user lokal ini dikelola cloud (perannya tidak boleh diedit di sini). */
export function isCloudManaged(user: Pick<User, 'cloudUserId'>): boolean {
  return !!user.cloudUserId;
}

/** Anggota cloud yang belum menetapkan PIN di perangkat ini. */
export function belumPunyaPin(user: Pick<User, 'cloudUserId' | 'pinHash'>): boolean {
  return !!user.cloudUserId && !user.pinHash;
}

/**
 * Anggota cloud di perangkat ini yang belum menetapkan PIN, untuk email Google
 * yang sedang masuk. Dipakai gerbang akun untuk memutuskan apakah layar
 * "buat PIN" perlu ditampilkan setelah hidrasi.
 *
 * Dua penjagaan yang menentukan:
 *
 * 1. Hanya perangkat multi-user yang memunculkan `LoginScreen`, jadi hanya di
 *    situ PIN ada gunanya. Tanpa ini pemilik toko ikut diminta PIN saat
 *    install ulang — `syncCloudMembers` membuat baris untuk dirinya sendiri
 *    dengan `pinHash` kosong juga, persis seperti karyawan.
 * 2. Dicocokkan lewat `cloudEmail`, bukan `cloudUserId`: email adalah satu-
 *    satunya penghubung yang pasti ada di kedua sisi saat layar itu diputuskan.
 */
export async function cariUserTanpaPin(email: string | null): Promise<User | null> {
  if (!email) return null;

  const settings = await db.storeSettings.toCollection().first();
  if (!settings?.multiUserEnabled) return null;

  const target = email.trim().toLowerCase();
  if (!target) return null;

  const users = await db.users.toArray();
  return (
    users.find(
      (u) => u.isActive === 1 && !u.pinHash && (u.cloudEmail ?? '').toLowerCase() === target,
    ) ?? null
  );
}
