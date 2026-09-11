import type { Admin } from './types';

/**
 * Berbeda dari `dashboard/`, yang menyimpan Google ID token mentah dan ikut
 * mati bersamanya (±1 jam). Panel admin menukar ID token itu sekali di
 * `POST /api/admin/auth/google` dan menyimpan sesi milik backend — umurnya
 * `ADMIN_SESSION_HOURS`, jadi telusuran data tidak terputus di tengah jalan.
 */
const KEY = 'kanpos_admin_session';
const LEGACY_KEY = 'kankitu_admin_session';

/**
 * Rename brand mengubah nama kunci ini; nilai lama dipindahkan sekali supaya
 * sesi yang sedang berjalan tidak ikut hilang. Aman dihapus setelah semua
 * pemakai melewati satu kali muat halaman.
 */
(function migrateLegacyKey() {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      if (localStorage.getItem(KEY) === null) localStorage.setItem(KEY, legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    /* localStorage diblokir — tidak ada yang perlu dimigrasi */
  }
})();


export interface Session {
  token: string;
  expiresAt: string;
  admin: Admin;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    // Kedaluwarsa dicek di sini semata agar tidak menampilkan layar kosong
    // sesaat sebelum 401 datang. Yang menentukan tetap backend.
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* mode privat / storage penuh — sesi jadi sekali pakai saja */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}
