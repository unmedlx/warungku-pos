/**
 * Keputusan user untuk memakai KanPOS tanpa akun cloud.
 *
 * Disimpan terpisah dari `storeSettings` karena harus bisa dibaca **sebelum**
 * ada baris toko sama sekali — yaitu tepat di gerbang akun. Tanpa penanda ini,
 * user yang memilih "lanjut tanpa akun" akan ditanya lagi setiap membuka
 * aplikasi sampai onboarding selesai.
 */
const KEY = 'kanpos_skip_account_v1';

export function hasSkippedAccountGate(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setSkippedAccountGate(skipped: boolean) {
  try {
    if (skipped) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* localStorage diblokir (mode privat) — cukup jalan tanpa penanda */
  }
}
