/**
 * Sumber tunggal untuk semua tautan keluar di landing.
 *
 * Nilainya diambil dari yang benar-benar dipakai aplikasi (`frontend/src`,
 * `frontend/index.html`), bukan tebakan — supaya pengunjung tidak mendarat di
 * halaman yang berbeda dari yang dijanjikan di sini.
 *
 * Catatan: domain kanal saat ini masih campur (kasirgratisan.com untuk aplikasi,
 * freekasir.com untuk syarat/privasi & komunitas, kankitu.com untuk dashboard).
 * Begitu domain dikonsolidasi, cukup ubah di berkas ini.
 */

export const TAUTAN = {
  /** PWA — bisa langsung dipakai dari browser tanpa install. */
  aplikasiWeb: "https://www.kasirgratisan.com",
  /** Aplikasi Android (printer bluetooth paling lancar di sini). */
  playStore:
    "https://play.google.com/store/apps/details?id=gus.kanpos.kodi",
  /** Dashboard pemilik: ringkasan semua toko, dibuka dari browser. */
  dashboard: "https://dashboard.kankitu.com",
  /** Etalase toko online yang dipublikasikan dari aplikasi. */
  tokoOnline: "https://market.freekasir.com",
  whatsapp: "https://s.id/wafreekasir",
  telegram: "https://t.me/freekasir",
  syarat: "https://freekasir.com/terms",
  privasi: "https://freekasir.com/privacy",
  laporKendala: "https://kasirgratisan.fider.io",
} as const;
