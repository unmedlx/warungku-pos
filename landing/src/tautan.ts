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

/**
 * Alamat API KanPOS Cloud. Halaman /download mengambil versi terbaru dan link
 * installer dari sini. Isi `VITE_API_BASE_URL` saat build produksi.
 */
export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3210"
).replace(/\/+$/, "");

export const TAUTAN = {
  /** Halaman download installer Android & Windows (di luar Play Store). */
  download: "/download",
  /** PWA — bisa langsung dipakai dari browser tanpa install. */
  aplikasiWeb: "https://www.kasirgratisan.com",
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

/**
 * Jatah bulanan fitur AI untuk pengguna gratis. HARUS sama dengan konfigurasi
 * backend (`backend/src/config/index.ts` → `VISION_FREE_QUOTA` dan
 * `VOICE_CART_FREE_QUOTA`), karena angka inilah yang benar-benar dipakai server
 * saat menolak permintaan.
 *
 * Catatan penting soal `scan`: foto rak dan dikte produk berbagi SATU jatah yang
 * sama, dan paket berbayar tidak menaikkannya — semua paket di
 * `backend/prisma/seed.ts` masih `aiScanQuota: 0`, jadi yang dipakai selalu
 * `VISION_FREE_QUOTA`. Kalau suatu saat paket diberi kuota sendiri, kalimat di
 * `Harga.tsx` dan `Ai.tsx` ikut diubah.
 *
 * `kasirSuara` beda: berlangganan paket apa pun membuatnya tanpa batas
 * (`voice-cart/service.ts` → `hasActiveSubscription`).
 */
export const KUOTA_AI = {
  /** Foto rak + dikte produk, digabung. */
  scan: 5,
  /** Sesi keranjang suara per bulan. */
  kasirSuara: 10,
} as const;
