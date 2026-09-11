import { verifyGoogleIdToken } from '@/lib/google';
import { signAdminSession } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { config } from '@/config';
import { ForbiddenError, UnauthorizedError } from '@/lib/error';

/**
 * Menukar Google ID token dengan sesi admin. Login tetap lewat Google supaya
 * tidak ada kata sandi baru yang harus dijaga; yang berubah hanyalah token
 * Google dipakai sekali di gerbang, bukan berkali-kali sepanjang sesi.
 *
 * Berbeda dari `middleware/auth.ts`, endpoint ini **tidak membuat user baru**.
 * Akun harus sudah ada dan sudah berperan admin — kecuali emailnya terdaftar
 * di `ADMIN_EMAILS`, yang dipakai untuk menyemai admin pertama.
 */
export async function loginWithGoogle(idToken: string) {
  const payload = await verifyGoogleIdToken(idToken).catch(() => {
    throw new UnauthorizedError('Token Google tidak valid');
  });

  // Penyemaian hanya berlaku untuk email yang Google sendiri sudah pastikan
  // kepemilikannya. Tanpa syarat ini, klaim email pada token yang belum
  // terverifikasi cukup untuk mengklaim kursi admin.
  const bolehDisemai =
    payload.emailVerified && config.ADMIN_EMAILS.includes(payload.email.toLowerCase());

  let user = await prisma.user.findUnique({ where: { googleSub: payload.sub } });

  if (!user) {
    // Jalur khusus database yang masih kosong: tanpa ini tidak ada cara masuk
    // sama sekali, karena panel memang tidak membuat pengguna biasa.
    if (!bolehDisemai) {
      // Pesan sengaja sama dengan kasus "bukan admin" agar panel ini tidak bisa
      // dipakai menebak email mana yang terdaftar sebagai admin.
      throw new ForbiddenError('Akun ini tidak punya akses admin');
    }
    user = await prisma.user.create({
      data: {
        googleSub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        role: 'SUPERADMIN',
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'admin.seed',
        targetType: 'User',
        targetId: user.id,
        reason: 'Akun admin pertama dibuat dari ADMIN_EMAILS',
        after: { role: 'SUPERADMIN', email: user.email },
      },
    });
  } else if (user.deletedAt) {
    throw new ForbiddenError('Akun ini dinonaktifkan');
  } else if (user.role === 'USER') {
    if (!bolehDisemai) throw new ForbiddenError('Akun ini tidak punya akses admin');
    user = await prisma.user.update({ where: { id: user.id }, data: { role: 'SUPERADMIN' } });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'admin.seed',
        targetType: 'User',
        targetId: user.id,
        reason: 'Diangkat otomatis dari ADMIN_EMAILS',
        before: { role: 'USER' },
        after: { role: 'SUPERADMIN' },
      },
    });
  }

  const role = user.role;

  const { token, expiresAt } = signAdminSession({
    sub: user.id,
    role: role as 'ADMIN' | 'SUPERADMIN',
  });

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    admin: {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role,
    },
  };
}
