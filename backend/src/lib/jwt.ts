import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { UnauthorizedError } from '@/lib/error';

/**
 * Sesi panel admin. Berbeda dari autentikasi modul lain yang memverifikasi
 * Google ID token pada setiap request: token Google mati ±1 jam, terlalu
 * pendek untuk sesi kerja admin. Google tetap jadi cara login — ID token-nya
 * ditukar sekali di gerbang (`POST /api/admin/auth/google`) menjadi token ini.
 */
export interface AdminSessionPayload {
  sub: string;
  role: 'ADMIN' | 'SUPERADMIN';
}

const ISSUER = 'kanpos-admin';
/** Issuer lama; masih diterima saat verifikasi supaya sesi yang sedang
 *  berjalan tidak putus setelah rename brand. Aman dihapus setelah semua
 *  token lama kedaluwarsa (ADMIN_SESSION_HOURS). */
const LEGACY_ISSUER = 'kankitu-admin';

export function signAdminSession(payload: AdminSessionPayload): { token: string; expiresAt: Date } {
  const expiresInSec = config.ADMIN_SESSION_HOURS * 3600;
  const token = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: expiresInSec,
    issuer: ISSUER,
  });
  return { token, expiresAt: new Date(Date.now() + expiresInSec * 1000) };
}

export function verifyAdminSession(token: string): AdminSessionPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, { issuer: [ISSUER, LEGACY_ISSUER] });
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new Error('Payload token tidak lengkap');
    }
    return { sub: String(decoded.sub), role: (decoded as jwt.JwtPayload).role };
  } catch {
    // Pesan sengaja seragam — jangan bocorkan apakah token kedaluwarsa,
    // salah tanda tangan, atau salah issuer.
    throw new UnauthorizedError('Sesi admin tidak valid atau sudah berakhir');
  }
}

/* ── Sesi aplikasi kasir ──────────────────────────────────────────────
 * Alasannya sama dengan sesi admin: Google ID token mati ±1 jam. Selama
 * cloud masih opsional itu tidak fatal, tapi sejak login jadi gerbang
 * aplikasi, user akan terlempar keluar tiap jam. Google ID token ditukar
 * sekali di `POST /api/auth/session` menjadi pasangan access + refresh.
 *
 * Refresh token sengaja stateless (tanpa tabel di database): setiap request
 * tetap memuat ulang user dari database, jadi suspend/soft-delete langsung
 * berlaku tanpa perlu daftar token yang dicabut.
 */

export interface AppSessionPayload {
  sub: string;
}

const APP_ISSUER = 'kanpos-app';
const APP_REFRESH_ISSUER = 'kanpos-app-refresh';
/** Issuer lama; lihat catatan pada LEGACY_ISSUER di atas. Token aplikasi lama
 *  tetap lolos verifikasi sampai kedaluwarsa (APP_REFRESH_DAYS). */
export const LEGACY_APP_ISSUER = 'kankitu-app';
const LEGACY_APP_REFRESH_ISSUER = 'kankitu-app-refresh';

export function signAppSession(userId: string): { token: string; expiresAt: Date } {
  const expiresInSec = config.APP_SESSION_HOURS * 3600;
  const token = jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: expiresInSec,
    issuer: APP_ISSUER,
  });
  return { token, expiresAt: new Date(Date.now() + expiresInSec * 1000) };
}

export function signAppRefresh(userId: string): { token: string; expiresAt: Date } {
  const expiresInSec = config.APP_REFRESH_DAYS * 86400;
  const token = jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: expiresInSec,
    issuer: APP_REFRESH_ISSUER,
  });
  return { token, expiresAt: new Date(Date.now() + expiresInSec * 1000) };
}

/** Dipakai middleware `authenticate`; melempar bila bukan token sesi aplikasi. */
export function verifyAppSession(token: string): AppSessionPayload {
  return verifyWithIssuer(token, [APP_ISSUER, LEGACY_APP_ISSUER], 'Sesi tidak valid atau sudah berakhir');
}

export function verifyAppRefresh(token: string): AppSessionPayload {
  return verifyWithIssuer(token, [APP_REFRESH_ISSUER, LEGACY_APP_REFRESH_ISSUER], 'Sesi sudah berakhir, silakan masuk lagi');
}

function verifyWithIssuer(
  token: string,
  issuer: [string, ...string[]],
  message: string,
): AppSessionPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, { issuer });
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new Error('Payload token tidak lengkap');
    }
    return { sub: String(decoded.sub) };
  } catch {
    // Pesan seragam — jangan bocorkan apakah token kedaluwarsa, salah tanda
    // tangan, atau salah issuer.
    throw new UnauthorizedError(message);
  }
}
