import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { BUSINESS_SEEDS, applyBusinessSeed, hasSampleProducts } from '@/lib/business-seed';

async function clearAll() {
  await db.products.clear();
  await db.categories.clear();
  await db.units.clear();
}

describe('applyBusinessSeed', () => {
  beforeEach(clearAll);
  afterEach(clearAll);

  it('menanam kategori, satuan, dan produk contoh sesuai jenis usaha', async () => {
    const seed = BUSINESS_SEEDS['Kafe / Resto'];
    const applied = await applyBusinessSeed('Kafe / Resto', { withSampleProducts: true });

    expect(applied.categories).toBe(seed.categories.length);
    expect(applied.products).toBe(seed.products.length);

    const categories = await db.categories.toArray();
    expect(categories.map(c => c.name).sort()).toEqual(seed.categories.map(c => c.name).sort());

    // Tiap produk harus menunjuk ke kategori yang benar-benar ada.
    const catIds = new Set(categories.map(c => c.id));
    const products = await db.products.toArray();
    expect(products).toHaveLength(seed.products.length);
    expect(products.every(p => catIds.has(p.categoryId))).toBe(true);

    // Satuan yang dipakai produk wajib ikut ditanam, kalau tidak form produk
    // menampilkan satuan yang tidak ada di master.
    const unitNames = new Set((await db.units.toArray()).map(u => u.name));
    expect(products.every(p => unitNames.has(p.unit))).toBe(true);
  });

  it('membuang kategori bawaan yang tidak relevan saat database masih kosong', async () => {
    await db.categories.bulkAdd([
      { name: 'Makanan', color: '#FF6B35', icon: '🍕', createdAt: new Date(), isDeleted: 0, deletedAt: null },
      { name: 'Minuman', color: '#4ECDC4', icon: '🥤', createdAt: new Date(), isDeleted: 0, deletedAt: null },
    ]);

    await applyBusinessSeed('Toko Bangunan', { withSampleProducts: false });

    const names = (await db.categories.toArray()).map(c => c.name);
    expect(names).not.toContain('Makanan');
    expect(names).toContain('Semen & Material');
  });

  it('tidak menyentuh kategori lama bila sudah ada produk (jalur restore)', async () => {
    const catId = await db.categories.add({
      name: 'Kategori Lama', color: '#000000', icon: '📦', createdAt: new Date(), isDeleted: 0, deletedAt: null,
    });
    await db.products.add({
      name: 'Produk Lama', sku: 'LAMA-001', categoryId: catId as number,
      price: 1000, hpp: 500, stock: 1, unit: 'pcs',
      createdAt: new Date(), updatedAt: new Date(), isDeleted: 0, deletedAt: null,
    });

    await applyBusinessSeed('Laundry', { withSampleProducts: false });

    const names = (await db.categories.toArray()).map(c => c.name);
    expect(names).toContain('Kategori Lama');
  });

  it('idempotent — dijalankan dua kali tidak menghasilkan duplikat', async () => {
    await applyBusinessSeed('Coffee Shop', { withSampleProducts: true });
    const second = await applyBusinessSeed('Coffee Shop', { withSampleProducts: true });

    expect(second.categories).toBe(0);
    expect(second.units).toBe(0);
    expect(second.products).toBe(0);

    const seed = BUSINESS_SEEDS['Coffee Shop'];
    expect(await db.products.count()).toBe(seed.products.length);
    expect(await db.categories.count()).toBe(seed.categories.length);
  });

  it('menandai produk jasa sebagai tanpa pengelolaan stok', async () => {
    await applyBusinessSeed('Laundry', { withSampleProducts: true });
    const products = await db.products.toArray();
    expect(products.length).toBeGreaterThan(0);
    expect(products.every(p => p.trackStock === false)).toBe(true);
  });

  it('"Lainnya" tidak menawarkan produk contoh', async () => {
    expect(hasSampleProducts('Lainnya')).toBe(false);
    const applied = await applyBusinessSeed('Lainnya', { withSampleProducts: true });
    expect(applied.products).toBe(0);
    expect(applied.categories).toBeGreaterThan(0);
  });
});
