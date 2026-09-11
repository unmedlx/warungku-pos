import { describe, it, expect, beforeEach } from 'vitest';
import { db, type Category, type Product, type Unit } from '@/lib/db';
import {
  applyMargin,
  buildDraftRows,
  isDraftReady,
  makeSku,
  saveDraftRows,
  type DraftRow,
  type ExtractedRow,
} from '@/lib/product-draft';

const categories: Category[] = [
  { id: 1, name: 'Makanan', color: '#fff', icon: '🍚', createdAt: new Date(), isDeleted: 0, deletedAt: null },
  { id: 2, name: 'Minuman', color: '#fff', icon: '🥤', createdAt: new Date(), isDeleted: 0, deletedAt: null },
];

const units: Unit[] = [
  { id: 1, name: 'pcs', isDefault: 1, createdAt: new Date(), isDeleted: 0, deletedAt: null },
  { id: 2, name: 'dus', isDefault: 0, createdAt: new Date(), isDeleted: 0, deletedAt: null },
];

function product(over: Partial<Product>): Product {
  return {
    id: 1,
    name: 'Aqua Botol 600ml',
    sku: 'AQUA-001',
    categoryId: 2,
    price: 4000,
    hpp: 3000,
    stock: 30,
    unit: 'pcs',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: 0,
    deletedAt: null,
    ...over,
  };
}

function extracted(over: Partial<ExtractedRow>): ExtractedRow {
  return {
    name: 'Indomie Goreng',
    hpp: 2500,
    price: 3000,
    unit: 'pcs',
    qty: null,
    categoryHint: null,
    confidence: 'high',
    note: null,
    sourceLabel: '🎙️ 0:00–0:07',
    ...over,
  };
}

describe('buildDraftRows', () => {
  it('mencocokkan produk lama supaya tidak jadi katalog kembar', () => {
    const rows = buildDraftRows([extracted({ name: 'aqua botol 600ml', price: 5000 })], {
      products: [product({})],
      categories,
      units,
    });

    expect(rows[0].matchedProductId).toBe(1);
    expect(rows[0].matchedProductName).toBe('Aqua Botol 600ml');
    // Kategori ikut produk lama, bukan kategori pertama di daftar.
    expect(rows[0].categoryId).toBe('2');
  });

  it('menolak satuan yang tidak ada di master', () => {
    const rows = buildDraftRows([extracted({ unit: 'renteng' })], {
      products: [],
      categories,
      units,
    });
    expect(rows[0].unit).toBe('pcs');
  });

  it('memakai satuan yang ada di master apa adanya', () => {
    const rows = buildDraftRows([extracted({ unit: 'dus' })], {
      products: [],
      categories,
      units,
    });
    expect(rows[0].unit).toBe('dus');
  });

  it('mengosongkan angka yang tidak terdengar, bukan menebaknya', () => {
    const rows = buildDraftRows([extracted({ hpp: null, price: null })], {
      products: [],
      categories,
      units,
    });
    expect(rows[0].hpp).toBe('');
    expect(rows[0].price).toBe('');
    expect(isDraftReady(rows[0])).toBe(false);
  });

  it('mencocokkan kategori dari petunjuk model', () => {
    const rows = buildDraftRows([extracted({ categoryHint: 'minuman' })], {
      products: [],
      categories,
      units,
    });
    expect(rows[0].categoryId).toBe('2');
  });
});

describe('applyMargin', () => {
  const base: DraftRow = {
    key: 'a',
    selected: true,
    name: 'Teh Kotak',
    hpp: '3500',
    price: '',
    unit: 'pcs',
    categoryId: '2',
    stock: '',
    confidence: 'high',
    note: null,
    sourceLabel: '🎙️ 0:21–0:26',
    matchedProductId: null,
    matchedProductName: null,
  };

  it('mengisi harga jual yang kosong dan membulatkan ke ratusan', () => {
    expect(applyMargin([base], 20)[0].price).toBe('4200');
  });

  it('tidak menimpa harga yang sudah diucapkan pemilik toko', () => {
    expect(applyMargin([{ ...base, price: '5000' }], 20)[0].price).toBe('5000');
  });

  it('melewati baris yang tidak dipilih', () => {
    expect(applyMargin([{ ...base, selected: false }], 20)[0].price).toBe('');
  });
});

describe('makeSku', () => {
  it('menghindari tabrakan dengan menaikkan akhiran angka', () => {
    const taken = new Set<string>();
    expect(makeSku('Indomie Goreng', taken)).toBe('INDOMIE-GORE-001');
    expect(makeSku('Indomie Goreng', taken)).toBe('INDOMIE-GORE-002');
  });
});

describe('saveDraftRows', () => {
  beforeEach(async () => {
    await db.products.clear();
  });

  const row = (over: Partial<DraftRow>): DraftRow => ({
    key: 'k',
    selected: true,
    name: 'Indomie Goreng',
    hpp: '2500',
    price: '3000',
    unit: 'pcs',
    categoryId: '1',
    stock: '24',
    confidence: 'high',
    note: null,
    sourceLabel: '🎙️ 0:00–0:07',
    matchedProductId: null,
    matchedProductName: null,
    ...over,
  });

  it('menyimpan baris baru beserta SKU yang dibuat otomatis', async () => {
    const res = await saveDraftRows([row({})], 7);
    expect(res).toEqual({ added: 1, updated: 0 });

    const saved = await db.products.toArray();
    expect(saved).toHaveLength(1);
    expect(saved[0].sku).toBe('INDOMIE-GORE-001');
    expect(saved[0].stock).toBe(24);
    expect(saved[0].createdBy).toBe(7);
  });

  it('tidak menimpa stok produk lama saat memperbarui harga', async () => {
    const id = (await db.products.add(product({ id: undefined, stock: 30, price: 4000 }))) as number;

    const res = await saveDraftRows(
      [row({ name: 'Aqua Botol 600ml', price: '5000', stock: '12', matchedProductId: id })],
      7,
    );
    expect(res).toEqual({ added: 0, updated: 1 });

    const after = await db.products.get(id);
    expect(after?.price).toBe(5000);
    // Angka yang diucapkan adalah jumlah beli, bukan stok akhir di rak.
    expect(after?.stock).toBe(30);
  });

  it('melewati baris yang belum siap dan yang tidak dipilih', async () => {
    const res = await saveDraftRows(
      [row({ key: 'a', price: '' }), row({ key: 'b', selected: false })],
      undefined,
    );
    expect(res).toEqual({ added: 0, updated: 0 });
    expect(await db.products.count()).toBe(0);
  });
});
