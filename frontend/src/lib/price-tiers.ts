import type { PriceTier, Product } from './db';

/**
 * Harga bertingkat — eceran / grosir / partai.
 *
 * Di grosir, menjual 12 dus dengan harga eceran adalah kesalahan yang mahal dan
 * sering terjadi. Karena itu tingkat harga dipilih **otomatis** dari jumlah yang
 * dimasukkan, dan tetap bisa ditimpa manual bila pemilik memberi harga khusus.
 *
 * Tingkat dasar tidak disimpan di database: ia adalah `Product.price`. Yang
 * tersimpan hanya tingkat tambahan beserta `minQty`-nya.
 */

/** Nama tingkat dasar; dipakai sebagai kunci pembanding, bukan label tampilan. */
export const BASE_TIER_NAME = '';

export interface ResolvedTier {
  /** `BASE_TIER_NAME` untuk tingkat dasar. */
  name: string;
  price: number;
  minQty: number;
}

/**
 * Seluruh tingkat harga produk, terurut naik menurut `minQty`, diawali tingkat
 * dasar. Tingkat yang tidak masuk akal (harga ≤ 0 atau minQty ≤ 1) dibuang agar
 * data impor yang berantakan tidak diam-diam mengubah harga jual.
 */
export function tiersOf(product: Pick<Product, 'price' | 'priceTiers'>): ResolvedTier[] {
  const extra = (product.priceTiers ?? [])
    .filter((tier) => tier.price > 0 && tier.minQty > 1 && tier.name.trim() !== '')
    .map((tier) => ({ name: tier.name, price: tier.price, minQty: Math.floor(tier.minQty) }))
    .sort((a, b) => a.minQty - b.minQty);

  return [{ name: BASE_TIER_NAME, price: product.price, minQty: 1 }, ...extra];
}

export function hasTiers(product: Pick<Product, 'price' | 'priceTiers'>): boolean {
  return tiersOf(product).length > 1;
}

/**
 * Tingkat yang berlaku otomatis untuk sebuah jumlah: tingkat terakhir yang
 * `minQty`-nya sudah terlampaui.
 *
 * Sengaja memakai urutan `minQty`, bukan "harga termurah yang memenuhi syarat" —
 * pemilik harus bisa menebak tingkat mana yang dipakai hanya dari jumlahnya.
 */
export function autoTier(product: Pick<Product, 'price' | 'priceTiers'>, qty: number): ResolvedTier {
  const tiers = tiersOf(product);
  let picked = tiers[0];
  for (const tier of tiers) {
    if (qty >= tier.minQty) picked = tier;
  }
  return picked;
}

/**
 * Tingkat yang dipakai untuk sebuah baris keranjang.
 *
 * `override` adalah nama tingkat yang dipilih manual. Bila tingkat itu sudah
 * tidak ada lagi (produk diedit setelah masuk keranjang), pilihan jatuh kembali
 * ke pemilihan otomatis daripada memakai harga yang sudah tidak berlaku.
 */
export function resolveTier(
  product: Pick<Product, 'price' | 'priceTiers'>,
  qty: number,
  override?: string,
): ResolvedTier {
  if (override !== undefined) {
    const match = tiersOf(product).find((tier) => tier.name === override);
    if (match) return match;
  }
  return autoTier(product, qty);
}

/** Harga per unit yang berlaku — pengganti langsung `product.price`. */
export function unitPrice(
  product: Pick<Product, 'price' | 'priceTiers'>,
  qty: number,
  override?: string,
): number {
  return resolveTier(product, qty, override).price;
}

/** Bersihkan input form jadi daftar tingkat yang layak simpan. */
export function sanitizeTiers(tiers: PriceTier[]): PriceTier[] {
  return tiers
    .map((tier) => ({ name: tier.name.trim(), price: Number(tier.price) || 0, minQty: Math.floor(Number(tier.minQty) || 0) }))
    .filter((tier) => tier.name !== '' && tier.price > 0 && tier.minQty > 1)
    .sort((a, b) => a.minQty - b.minQty);
}

/**
 * Format tingkat harga untuk satu sel Excel: `Nama:minQty:harga` dipisah `;`,
 * mis. `Grosir:12:3200; Partai:50:2900`.
 *
 * Template produk berkolom tetap, jadi tingkat harga harus muat dalam satu sel.
 */
export interface ParsedTiersResult {
  tiers: PriceTier[];
  /** Potongan yang tidak bisa dibaca — dilaporkan, bukan dibuang diam-diam. */
  invalid: string[];
}

/** Baca sel tingkat harga. Sel kosong menghasilkan daftar kosong. */
export function parseTiersFromSheet(raw: string): ParsedTiersResult {
  const invalid: string[] = [];
  const tiers: PriceTier[] = [];

  for (const chunk of raw.split(';')) {
    const text = chunk.trim();
    if (text === '') continue;

    const parts = text.split(':').map((part) => part.trim());
    if (parts.length !== 3) {
      invalid.push(text);
      continue;
    }

    const [name, minQtyRaw, priceRaw] = parts;
    const minQty = Number(minQtyRaw.replace(/[^\d]/g, ''));
    const price = Number(priceRaw.replace(/[^\d]/g, ''));

    if (name === '' || !Number.isFinite(minQty) || !Number.isFinite(price) || minQty <= 1 || price <= 0) {
      invalid.push(text);
      continue;
    }
    tiers.push({ name, minQty, price });
  }

  return { tiers: sanitizeTiers(tiers), invalid };
}
