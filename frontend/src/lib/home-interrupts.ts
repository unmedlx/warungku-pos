import { useCallback, useSyncExternalStore } from 'react';

/**
 * Satu tempat untuk memutuskan *apa* yang boleh menyela di Beranda.
 *
 * Sebelumnya lima kartu ajakan (sesi habis, checklist, hubungkan akun,
 * ingat backup, pasang aplikasi) masing-masing memutuskan sendiri kapan
 * tampil. Tiap keputusannya benar; yang salah adalah kelimanya bisa benar
 * di saat yang sama, dan angka penjualan hari ini — alasan orang membuka
 * aplikasi — terdorong ke bawah lipatan.
 *
 * `HOME_INTERRUPTS` di bawah mengurutkan mereka dari yang paling tidak bisa
 * ditunda, dan `HomeInterrupt` hanya merender satu.
 */

/** Urut dari prioritas tertinggi. Urutan array **adalah** prioritasnya. */
export const HOME_INTERRUPTS = [
  /* Data transaksi tertahan dan tidak bisa naik ke cloud. Tidak bisa
     ditutup, jadi selalu menang. */
  'session-expired',
  /* Toko baru yang setup-nya belum kelar. Item ke-4 checklist ini adalah
     backup, jadi sengaja di atas `backup` supaya pesannya tidak dobel. */
  'setup',
  /* Sudah pernah jualan tapi datanya masih di satu HP saja. Solusi permanen
     untuk masalah yang sama dengan `backup`, jadi didahulukan. */
  'link-account',
  /* Sudah punya akun, tapi sudah lewat 24 jam sejak backup terakhir. */
  'backup',
  /* Kenyamanan, bukan risiko. Paling akhir. */
  'install',
] as const;

export type HomeInterruptId = (typeof HOME_INTERRUPTS)[number];

/** Kunci localStorage per interupsi yang penutupannya permanen di device ini. */
export const DISMISS_KEYS = {
  setup: 'kanpos_setup_checklist_dismissed_v1',
  'link-account': 'kanpos_link_account_dismissed_v1',
  install: 'kanpos_install_banner_dismissed_v1',
} as const satisfies Partial<Record<HomeInterruptId, string>>;

export type DismissKey = (typeof DISMISS_KEYS)[keyof typeof DISMISS_KEYS];

/* ------------------------------------------------------------------ *
 * Store dismiss
 *
 * Kenapa tidak `useState` di dalam tiap komponen seperti sebelumnya:
 * `HomeInterrupt` perlu tahu kartu mana yang sudah ditutup untuk memilih
 * kandidat berikutnya. Dengan state lokal, menutup kartu teratas tidak
 * memberi tahu induknya, jadi Beranda akan kosong sampai halaman dimuat
 * ulang. Store kecil ini membuat penutupan langsung terlihat oleh semua
 * pembaca.
 * ------------------------------------------------------------------ */

const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  // Tab/jendela lain (PWA bisa terbuka dua kali) ikut sinkron.
  window.addEventListener('storage', fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', fn);
  };
}

function emit() {
  for (const fn of listeners) fn();
}

function read(key: DismissKey): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    // Mode privat / storage diblokir: anggap belum ditutup. Kartunya muncul
    // lagi tiap buka, tapi itu jauh lebih baik daripada Beranda gagal render.
    return false;
  }
}

export function dismissInterrupt(key: DismissKey) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* lihat alasan di `read` */
  }
  emit();
}

/** `[sudahDitutup, tutup]` — reaktif lintas komponen. */
export function useDismissed(key: DismissKey): [boolean, () => void] {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false, // SSR/prerender: jangan pernah anggap sudah ditutup
  );
  const dismiss = useCallback(() => dismissInterrupt(key), [key]);
  return [dismissed, dismiss];
}

/**
 * Interupsi berprioritas tertinggi yang sedang layak tampil, atau `null`.
 *
 * `visible` dikirim dari `HomeInterrupt` sebagai hasil hook masing-masing
 * komponen, supaya syarat tampilnya tetap tinggal di komponen yang
 * bersangkutan — modul ini hanya memegang urutannya.
 */
export function pickInterrupt(visible: Partial<Record<HomeInterruptId, boolean>>): HomeInterruptId | null {
  return HOME_INTERRUPTS.find((id) => visible[id]) ?? null;
}
