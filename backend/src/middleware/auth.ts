import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { LEGACY_APP_ISSUER, verifyAdminSession, verifyAppSession } from '@/lib/jwt';
import { resolveGoogleUser } from '@/modules/auth/service';
import { prisma } from '@/lib/db';
import { AppError, ForbiddenError, UnauthorizedError } from '@/lib/error';

/**
 * Dua jenis token diterima di header yang sama:
 *
 * - token sesi aplikasi (`iss: kanpos-app`, atau issuer lama sebelum rename
 *   brand) — jalur normal sejak login jadi
 *   gerbang aplikasi, umurnya jam-an dan bisa di-refresh;
 * - Google ID token mentah — dipertahankan supaya versi aplikasi lama yang
 *   sudah terpasang tidak langsung kehilangan akses saat backend di-deploy.
 */
function isAppSessionToken(token: string): boolean {
  const decoded = jwt.decode(token, { complete: true });
  return decoded?.payload && typeof decoded.payload !== 'string'
    ? decoded.payload.iss === 'kanpos-app' || decoded.payload.iss === LEGACY_APP_ISSUER
    : false;
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Tidak terautentikasi', 401);
    }

    const token = authHeader.slice(7);

    if (isAppSessionToken(token)) {
      // User dimuat ulang dari database tiap request, bukan dibaca dari token,
      // supaya suspend akun langsung berlaku tanpa menunggu token habis.
      const { sub } = verifyAppSession(token);
      const user = await prisma.user.findUnique({ where: { id: sub } });

      if (!user) throw new UnauthorizedError('Sesi tidak valid atau sudah berakhir');
      if (user.deletedAt) {
        throw new ForbiddenError('Akun ini dinonaktifkan. Hubungi dukungan KanPOS.');
      }

      req.user = user;
      next();
      return;
    }

    const { user } = await resolveGoogleUser(token);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  authenticate(req, res, (err: unknown) => {
    if (err) {
      req.user = undefined;
      req.googlePayload = undefined;
    }
    next();
  });
}

/**
 * Gerbang panel admin. Memverifikasi sesi JWT milik backend (bukan token
 * Google), lalu memuat ulang user dari database pada tiap request — supaya
 * pencabutan role atau suspend langsung berlaku, tanpa menunggu token habis.
 */
export async function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Sesi admin tidak ditemukan');
    }

    const payload = verifyAdminSession(authHeader.slice(7));
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('Sesi admin tidak valid atau sudah berakhir');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Dipasang setelah `authenticateAdmin`. Role dibaca dari database, bukan token. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
    next(new ForbiddenError('Akses admin ditolak'));
    return;
  }
  next();
}

/** Untuk aksi yang hanya boleh dilakukan superadmin, mis. mengangkat admin baru. */
export function requireSuperadmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'SUPERADMIN') {
    next(new ForbiddenError('Hanya superadmin yang boleh melakukan ini'));
    return;
  }
  next();
}
