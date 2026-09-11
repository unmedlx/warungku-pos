/**
 * Baris draft produk dan cara menyimpannya.
 *
 * Dipisah dari dialog scan foto ketika fitur suara lahir. Keduanya menghasilkan
 * baris yang sama dan menyimpan dengan aturan yang sama; yang berbeda hanya
 * cara mengumpulkannya. Selama logika simpan hidup di dalam satu dialog, aturan
 * seperti "stok produk lama tidak ditimpa" harus diperbaiki di dua tempat —
 * dan itu aturan yang salah diamnya mahal.
 */

import { db, type Category, type Product, type Unit } from './db';

export type DraftConfidence = 'high' | 'medium' | 'low';

/** Tafsir lain untuk satu angka yang ambigu, ditawarkan sebagai satu ketukan. */
export interface DraftAlternative {
  field: 'hpp' | 'price' | 'stock';
  value: number;
  label: string | null;
}

/**
 * Satu baris hasil ekstraksi yang siap diedit.
 *
 * Sengaja tidak langsung berbentuk `Product`: baris hasil bacaan boleh belum
 * lengkap (harga jual kosong, kategori belum dipilih), sementara `Product`
 * tidak boleh. Pemisahan ini yang membuat hasil AI tidak pernah bisa masuk ke
 * database dalam keadaan setengah jadi.
 */
export interface DraftRow {
  key: string;
  selected: boolean;
  name: string;
  hpp: string;
  price: string;
  unit: string;
  categoryId: string;
  stock: string;
  confidence: DraftConfidence;
  note: string | null;
  /** Asal baris, apa adanya untuk ditampilkan: "Foto 2" atau "0:07–0:15". */
  sourceLabel: string;
  /** Produk lama yang cocok — baris ini memperbarui, bukan menambah. */
  matchedProductId: number | null;
  matchedProductName: string | null;
  /** Hanya terisi di jalur suara. */
  alternatives?: DraftAlternative[];
  /** Detik mulai baris ini di rekaman, untuk memutar ulang bagian itu saja. */
  startSec?: number | null;
  endSec?: number | null;
}

/** Nama disamakan longgar supaya "Indomie  Goreng" cocok dengan "indomie goreng". */
export function normalizeName(v: string): string {
  return v.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * SKU dibuat dari nama supaya pemilik toko tidak perlu mengarang kode untuk
 * ratusan produk — hambatan yang membuat import massal terasa seperti kerja
 * ulang. Keunikan dijaga dengan akhiran angka.
 */
export function makeSku(name: string, taken: Set<string>): string {
  const base =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join('-')
      .slice(0, 12) || 'PRODUK';

  let candidate = `${base}-001`;
  let n = 1;
  while (taken.has(candidate.toLowerCase())) {
    n += 1;
    candidate = `${base}-${String(n).padStart(3, '0')}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

export function num(v: string): number {
  const n = Number(v.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Baris dianggap siap kalau punya nama, kategori, dan harga jual.
 * Harga jual sengaja diwajibkan: produk tanpa harga tidak bisa dijual di
 * kasir, jadi menyimpannya hanya memindahkan pekerjaan ke kemudian hari.
 */
export function isDraftReady(r: DraftRow): boolean {
  return r.name.trim() !== '' && r.categoryId !== '' && num(r.price) > 0;
}

/** Bentuk netral hasil ekstraksi, sebelum dicocokkan dengan katalog. */
export interface ExtractedRow {
  name: string;
  hpp: number | null;
  price: number | null;
  unit: string | null;
  qty: number | null;
  categoryHint: string | null;
  confidence: DraftConfidence;
  note: string | null;
  sourceLabel: string;
  alternatives?: DraftAlternative[];
  startSec?: number | null;
  endSec?: number | null;
}

export interface DraftContext {
  products: Product[];
  categories: Category[];
  units: Unit[];
}

/** Hasil ekstraksi diubah jadi baris draft dan dicocokkan dengan produk lama. */
export function buildDraftRows(items: ExtractedRow[], ctx: DraftContext): DraftRow[] {
  const byName = new Map(ctx.products.map((p) => [normalizeName(p.name), p]));
  const unitNames = ctx.units.map((u) => u.name);
  const defaultUnit = unitNames.includes('pcs') ? 'pcs' : (unitNames[0] ?? 'pcs');

  return items.map((s, i) => {
    const match = byName.get(normalizeName(s.name)) ?? null;
    // Satuan hasil bacaan hanya dipakai kalau ada di master; kalau tidak,
    // pemilik toko memilih sendiri lewat dropdown daripada satuan asing
    // masuk diam-diam ke data.
    const unit = s.unit && unitNames.includes(s.unit) ? s.unit : (match?.unit ?? defaultUnit);
    const category =
      match?.categoryId ??
      ctx.categories.find(
        (c) => s.categoryHint && normalizeName(c.name) === normalizeName(s.categoryHint),
      )?.id ??
      ctx.categories[0]?.id;

    return {
      key: `${i}-${s.name}`,
      selected: true,
      name: s.name,
      hpp: s.hpp != null ? String(s.hpp) : '',
      price: s.price != null ? String(s.price) : '',
      unit,
      categoryId: category != null ? String(category) : '',
      stock: s.qty != null ? String(s.qty) : '',
      confidence: s.confidence,
      note: s.note,
      sourceLabel: s.sourceLabel,
      matchedProductId: match?.id ?? null,
      matchedProductName: match?.name ?? null,
      alternatives: s.alternatives,
      startSec: s.startSec ?? null,
      endSec: s.endSec ?? null,
    };
  });
}

/**
 * Harga jual diisi dari HPP + margin.
 *
 * Hanya baris yang harga jualnya masih kosong yang disentuh: menimpa angka
 * yang sudah diucapkan atau diketik pemilik toko dengan hitungan kami sendiri
 * adalah persis kesalahan yang paling merugikan dia.
 */
export function applyMargin(rows: DraftRow[], percent: number): DraftRow[] {
  return rows.map((r) => {
    const hpp = num(r.hpp);
    if (!r.selected || hpp <= 0 || num(r.price) > 0) return r;
    // Dibulatkan ke ratusan supaya harga yang muncul wajar di kasir.
    const suggested = Math.round((hpp * (1 + percent / 100)) / 100) * 100;
    return { ...r, price: String(suggested) };
  });
}

export interface SaveDraftResult {
  added: number;
  updated: number;
}

/**
 * Simpan baris yang siap.
 *
 * Baris yang cocok dengan produk lama memperbarui harga saja. Stoknya tidak
 * ditimpa: angka yang disebut atau tertulis adalah jumlah yang dibeli, bukan
 * stok akhir — menimpanya akan menghapus sisa stok yang masih ada di rak.
 */
export async function saveDraftRows(
  rows: DraftRow[],
  userId: number | undefined,
): Promise<SaveDraftResult> {
  const ready = rows.filter((r) => r.selected && isDraftReady(r));
  if (ready.length === 0) return { added: 0, updated: 0 };

  const now = new Date();
  const allProducts = await db.products.toArray();
  const takenSkus = new Set(allProducts.map((p) => p.sku.toLowerCase().trim()));

  const toAdd: Product[] = [];
  const toUpdate: { id: number; data: Partial<Product> }[] = [];

  for (const r of ready) {
    const base = {
      name: r.name.trim(),
      categoryId: Number(r.categoryId),
      price: num(r.price),
      hpp: num(r.hpp),
      unit: r.unit.trim() || 'pcs',
      updatedAt: now,
      updatedBy: userId,
    };

    if (r.matchedProductId) {
      toUpdate.push({ id: r.matchedProductId, data: base });
    } else {
      toAdd.push({
        ...base,
        sku: makeSku(r.name, takenSkus),
        priceTiers: [],
        stock: num(r.stock),
        trackStock: true,
        createdAt: now,
        createdBy: userId,
        isDeleted: 0,
        deletedAt: null,
      } as Product);
    }
  }

  await db.transaction('rw', db.products, async () => {
    if (toAdd.length > 0) await db.products.bulkAdd(toAdd);
    for (const u of toUpdate) await db.products.update(u.id, u.data);
  });

  return { added: toAdd.length, updated: toUpdate.length };
}
