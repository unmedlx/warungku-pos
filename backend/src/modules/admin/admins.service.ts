import { prisma } from '@/lib/db';
import { config } from '@/config';
import { BadRequestError, NotFoundError } from '@/lib/error';

/**
 * Kelola siapa yang boleh masuk panel admin. "Admin" bukan tabel tersendiri:
 * ia adalah `User` dengan `role` ADMIN atau SUPERADMIN, sama seperti yang
 * dibaca `auth.service` saat login. Jadi mengangkat admin = mengubah role akun
 * yang sudah ada, bukan membuat akun baru.
 *
 * Konsekuensinya yang harus dijelaskan ke pemakai panel: orang yang diangkat
 * **harus sudah pernah masuk** ke KanPOS dengan Google-nya, karena panel ini
 * tidak pernah membuat pengguna (lihat catatan di `auth.service.ts`).
 */

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  role: 'ADMIN' | 'SUPERADMIN';
  suspended: boolean;
  /** Berasal dari ADMIN_EMAILS — rolenya akan dipulihkan otomatis saat login. */
  seeded: boolean;
  lastActionAt: string | null;
  createdAt: string;
}

export async function listAdmins(): Promise<{ admins: AdminAccount[] }> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      picture: true,
      role: true,
      deletedAt: true,
      createdAt: true,
    },
  });

  // Satu query untuk semua, bukan satu per admin: daftarnya kecil tapi pola
  // N+1 di sini gampang menular ke layar lain.
  const terakhir = await prisma.auditLog.groupBy({
    by: ['actorId'],
    where: { actorId: { in: users.map((u) => u.id) } },
    _max: { createdAt: true },
  });
  const petaTerakhir = new Map(terakhir.map((r) => [r.actorId, r._max.createdAt]));

  const disemai = new Set(config.ADMIN_EMAILS.map((e) => e.toLowerCase()));

  return {
    admins: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      picture: u.picture,
      role: u.role as 'ADMIN' | 'SUPERADMIN',
      suspended: Boolean(u.deletedAt),
      seeded: disemai.has(u.email.toLowerCase()),
      lastActionAt: petaTerakhir.get(u.id)?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  };
}

/**
 * Mengangkat akun yang sudah ada menjadi ADMIN atau SUPERADMIN. Pencarian
 * memakai email yang tidak peka huruf besar-kecil karena itulah yang diketik
 * orang, sementara `email` di skema tidak unik (unik-nya `googleSub`), jadi
 * email kembar ditolak alih-alih ditebak.
 */
export async function setAdminRole(email: string, role: 'ADMIN' | 'SUPERADMIN') {
  const kandidat = await prisma.user.findMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, name: true, email: true, role: true, deletedAt: true },
  });

  if (kandidat.length === 0) {
    throw new NotFoundError(
      'Tidak ada akun dengan email itu. Orangnya harus masuk ke KanPOS lewat Google dulu, baru bisa diangkat jadi admin.',
    );
  }
  if (kandidat.length > 1) {
    throw new BadRequestError(
      'Ada lebih dari satu akun dengan email itu. Angkat lewat detail pengguna supaya akunnya pasti benar.',
    );
  }

  const user = kandidat[0]!;
  if (user.deletedAt) throw new BadRequestError('Akun ini sedang disuspend. Aktifkan dulu.');
  if (user.role === role) throw new BadRequestError(`${user.name} sudah berperan ${role}.`);

  const updated = await prisma.user.update({ where: { id: user.id }, data: { role } });

  return {
    user: { id: updated.id, name: updated.name, email: updated.email },
    before: { role: user.role },
    after: { role: updated.role },
  };
}

/**
 * Mencabut hak admin — rolenya dikembalikan ke USER, akunnya tetap utuh.
 *
 * Dua pagar yang dipasang di sini, bukan di route, supaya tidak bisa dilewati
 * lewat jalur lain: superadmin tidak boleh mencabut haknya sendiri (kalau
 * salah, panel langsung terkunci untuk dirinya), dan superadmin terakhir tidak
 * boleh dicabut (panel jadi tidak punya siapa pun yang bisa mengangkat admin).
 */
export async function revokeAdmin(targetId: string, actorId: string) {
  if (targetId === actorId) {
    throw new BadRequestError('Tidak bisa mencabut hak admin milik sendiri.');
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan');
  if (user.role === 'USER') throw new BadRequestError('Akun ini bukan admin.');

  if (user.role === 'SUPERADMIN') {
    const sisa = await prisma.user.count({ where: { role: 'SUPERADMIN', deletedAt: null } });
    if (sisa <= 1) {
      throw new BadRequestError(
        'Ini superadmin terakhir. Angkat superadmin lain dulu sebelum mencabut yang ini.',
      );
    }
  }

  const updated = await prisma.user.update({ where: { id: targetId }, data: { role: 'USER' } });

  return {
    user: { id: updated.id, name: updated.name, email: updated.email },
    before: { role: user.role },
    after: { role: updated.role },
  };
}
