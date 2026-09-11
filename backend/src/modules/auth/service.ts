import { User } from '@prisma/client';
import { prisma } from '@/lib/db';
import { verifyGoogleIdToken } from '@/lib/google';
import { signAppRefresh, signAppSession, verifyAppRefresh } from '@/lib/jwt';
import { ForbiddenError, UnauthorizedError } from '@/lib/error';

/**
 * Membuat atau memperbarui user dari Google ID token.
 *
 * Tidak ada endpoint "daftar" yang terpisah: user pertama kali muncul di sini,
 * jadi sign in dan sign up adalah jalur kode yang sama. Frontend membedakan
 * keduanya hanya lewat `isNewUser` untuk keperluan sambutan.
 */
export async function resolveGoogleUser(idToken: string): Promise<{ user: User; isNewUser: boolean }> {
  const payload = await verifyGoogleIdToken(idToken);

  const existing = await prisma.user.findUnique({ where: { googleSub: payload.sub } });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { email: payload.email, name: payload.name, picture: payload.picture },
      })
    : await prisma.user.create({
        data: {
          googleSub: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        },
      });

  if (user.deletedAt) {
    throw new ForbiddenError('Akun ini dinonaktifkan. Hubungi dukungan KanPOS.');
  }

  return { user, isNewUser: !existing };
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
}

function issueTokens(userId: string): SessionTokens {
  const access = signAppSession(userId);
  const refresh = signAppRefresh(userId);
  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    expiresAt: access.expiresAt.toISOString(),
    refreshExpiresAt: refresh.expiresAt.toISOString(),
  };
}

/** Gerbang login: tukar Google ID token dengan sesi milik backend. */
export async function createSession(idToken: string) {
  const { user, isNewUser } = await resolveGoogleUser(idToken);
  return {
    ...issueTokens(user.id),
    isNewUser,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
  };
}

/**
 * Perpanjang sesi. Refresh token ikut diputar supaya token lama yang bocor
 * punya masa pakai terbatas.
 */
export async function refreshSession(refreshToken: string) {
  const payload = verifyAppRefresh(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });

  if (!user) throw new UnauthorizedError('Sesi sudah berakhir, silakan masuk lagi');
  if (user.deletedAt) throw new ForbiddenError('Akun ini dinonaktifkan. Hubungi dukungan KanPOS.');

  return {
    ...issueTokens(user.id),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
  };
}
