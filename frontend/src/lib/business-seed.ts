import { db } from './db';
import type { BusinessType } from './user-type';

/**
 * Seed per jenis usaha — dipakai layar "Jualan apa?" di onboarding.
 *
 * Tujuannya membuat langkah pilih-jenis-usaha terasa berbayar: sekali ketuk,
 * kategori + satuan + (opsional) produk contoh langsung terisi sesuai usaha,
 * jadi user tidak mendarat di aplikasi kosong.
 *
 * Catatan bahasa: isi seed sengaja Bahasa Indonesia, mengikuti
 * `seedDefaultData()` di `db.ts` yang juga hardcode "Makanan/Minuman/Lainnya".
 * Nama produk & kategori adalah data milik user (bisa diubah/dihapus), bukan
 * label UI, sehingga tidak lewat i18n.
 */

interface SeedCategory {
  name: string;
  color: string;
  icon: string;
}

interface SeedProduct {
  name: string;
  sku: string;
  /** Index ke `categories` seed ini. */
  cat: number;
  price: number;
  hpp: number;
  stock: number;
  unit: string;
  description?: string;
  /** Override `BusinessSeed.trackStock` untuk produk ini. */
  trackStock?: boolean;
}

export interface BusinessSeed {
  categories: SeedCategory[];
  units: string[];
  /** Default pengelolaan stok — `false` untuk usaha jasa (laundry, salon). */
  trackStock: boolean;
  products: SeedProduct[];
}

export const BUSINESS_SEEDS: Record<BusinessType, BusinessSeed> = {
  'Warung Kelontong': {
    categories: [
      { name: 'Sembako', color: '#FF6B35', icon: '🍚' },
      { name: 'Minuman', color: '#4ECDC4', icon: '🥤' },
      { name: 'Rokok', color: '#8D6E63', icon: '🚬' },
      { name: 'Kebutuhan Rumah', color: '#7E57C2', icon: '🧴' },
    ],
    units: ['pcs', 'kg', 'bungkus', 'botol', 'renceng', 'sachet'],
    trackStock: true,
    products: [
      { name: 'Beras Premium 5kg', sku: 'KLT-001', cat: 0, price: 68000, hpp: 60000, stock: 20, unit: 'pcs' },
      { name: 'Minyak Goreng 1L', sku: 'KLT-002', cat: 0, price: 18000, hpp: 16000, stock: 30, unit: 'pcs' },
      { name: 'Gula Pasir 1kg', sku: 'KLT-003', cat: 0, price: 15000, hpp: 13000, stock: 25, unit: 'kg' },
      { name: 'Mie Instan Goreng', sku: 'KLT-004', cat: 0, price: 3500, hpp: 2800, stock: 120, unit: 'bungkus' },
      { name: 'Air Mineral 600ml', sku: 'KLT-005', cat: 1, price: 4000, hpp: 2200, stock: 80, unit: 'botol' },
      { name: 'Kopi Sachet', sku: 'KLT-006', cat: 1, price: 2000, hpp: 1400, stock: 150, unit: 'sachet' },
      { name: 'Sabun Mandi Batang', sku: 'KLT-007', cat: 3, price: 5000, hpp: 3800, stock: 40, unit: 'pcs' },
      { name: 'Deterjen Sachet', sku: 'KLT-008', cat: 3, price: 3000, hpp: 2100, stock: 60, unit: 'sachet' },
    ],
  },

  'Coffee Shop': {
    categories: [
      { name: 'Kopi', color: '#6F4E37', icon: '☕' },
      { name: 'Non-Kopi', color: '#4ECDC4', icon: '🍵' },
      { name: 'Pastry', color: '#F4A261', icon: '🥐' },
    ],
    units: ['gelas', 'pcs'],
    trackStock: true,
    products: [
      { name: 'Es Kopi Susu', sku: 'CFS-001', cat: 0, price: 18000, hpp: 7000, stock: 100, unit: 'gelas', description: 'Kopi susu gula aren' },
      { name: 'Americano', sku: 'CFS-002', cat: 0, price: 15000, hpp: 5000, stock: 100, unit: 'gelas' },
      { name: 'Cappuccino', sku: 'CFS-003', cat: 0, price: 22000, hpp: 8000, stock: 100, unit: 'gelas' },
      { name: 'Matcha Latte', sku: 'CFS-004', cat: 1, price: 24000, hpp: 9000, stock: 80, unit: 'gelas' },
      { name: 'Coklat Panas', sku: 'CFS-005', cat: 1, price: 20000, hpp: 7000, stock: 80, unit: 'gelas' },
      { name: 'Croissant', sku: 'CFS-006', cat: 2, price: 18000, hpp: 9000, stock: 30, unit: 'pcs' },
      { name: 'Butter Cookies', sku: 'CFS-007', cat: 2, price: 12000, hpp: 5000, stock: 40, unit: 'pcs' },
    ],
  },

  'Kafe / Resto': {
    categories: [
      { name: 'Makanan', color: '#FF6B35', icon: '🍽️' },
      { name: 'Minuman', color: '#4ECDC4', icon: '🥤' },
      { name: 'Snack', color: '#F4A261', icon: '🍟' },
    ],
    units: ['porsi', 'gelas', 'pcs'],
    trackStock: true,
    products: [
      { name: 'Nasi Goreng Spesial', sku: 'RST-001', cat: 0, price: 25000, hpp: 11000, stock: 50, unit: 'porsi', description: 'Telur mata sapi, ayam suwir, kerupuk' },
      { name: 'Ayam Bakar', sku: 'RST-002', cat: 0, price: 28000, hpp: 14000, stock: 30, unit: 'porsi', description: 'Bumbu kecap, sambal, lalapan' },
      { name: 'Mie Goreng', sku: 'RST-003', cat: 0, price: 20000, hpp: 9000, stock: 40, unit: 'porsi' },
      { name: 'Sate Ayam (10 tusuk)', sku: 'RST-004', cat: 0, price: 30000, hpp: 15000, stock: 25, unit: 'porsi', description: 'Bumbu kacang + lontong' },
      { name: 'Es Teh Manis', sku: 'RST-005', cat: 1, price: 6000, hpp: 1500, stock: 100, unit: 'gelas' },
      { name: 'Es Jeruk', sku: 'RST-006', cat: 1, price: 8000, hpp: 2500, stock: 80, unit: 'gelas' },
      { name: 'Kentang Goreng', sku: 'RST-007', cat: 2, price: 15000, hpp: 6000, stock: 40, unit: 'porsi' },
      { name: 'Kerupuk', sku: 'RST-008', cat: 2, price: 3000, hpp: 1500, stock: 100, unit: 'pcs' },
    ],
  },

  'Toko Pakaian': {
    categories: [
      { name: 'Atasan', color: '#3554C1', icon: '👕' },
      { name: 'Bawahan', color: '#7E57C2', icon: '👖' },
      { name: 'Aksesoris', color: '#F9A616', icon: '🧢' },
    ],
    units: ['pcs', 'lusin'],
    trackStock: true,
    products: [
      { name: 'Kaos Polos Cotton', sku: 'PKN-001', cat: 0, price: 75000, hpp: 45000, stock: 40, unit: 'pcs' },
      { name: 'Kemeja Flanel', sku: 'PKN-002', cat: 0, price: 145000, hpp: 90000, stock: 20, unit: 'pcs' },
      { name: 'Hoodie Basic', sku: 'PKN-003', cat: 0, price: 185000, hpp: 115000, stock: 15, unit: 'pcs' },
      { name: 'Celana Jeans', sku: 'PKN-004', cat: 1, price: 210000, hpp: 135000, stock: 18, unit: 'pcs' },
      { name: 'Rok Plisket', sku: 'PKN-005', cat: 1, price: 120000, hpp: 70000, stock: 15, unit: 'pcs' },
      { name: 'Topi Baseball', sku: 'PKN-006', cat: 2, price: 65000, hpp: 35000, stock: 25, unit: 'pcs' },
      { name: 'Kaos Kaki', sku: 'PKN-007', cat: 2, price: 25000, hpp: 12000, stock: 60, unit: 'pcs' },
    ],
  },

  'Toko Sembako': {
    categories: [
      { name: 'Beras & Tepung', color: '#FF6B35', icon: '🌾' },
      { name: 'Minyak & Bumbu', color: '#F9A616', icon: '🧂' },
      { name: 'Minuman', color: '#4ECDC4', icon: '🥤' },
    ],
    units: ['kg', 'liter', 'pcs', 'sak', 'bungkus'],
    trackStock: true,
    products: [
      { name: 'Beras Medium 5kg', sku: 'SMB-001', cat: 0, price: 62000, hpp: 55000, stock: 30, unit: 'sak' },
      { name: 'Tepung Terigu 1kg', sku: 'SMB-002', cat: 0, price: 12000, hpp: 9500, stock: 40, unit: 'kg' },
      { name: 'Minyak Goreng 2L', sku: 'SMB-003', cat: 1, price: 35000, hpp: 31000, stock: 25, unit: 'pcs' },
      { name: 'Gula Pasir 1kg', sku: 'SMB-004', cat: 1, price: 15000, hpp: 13000, stock: 35, unit: 'kg' },
      { name: 'Kecap Manis 600ml', sku: 'SMB-005', cat: 1, price: 25000, hpp: 21000, stock: 20, unit: 'pcs' },
      { name: 'Garam Dapur', sku: 'SMB-006', cat: 1, price: 4000, hpp: 2500, stock: 50, unit: 'bungkus' },
      { name: 'Susu Kental Manis', sku: 'SMB-007', cat: 2, price: 12000, hpp: 10000, stock: 30, unit: 'pcs' },
    ],
  },

  'Apotek / Toko Obat': {
    categories: [
      { name: 'Obat Bebas', color: '#5ABC61', icon: '💊' },
      { name: 'Vitamin & Suplemen', color: '#F9A616', icon: '🍊' },
      { name: 'Alat Kesehatan', color: '#3554C1', icon: '🩺' },
    ],
    units: ['strip', 'botol', 'pcs', 'box', 'tube'],
    trackStock: true,
    products: [
      { name: 'Paracetamol 500mg', sku: 'APT-001', cat: 0, price: 8000, hpp: 5000, stock: 60, unit: 'strip' },
      { name: 'Obat Batuk Sirup', sku: 'APT-002', cat: 0, price: 22000, hpp: 16000, stock: 25, unit: 'botol' },
      { name: 'Minyak Kayu Putih 60ml', sku: 'APT-003', cat: 0, price: 25000, hpp: 19000, stock: 30, unit: 'botol' },
      { name: 'Vitamin C 1000mg', sku: 'APT-004', cat: 1, price: 35000, hpp: 25000, stock: 25, unit: 'box' },
      { name: 'Madu Murni 250ml', sku: 'APT-005', cat: 1, price: 55000, hpp: 40000, stock: 15, unit: 'botol' },
      { name: 'Plester Luka', sku: 'APT-006', cat: 2, price: 12000, hpp: 8000, stock: 40, unit: 'box' },
      { name: 'Masker Medis (50 pcs)', sku: 'APT-007', cat: 2, price: 25000, hpp: 16000, stock: 30, unit: 'box' },
    ],
  },

  'Toko Bangunan': {
    categories: [
      { name: 'Semen & Material', color: '#8D6E63', icon: '🧱' },
      { name: 'Cat & Finishing', color: '#F9A616', icon: '🎨' },
      { name: 'Perkakas', color: '#3554C1', icon: '🔨' },
    ],
    units: ['sak', 'kaleng', 'batang', 'pcs', 'meter', 'kg'],
    trackStock: true,
    products: [
      { name: 'Semen 50kg', sku: 'BGN-001', cat: 0, price: 68000, hpp: 62000, stock: 40, unit: 'sak' },
      { name: 'Besi Beton 8mm', sku: 'BGN-002', cat: 0, price: 55000, hpp: 47000, stock: 50, unit: 'batang' },
      { name: 'Pipa PVC 3 meter', sku: 'BGN-003', cat: 0, price: 45000, hpp: 36000, stock: 30, unit: 'batang' },
      { name: 'Cat Tembok 5kg', sku: 'BGN-004', cat: 1, price: 145000, hpp: 120000, stock: 15, unit: 'kaleng' },
      { name: 'Kuas Cat 4 inci', sku: 'BGN-005', cat: 1, price: 25000, hpp: 15000, stock: 25, unit: 'pcs' },
      { name: 'Paku 1kg', sku: 'BGN-006', cat: 2, price: 22000, hpp: 17000, stock: 40, unit: 'kg' },
      { name: 'Meteran 5 meter', sku: 'BGN-007', cat: 2, price: 35000, hpp: 22000, stock: 20, unit: 'pcs' },
    ],
  },

  'Toko Elektronik': {
    categories: [
      { name: 'Gadget', color: '#3554C1', icon: '📱' },
      { name: 'Aksesoris', color: '#7E57C2', icon: '🎧' },
      { name: 'Kabel & Adaptor', color: '#F9A616', icon: '🔌' },
    ],
    units: ['pcs', 'unit', 'meter'],
    trackStock: true,
    products: [
      { name: 'Powerbank 10.000mAh', sku: 'ELK-001', cat: 0, price: 175000, hpp: 120000, stock: 15, unit: 'unit' },
      { name: 'Lampu LED 12W', sku: 'ELK-002', cat: 0, price: 28000, hpp: 18000, stock: 40, unit: 'pcs' },
      { name: 'Earphone Wired', sku: 'ELK-003', cat: 1, price: 55000, hpp: 30000, stock: 30, unit: 'pcs' },
      { name: 'Case HP Silikon', sku: 'ELK-004', cat: 1, price: 45000, hpp: 18000, stock: 35, unit: 'pcs' },
      { name: 'Baterai AA (isi 4)', sku: 'ELK-005', cat: 1, price: 18000, hpp: 11000, stock: 50, unit: 'pcs' },
      { name: 'Kabel Data USB-C', sku: 'ELK-006', cat: 2, price: 35000, hpp: 18000, stock: 40, unit: 'pcs' },
      { name: 'Charger 20W', sku: 'ELK-007', cat: 2, price: 85000, hpp: 50000, stock: 25, unit: 'pcs' },
    ],
  },

  'Salon / Barbershop': {
    categories: [
      { name: 'Layanan', color: '#CB5CFE', icon: '💈' },
      { name: 'Produk Perawatan', color: '#3554C1', icon: '🧴' },
    ],
    units: ['sesi', 'pcs'],
    // Layanan tidak punya stok; produk perawatan di bawah meng-override jadi true.
    trackStock: false,
    products: [
      { name: 'Potong Rambut Pria', sku: 'SLN-001', cat: 0, price: 35000, hpp: 0, stock: 0, unit: 'sesi' },
      { name: 'Potong + Keramas', sku: 'SLN-002', cat: 0, price: 50000, hpp: 0, stock: 0, unit: 'sesi' },
      { name: 'Creambath', sku: 'SLN-003', cat: 0, price: 85000, hpp: 30000, stock: 0, unit: 'sesi' },
      { name: 'Cat Rambut', sku: 'SLN-004', cat: 0, price: 150000, hpp: 60000, stock: 0, unit: 'sesi' },
      { name: 'Pomade', sku: 'SLN-005', cat: 1, price: 65000, hpp: 40000, stock: 20, unit: 'pcs', trackStock: true },
      { name: 'Sampo Salon', sku: 'SLN-006', cat: 1, price: 55000, hpp: 35000, stock: 15, unit: 'pcs', trackStock: true },
    ],
  },

  Laundry: {
    categories: [
      { name: 'Cuci Kiloan', color: '#4ECDC4', icon: '🧺' },
      { name: 'Cuci Satuan', color: '#3554C1', icon: '👔' },
      { name: 'Setrika', color: '#F9A616', icon: '♨️' },
    ],
    units: ['kg', 'pcs'],
    trackStock: false,
    products: [
      { name: 'Cuci Kering Lipat', sku: 'LDR-001', cat: 0, price: 7000, hpp: 3000, stock: 0, unit: 'kg' },
      { name: 'Cuci Setrika', sku: 'LDR-002', cat: 0, price: 10000, hpp: 4500, stock: 0, unit: 'kg' },
      { name: 'Cuci Express 1 Hari', sku: 'LDR-003', cat: 0, price: 15000, hpp: 6000, stock: 0, unit: 'kg' },
      { name: 'Cuci Bed Cover', sku: 'LDR-004', cat: 1, price: 35000, hpp: 15000, stock: 0, unit: 'pcs' },
      { name: 'Cuci Sepatu', sku: 'LDR-005', cat: 1, price: 40000, hpp: 15000, stock: 0, unit: 'pcs' },
      { name: 'Setrika Saja', sku: 'LDR-006', cat: 2, price: 6000, hpp: 2500, stock: 0, unit: 'kg' },
    ],
  },

  'Pedagang Online': {
    categories: [
      { name: 'Produk', color: '#3554C1', icon: '📦' },
      { name: 'Bundling', color: '#CB5CFE', icon: '🎁' },
    ],
    units: ['pcs', 'paket'],
    trackStock: true,
    products: [
      { name: 'Tumbler Stainless 500ml', sku: 'ONL-001', cat: 0, price: 85000, hpp: 45000, stock: 25, unit: 'pcs' },
      { name: 'Tas Tote Kanvas', sku: 'ONL-002', cat: 0, price: 65000, hpp: 32000, stock: 30, unit: 'pcs' },
      { name: 'Case HP Custom', sku: 'ONL-003', cat: 0, price: 45000, hpp: 18000, stock: 40, unit: 'pcs' },
      { name: 'Hijab Pashmina', sku: 'ONL-004', cat: 0, price: 55000, hpp: 28000, stock: 35, unit: 'pcs' },
      { name: 'Paket Skincare 3in1', sku: 'ONL-005', cat: 1, price: 150000, hpp: 85000, stock: 15, unit: 'paket' },
      { name: 'Paket Hampers', sku: 'ONL-006', cat: 1, price: 175000, hpp: 100000, stock: 10, unit: 'paket' },
    ],
  },

  // "Lainnya" sengaja tanpa produk contoh — menebak dagangan user malah
  // menghasilkan katalog yang harus dibersihkan sendiri. Kategori & satuan
  // umum saja sudah cukup untuk mulai.
  Lainnya: {
    categories: [
      { name: 'Produk', color: '#3554C1', icon: '📦' },
      { name: 'Jasa', color: '#CB5CFE', icon: '🛠️' },
      { name: 'Lainnya', color: '#95A5A6', icon: '🏷️' },
    ],
    units: ['pcs', 'unit'],
    trackStock: true,
    products: [],
  },
};

/** Emoji per jenis usaha untuk grid pilihan di onboarding. */
export const BUSINESS_ICONS: Record<BusinessType, string> = {
  'Warung Kelontong': '🏪',
  'Coffee Shop': '🍵',
  'Kafe / Resto': '☕',
  'Toko Pakaian': '👕',
  'Toko Sembako': '🍚',
  'Apotek / Toko Obat': '💊',
  'Toko Bangunan': '🔨',
  'Toko Elektronik': '📱',
  'Salon / Barbershop': '💈',
  Laundry: '🧺',
  'Pedagang Online': '📦',
  Lainnya: '✨',
};

/** Apakah jenis usaha ini punya produk contoh untuk ditawarkan. */
export function hasSampleProducts(type: BusinessType): boolean {
  return BUSINESS_SEEDS[type].products.length > 0;
}

/** Ringkasan untuk preview di layar pilih jenis usaha (kategori lalu satuan). */
export function seedPreviewChips(type: BusinessType): string[] {
  const seed = BUSINESS_SEEDS[type];
  return [...seed.categories.map(c => c.name), ...seed.units.slice(0, 3)];
}

export interface AppliedSeed {
  categories: number;
  units: number;
  products: number;
}

/**
 * Terapkan seed ke database.
 *
 * Aman dipanggil berulang: kategori/satuan dicocokkan per nama dan produk per
 * SKU, jadi tidak ada duplikat maupun pelanggaran unique-constraint.
 */
export async function applyBusinessSeed(
  type: BusinessType,
  opts: { withSampleProducts: boolean },
): Promise<AppliedSeed> {
  const seed = BUSINESS_SEEDS[type];
  const now = new Date();
  const applied: AppliedSeed = { categories: 0, units: 0, products: 0 };

  // --- Kategori -------------------------------------------------------------
  // `seedDefaultData()` sudah menanam Makanan/Minuman/Lainnya saat boot pertama.
  // Untuk toko bangunan atau laundry itu jadi sampah, maka kategori bawaan yang
  // belum dipakai produk mana pun dibuang lebih dulu — hanya bila DB memang
  // masih kosong (fresh install), supaya restore/backup tidak pernah tersentuh.
  const productCount = await db.products.count();
  if (productCount === 0) {
    const seedNames = new Set(seed.categories.map(c => c.name));
    const stale = await db.categories.filter(c => c.isDeleted === 0 && !seedNames.has(c.name)).toArray();
    const staleIds = stale.map(c => c.id).filter((id): id is number => id != null);
    if (staleIds.length > 0) await db.categories.bulkDelete(staleIds);
  }

  const existingCats = await db.categories.toArray();
  const catIdByName = new Map(existingCats.map(c => [c.name, c.id as number]));
  for (const c of seed.categories) {
    if (catIdByName.has(c.name)) continue;
    const id = await db.categories.add({
      name: c.name,
      color: c.color,
      icon: c.icon,
      createdAt: now,
      isDeleted: 0,
      deletedAt: null,
    });
    catIdByName.set(c.name, id as number);
    applied.categories++;
  }

  // --- Satuan ---------------------------------------------------------------
  const existingUnits = await db.units.toArray();
  const unitNames = new Set(existingUnits.map(u => u.name));
  const seedUnits = new Set([...seed.units, ...seed.products.map(p => p.unit)]);
  for (const name of seedUnits) {
    if (unitNames.has(name)) continue;
    try {
      await db.units.add({ name, isDefault: 1, createdAt: now, isDeleted: 0, deletedAt: null });
      unitNames.add(name);
      applied.units++;
    } catch {
      // unique-constraint race: satuan sudah ada, abaikan
    }
  }

  // --- Produk contoh --------------------------------------------------------
  if (opts.withSampleProducts && seed.products.length > 0) {
    const existingSkus = new Set((await db.products.toArray()).map(p => p.sku));
    const rows = seed.products
      .filter(p => !existingSkus.has(p.sku))
      .map(p => ({
        name: p.name,
        sku: p.sku,
        categoryId: catIdByName.get(seed.categories[p.cat].name) ?? 0,
        price: p.price,
        hpp: p.hpp,
        stock: p.stock,
        trackStock: p.trackStock ?? seed.trackStock,
        unit: p.unit,
        description: p.description,
        createdAt: now,
        updatedAt: now,
        isDeleted: 0,
        deletedAt: null,
      }));
    if (rows.length > 0) {
      await db.products.bulkAdd(rows);
      applied.products = rows.length;
    }
  }

  return applied;
}
