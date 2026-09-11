import { jwtDecode } from 'jwt-decode';

/**
 * Penyimpanan sesi Cloud API.
 *
 * Dulu yang disimpan di sini adalah Google ID token mentah. Token itu mati
 * ±1 jam — tidak masalah selagi cloud cuma dipakai untuk backup, tapi sejak
 * login jadi gerbang aplikasi, user akan terlempar keluar tiap jam. Sekarang
 * Google ID token ditukar sekali di `POST /api/auth/session` dengan pasangan
 * access + refresh milik backend, dan yang disimpan adalah pasangan itu.
 */

const SESSION_KEY = 'kanpos_cloud_session_v2';
/** Kunci lama berisi Google ID token mentah; masih dibaca sekali untuk migrasi. */
const LEGACY_TOKEN_KEY = 'kanpos_cloud_token_v1';

export interface CloudSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
    picture?: string | null;
  };
}

export interface GoogleIdClaims {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  exp?: number; // detik epoch
}

export function saveSession(session: CloudSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function loadSession(): CloudSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CloudSession;
    return parsed?.accessToken && parsed?.refreshToken ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

/**
 * Google ID token yang tersimpan dari versi aplikasi sebelumnya. Umurnya
 * pendek, jadi hanya berguna untuk sekali tukar jadi sesi baru — kalau sudah
 * kedaluwarsa, user memang harus login lagi.
 */
export function takeLegacyGoogleToken(): string | null {
  const token = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (!token) return null;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  return isTokenValid(token) ? token : null;
}

export function decodeClaims(token: string): GoogleIdClaims | null {
  try {
    return jwtDecode<GoogleIdClaims>(token);
  } catch {
    return null;
  }
}

/** Token dianggap valid bila bisa di-decode dan belum kadaluarsa (margin 30 dtk). */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const claims = decodeClaims(token);
  if (!claims?.exp) return false;
  return claims.exp * 1000 - 30_000 > Date.now();
}

/** Access token perlu diperpanjang bila sisa umurnya di bawah 5 menit. */
export function needsRefresh(session: CloudSession | null): boolean {
  if (!session) return false;
  const exp = Date.parse(session.expiresAt);
  if (Number.isNaN(exp)) return true;
  return exp - Date.now() < 5 * 60_000;
}

/** Refresh token habis → user memang harus masuk ulang. */
export function isRefreshExpired(session: CloudSession | null): boolean {
  if (!session) return true;
  const exp = Date.parse(session.refreshExpiresAt);
  if (Number.isNaN(exp)) return false;
  return exp <= Date.now();
}
