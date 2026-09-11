/**
 * Migrasi kunci localStorage dari prefiks brand lama (`kanpos_`) ke `kanpos_`.
 *
 * Rename brand tidak boleh membuat user ter-logout atau kehilangan preferensi.
 * Nilai lama dipindahkan sekali saat aplikasi boot, sebelum modul lain sempat
 * membacanya — karena itu fungsi ini dipanggil di `main.tsx`, bukan di dalam
 * komponen. Kunci lama dihapus setelah dipindahkan supaya migrasi ini idempoten
 * dan tidak menimpa nilai baru pada boot berikutnya.
 *
 * Aman dihapus setelah semua instalasi lama dipastikan sudah melewati satu boot.
 */
const RENAMES: ReadonlyArray<readonly [legacy: string, current: string]> = [
  ['kanpos_skip_account_v1', 'kanpos_skip_account_v1'],
  ['kanpos_setup_checklist_dismissed_v1', 'kanpos_setup_checklist_dismissed_v1'],
  ['kanpos_install_banner_dismissed_v1', 'kanpos_install_banner_dismissed_v1'],
  ['kanpos_money_hidden_v1', 'kanpos_money_hidden_v1'],
  ['kanpos_cloud_session_v2', 'kanpos_cloud_session_v2'],
  ['kanpos_cloud_token_v1', 'kanpos_cloud_token_v1'],
];

export function migrateLegacyStorageKeys() {
  try {
    for (const [legacy, current] of RENAMES) {
      const value = localStorage.getItem(legacy);
      if (value === null) continue;
      // Nilai baru menang: kalau sudah ada, yang lama cuma dibuang.
      if (localStorage.getItem(current) === null) localStorage.setItem(current, value);
      localStorage.removeItem(legacy);
    }
  } catch {
    /* localStorage diblokir (mode privat) — tidak ada yang perlu dimigrasi */
  }
}
