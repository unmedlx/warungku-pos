import { describe, it, expect } from 'vitest';
import {
  autoTier,
  hasTiers,
  resolveTier,
  sanitizeTiers,
  tiersOf,
  unitPrice,
  BASE_TIER_NAME,
  parseTiersFromSheet,
} from '@/lib/price-tiers';

const product = {
  price: 3500,
  priceTiers: [
    { name: 'Grosir', price: 3200, minQty: 12 },
    { name: 'Partai', price: 2900, minQty: 50 },
  ],
};

describe('tiersOf', () => {
  it('mengawali daftar dengan tingkat dasar dari Product.price', () => {
    const [base] = tiersOf(product);
    expect(base).toEqual({ name: BASE_TIER_NAME, price: 3500, minQty: 1 });
  });

  it('mengurutkan tingkat tambahan menurut minQty', () => {
    expect(tiersOf({
      price: 3500,
      priceTiers: [
        { name: 'Partai', price: 2900, minQty: 50 },
        { name: 'Grosir', price: 3200, minQty: 12 },
      ],
    }).map((tier) => tier.name)).toEqual([BASE_TIER_NAME, 'Grosir', 'Partai']);
  });

  it('membuang tingkat tak masuk akal agar data impor tidak mengubah harga jual', () => {
    const cleaned = tiersOf({
      price: 3500,
      priceTiers: [
        { name: 'Gratis', price: 0, minQty: 12 },
        { name: '', price: 3000, minQty: 12 },
        { name: 'Sejak satu', price: 3000, minQty: 1 },
        { name: 'Grosir', price: 3200, minQty: 12 },
      ],
    });
    expect(cleaned.map((tier) => tier.name)).toEqual([BASE_TIER_NAME, 'Grosir']);
  });

  it('menganggap produk tanpa tingkat tambahan sebagai harga tunggal', () => {
    expect(hasTiers({ price: 3500 })).toBe(false);
    expect(hasTiers(product)).toBe(true);
  });
});

describe('autoTier', () => {
  it('memakai tingkat dasar di bawah minQty terkecil', () => {
    expect(autoTier(product, 11).name).toBe(BASE_TIER_NAME);
  });

  it('naik tingkat tepat pada minQty', () => {
    expect(autoTier(product, 12).name).toBe('Grosir');
    expect(autoTier(product, 50).name).toBe('Partai');
  });

  it('bertahan di tingkat tertinggi untuk jumlah yang lebih besar', () => {
    expect(autoTier(product, 500).name).toBe('Partai');
  });
});

describe('resolveTier', () => {
  it('menghormati pilihan manual meski jumlahnya belum memenuhi', () => {
    expect(resolveTier(product, 2, 'Partai').price).toBe(2900);
  });

  it('memilih tingkat dasar bila itu yang dipilih manual', () => {
    expect(resolveTier(product, 100, BASE_TIER_NAME).price).toBe(3500);
  });

  it('kembali otomatis bila tingkat pilihan sudah tidak ada', () => {
    // Produk diedit setelah masuk keranjang: "Partai" dihapus pemilik.
    const edited = { price: 3500, priceTiers: [{ name: 'Grosir', price: 3200, minQty: 12 }] };
    expect(resolveTier(edited, 60, 'Partai').name).toBe('Grosir');
  });
});

describe('unitPrice', () => {
  it('setara dengan Product.price bila produk tidak bertingkat', () => {
    expect(unitPrice({ price: 3500 }, 100)).toBe(3500);
  });

  it('mengikuti jumlah saat tidak ada pilihan manual', () => {
    expect(unitPrice(product, 1)).toBe(3500);
    expect(unitPrice(product, 12)).toBe(3200);
    expect(unitPrice(product, 50)).toBe(2900);
  });
});

describe('sanitizeTiers', () => {
  it('memangkas spasi, membuang baris kosong, dan mengurutkan', () => {
    expect(sanitizeTiers([
      { name: ' Partai ', price: 2900, minQty: 50 },
      { name: '  ', price: 3000, minQty: 12 },
      { name: 'Grosir', price: 3200, minQty: 12.7 },
      { name: 'Nol', price: 0, minQty: 20 },
    ])).toEqual([
      { name: 'Grosir', price: 3200, minQty: 12 },
      { name: 'Partai', price: 2900, minQty: 50 },
    ]);
  });
});

describe('parseTiersFromSheet', () => {
  it('membaca format Nama:minQty:harga yang dipisah titik koma', () => {
    expect(parseTiersFromSheet('Grosir:12:3200; Partai:50:2900')).toEqual({
      tiers: [
        { name: 'Grosir', price: 3200, minQty: 12 },
        { name: 'Partai', price: 2900, minQty: 50 },
      ],
      invalid: [],
    });
  });

  it('menghasilkan daftar kosong untuk sel kosong', () => {
    expect(parseTiersFromSheet('')).toEqual({ tiers: [], invalid: [] });
    expect(parseTiersFromSheet('  ;  ')).toEqual({ tiers: [], invalid: [] });
  });

  it('melaporkan potongan tak terbaca alih-alih membuangnya diam-diam', () => {
    const result = parseTiersFromSheet('Grosir:12:3200; ngawur; Partai:1:2900; :50:2900');
    expect(result.tiers).toEqual([{ name: 'Grosir', price: 3200, minQty: 12 }]);
    expect(result.invalid).toEqual(['ngawur', 'Partai:1:2900', ':50:2900']);
  });

  it('mengabaikan pemisah ribuan pada angka', () => {
    expect(parseTiersFromSheet('Grosir:12:3.200').tiers).toEqual([
      { name: 'Grosir', price: 3200, minQty: 12 },
    ]);
  });
});
