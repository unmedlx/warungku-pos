/**
 * Jenis usaha yang dipilih saat onboarding.
 *
 * Ketiganya bukan variasi kecil dari satu alur yang sama — kasirnya berbeda
 * secara mendasar:
 *  - `retail`    warung/klontong: barcode, transaksi cepat, kembalian tunai
 *  - `wholesale` grosir: qty besar, pelanggan langganan, bayar tempo
 *  - `resto`     restoran: per meja, bill terbuka, tiket dapur
 *
 * Karena itu mode ini tidak sekadar menyembunyikan menu, tapi mengubah
 * afordans yang muncul di layar kasir.
 */
export type BusinessMode = 'retail' | 'wholesale' | 'resto';

export const BUSINESS_MODES: BusinessMode[] = ['retail', 'wholesale', 'resto'];

/** Data lama tidak punya `businessMode`; perlakukan sebagai warung. */
export const DEFAULT_BUSINESS_MODE: BusinessMode = 'retail';

export function normalizeBusinessMode(value: string | undefined | null): BusinessMode {
  return BUSINESS_MODES.includes(value as BusinessMode)
    ? (value as BusinessMode)
    : DEFAULT_BUSINESS_MODE;
}

export interface BusinessModeTraits {
  /** Tampilkan tombol scan barcode di kasir. */
  barcode: boolean;
  /** Tampilkan input nomor meja & tombol tiket dapur. */
  tables: boolean;
  /** Tekankan pembayaran tempo/kasbon sejajar dengan bayar lunas. */
  emphasizeDebt: boolean;
  /** Kasir default memakai daftar (grosir) alih-alih grid produk. */
  preferListLayout: boolean;
  /** Tampilkan pemilih pelanggan secara menonjol di kasir. */
  prominentCustomer: boolean;
}

const TRAITS: Record<BusinessMode, BusinessModeTraits> = {
  retail: {
    barcode: true,
    tables: false,
    emphasizeDebt: false,
    preferListLayout: false,
    prominentCustomer: false,
  },
  wholesale: {
    barcode: true,
    tables: false,
    emphasizeDebt: true,
    preferListLayout: true,
    prominentCustomer: true,
  },
  resto: {
    barcode: false,
    tables: true,
    emphasizeDebt: false,
    preferListLayout: false,
    prominentCustomer: false,
  },
};

export function businessModeTraits(mode: BusinessMode | undefined): BusinessModeTraits {
  return TRAITS[normalizeBusinessMode(mode)];
}

/**
 * Turunkan mode kasir dari jawaban "jenis usaha" di onboarding.
 *
 * Onboarding sudah menanyakan hal ini dengan 12 pilihan yang lebih spesifik,
 * jadi tidak perlu bertanya dua kali — cukup dipetakan. Pemilik tetap bisa
 * menimpanya lewat Pengaturan bila tebakannya meleset (mis. toko sembako yang
 * sebenarnya berjualan grosir).
 */
export function businessModeFromType(type: string | undefined | null): BusinessMode {
  switch (type) {
    case 'Coffee Shop':
    case 'Kafe / Resto':
      return 'resto';
    case 'Toko Bangunan':
      return 'wholesale';
    default:
      return 'retail';
  }
}
