import type { TileTone } from '@/components/jokoui/service-tile';

/**
 * Sistem pengenal kategori.
 *
 * Enam warna, dan satu urusan selalu memegang nomor yang sama di seluruh app:
 * ubin menu Beranda, pita kategori Kasir, thumbnail produk, ikon daftar
 * transaksi. Mata pemilik warung belajar sekali, lalu memakainya di mana-mana.
 *
 * Nomor untuk tujuan tetap (menu, jenis catatan) ditulis di `ROUTE_TONE`
 * supaya tidak pernah ditebak di tempat pemakaian. Nomor untuk data yang
 * dibuat user (kategori produk, kategori pengeluaran) dihitung dari namanya
 * lewat `toneForName`, supaya kategori "Minuman" memegang warna yang sama
 * hari ini dan bulan depan, di HP mana pun, tanpa perlu kolom baru di Dexie.
 *
 * Batasnya jujur dan disengaja: enam warna berarti kategori ketujuh mulai
 * mengulang warna. Itu memang utang sistem yang sudah dicatat di surface
 * brief — mengulang warna jauh lebih baik daripada menambah warna sampai
 * tidak ada lagi yang bisa dikenali.
 */
export const ROUTE_TONE = {
  '/cashier': 1,
  '/products': 6,
  '/stock-in': 2,
  '/stock-out': 4,
  '/debts': 3,
  '/expenses': 5,
  '/reports': 1,
  '/customers': 2,
  '/supplier': 6,
  '/history': 1,
  '/stock-report': 6,
  '/users': 5,
  '/settings': 3,
} as const satisfies Record<string, TileTone>;

/** Nomor kategori untuk sebuah rute; 1 bila rutenya tidak terdaftar. */
export function toneForRoute(path: string): TileTone {
  return (ROUTE_TONE as Record<string, TileTone>)[path] ?? 1;
}

/**
 * Nomor kategori dari ID barisnya — cara yang benar dan yang harus dipakai
 * kalau ID-nya ada.
 *
 * ID Dexie berurut, jadi enam kategori pertama dijamin dapat enam warna
 * yang berbeda. Ini bukan detail: seluruh gunanya sistem pengenal adalah
 * dua kategori bertetangga terlihat berbeda, dan hash nama tidak bisa
 * menjanjikan itu.
 */
export function toneForId(id: number | null | undefined): TileTone {
  if (id == null || !Number.isFinite(id)) return 1;
  return (((Math.abs(Math.trunc(id)) - 1) % 6) + 1) as TileTone;
}

/**
 * Nomor kategori dari nama. Cadangan untuk barang yang belum punya
 * kategori, bukan jalur utama.
 *
 * Catatan jujur soal batasnya: hash apa pun atas enam nilai akan menabrak.
 * Pada layar nyata, "Makanan" dan "Minuman" jatuh ke warna yang sama dan
 * hampir seluruh kisi produk berubah ungu — sistem pengenalnya mati persis
 * di tempat ia paling dibutuhkan. Karena itu pemanggil yang punya ID
 * kategori WAJIB memakai `toneForId`; fungsi ini hanya untuk yang tidak
 * punya apa-apa selain nama.
 *
 * Penyebarannya diperbaiki dengan mencampur panjang string ke dalam hash
 * dan memutar bitnya, supaya nama pendek yang berawalan sama tidak lagi
 * menumpuk di ember yang sama.
 */
export function toneForName(name: string | null | undefined): TileTone {
  if (!name) return 1;
  let hash = 5381 ^ name.length;
  for (let i = 0; i < name.length; i += 1) {
    hash = (((hash << 5) + hash) ^ name.charCodeAt(i)) | 0;
    hash = ((hash << 13) | (hash >>> 19)) | 0;
  }
  return ((Math.abs(hash) % 6) + 1) as TileTone;
}

/** Kelas tint + tinta untuk sebuah nomor kategori. */
export const TONE_SURFACE: Record<TileTone, string> = {
  1: 'bg-cat-1-bg text-cat-1-on',
  2: 'bg-cat-2-bg text-cat-2-on',
  3: 'bg-cat-3-bg text-cat-3-on',
  4: 'bg-cat-4-bg text-cat-4-on',
  5: 'bg-cat-5-bg text-cat-5-on',
  6: 'bg-cat-6-bg text-cat-6-on',
};

/** Kelas isian solid — titik penanda, batang grafik, badge. */
export const TONE_SOLID: Record<TileTone, string> = {
  1: 'bg-cat-1',
  2: 'bg-cat-2',
  3: 'bg-cat-3',
  4: 'bg-cat-4',
  5: 'bg-cat-5',
  6: 'bg-cat-6',
};
