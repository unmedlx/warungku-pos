/**
 * Backend memverifikasi Google ID token langsung pada tiap request
 * (`middleware/auth.ts`), jadi dashboard cukup menyimpan token itu.
 * Token Google berumur ±1 jam — sesi berakhir sendiri, dan 401 dari API
 * dipakai sebagai sinyal untuk meminta login ulang.
 */
const KEY = 'kanpos_dashboard_token';
const LEGACY_KEY = 'kankitu_dashboard_token';

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


export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* mode privat / storage penuh — sesi jadi sekali pakai saja */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}
