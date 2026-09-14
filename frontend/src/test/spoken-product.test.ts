import { describe, expect, it } from 'vitest';
import { parseSpokenProducts, parseNumber } from '@/lib/spoken-product';
import type { CatalogHints } from '@/lib/vision-api';

/**
 * Pendaftaran produk lewat ucapan, diurai di perangkat.
 *
 * Yang diuji di sini bukan seberapa pintar pengurainya, tapi seberapa JUJUR.
 * Aturan berkas yang diuji jelas: kalau ragu, tetap menebak — lalu katakan
 * bahwa itu tebakan. Karena itu hampir setiap tes di bawah memeriksa dua hal
 * sekaligus: angkanya, dan apakah barisnya mengaku ragu lewat `confidence`
 * dan `note`. Baris yang benar tapi mengaku yakin padahal menebak sama
 * buruknya dengan baris yang salah — pemilik toko melewatinya tanpa melirik.
 */

const hints = (over: Partial<CatalogHints> = {}): CatalogHints => ({
  productNames: [],
  units: ['pcs', 'dus', 'renteng', 'botol', 'kg'],
  categories: [],
  businessMode: 'retail',
  ...over,
});

const parse = (text: string, over: Partial<CatalogHints> = {}) =>
  parseSpokenProducts(text, hints(over));

const tok = (s: string) => s.split(' ');

describe('angka lisan', () => {
  const cases: [string, number][] = [
    ['dua ribu', 2000],
    ['dua ribu lima ratus', 2500],
    ['lima belas ribu', 15000],
    ['seratus dua puluh ribu', 120000],
    ['dua puluh lima ribu', 25000],
    ['seribu', 1000],
    ['lima rebu', 5000],
    ['rong ewu', 2000],
    ['satu setengah juta', 1500000],
    ['sembilan ratus', 900],
    ['sebelas ribu', 11000],
  ];

  for (const [spoken, expected] of cases) {
    it(`"${spoken}" = ${expected}`, () => {
      expect(parseNumber(tok(spoken), 0)?.value).toBe(expected);
    });
  }

  it('menerima angka berdigit dengan pemisah ribuan Indonesia', () => {
    expect(parseNumber(['15.000'], 0)?.value).toBe(15000);
    expect(parseNumber(['15rb'], 0)?.value).toBe(15000);
    expect(parseNumber(['15k'], 0)?.value).toBe(15000);
  });

  /**
   * Pembeda yang seluruh idiom harga bergantung padanya.
   *
   * "dua puluh lima" adalah angka yang lengkap — satuannya menempel pada
   * puluhan. "tiga belas lima" tidak: belasan sudah tertutup, jadi "lima"
   * menggantung, dan itulah tandanya pemilik toko sedang menyebut 13.500.
   */
  it('membedakan satuan yang menempel dari yang menggantung', () => {
    expect(parseNumber(tok('dua puluh lima'), 0)).toMatchObject({
      value: 25,
      dangling: null,
    });
    expect(parseNumber(tok('tiga belas lima'), 0)).toMatchObject({
      base: 13,
      dangling: 5,
    });
    expect(parseNumber(tok('sepuluh dua'), 0)).toMatchObject({ base: 10, dangling: 2 });
  });
});

describe('satu produk dengan kata pemicu', () => {
  it('modal, jual, dan stok masuk ke kolomnya masing-masing', () => {
    const { products } = parse('indomie goreng modal dua ribu jual tiga ribu stok dua dus');

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      name: 'Indomie Goreng',
      hpp: 2000,
      price: 3000,
      qty: 2,
      unit: 'dus',
      confidence: 'high',
      note: null,
    });
  });

  it('kulakan dan harga dikenali sebagai modal dan jual', () => {
    const { products } = parse('gula pasir kulakan dua belas ribu harga empat belas ribu');

    expect(products[0]).toMatchObject({ hpp: 12000, price: 14000, confidence: 'high' });
  });

  it('urutan terbalik tetap benar — kolom ditentukan kata, bukan posisi', () => {
    const { products } = parse('kopi kapal api jual lima ribu modal empat ribu');

    expect(products[0]).toMatchObject({ hpp: 4000, price: 5000 });
  });
});

describe('angka tanpa kata pemicu', () => {
  it('satu angka jadi harga jual, tapi mengaku ragu di warung', () => {
    const { products } = parse('teh gelas tiga ribu');

    expect(products[0]).toMatchObject({ price: 3000, hpp: null, confidence: 'medium' });
    expect(products[0].note).toMatch(/modal atau harga jual/i);
  });

  /** Di restoran yang disebut memang cuma harga menu; ragu di sini cuma bising. */
  it('satu angka di restoran adalah harga jual tanpa keraguan', () => {
    const { products } = parse('nasi goreng lima belas ribu', { businessMode: 'resto' });

    expect(products[0]).toMatchObject({ price: 15000, confidence: 'high', note: null });
  });

  it('dua angka dibaca modal lalu jual, dan itu ditandai', () => {
    const { products } = parse('minyak goreng dua belas ribu empat belas ribu');

    expect(products[0]).toMatchObject({ hpp: 12000, price: 14000, confidence: 'medium' });
    expect(products[0].note).toMatch(/urutan/i);
  });
});

describe('idiom harga pasar', () => {
  it('"tiga belas lima" jadi 13.500 dengan tafsir lain yang ditawarkan', () => {
    const { products } = parse('rokok surya jual tiga belas lima');

    expect(products[0].price).toBe(13500);
    expect(products[0].confidence).toBe('medium');
    expect(products[0].alternatives).toContainEqual(
      expect.objectContaining({ field: 'price', value: 13000 }),
    );
  });

  it('"enam lima" sesudah puluhan ribu jadi 65.000', () => {
    const { products } = parse('beras lima kilo modal enam puluh ribu jual enam lima');

    expect(products[0]).toMatchObject({ hpp: 60000, price: 65000, qty: 5, unit: 'kilo' });
    expect(products[0].confidence).toBe('medium');
    expect(products[0].alternatives).toContainEqual(
      expect.objectContaining({ field: 'price', value: 6000 }),
    );
  });

  it('"sepuluh dua" jadi 10.200 dengan 10.000 sebagai tafsir lain', () => {
    const { products } = parse('minyak jual sepuluh dua');

    expect(products[0].price).toBe(10200);
    expect(products[0].alternatives).toContainEqual(
      expect.objectContaining({ value: 10000 }),
    );
  });
});

describe('angka besar', () => {
  const cases: [string, number][] = [
    ['satu juta dua ratus ribu', 1200000],
    ['tujuh ratus lima puluh ribu', 750000],
    ['seratus ribu', 100000],
  ];

  for (const [spoken, expected] of cases) {
    it(`"${spoken}" = ${expected}`, () => {
      expect(parseNumber(tok(spoken), 0)?.value).toBe(expected);
    });
  }

  /**
   * Skala yang mengulang berarti angka baru. Tanpa aturan ini "dua belas ribu
   * empat belas ribu" tertelan jadi 26.000 — satu harga yang tidak pernah
   * disebut siapa pun.
   */
  it('skala yang mengulang memulai angka baru, yang naik tidak', () => {
    expect(parseNumber(tok('dua belas ribu empat belas ribu'), 0)?.value).toBe(12000);
    expect(parseNumber(tok('satu juta dua ratus ribu'), 0)?.value).toBe(1200000);
  });
});

describe('skala ribuan', () => {
  it('angka kecil tanpa kata "ribu" dinaikkan dan ditandai', () => {
    const { products } = parse('sabun lifebuoy jual tiga');

    expect(products[0].price).toBe(3000);
    expect(products[0].confidence).toBe('medium');
    expect(products[0].note).toMatch(/ribu/i);
    // Tafsir apa adanya tetap ditawarkan — barang Rp3 tidak ada, tapi yang
    // memutuskan tetap pemilik toko.
    expect(products[0].alternatives).toContainEqual(expect.objectContaining({ value: 3 }));
  });

  /**
   * Pemilik toko menyebut "ribu" sekali di awal lalu berhenti menyebutnya.
   * Tanpa pewarisan, sembilan baris berikutnya berisi angka seperseribu.
   */
  it('skala diwarisi dari produk sebelumnya', () => {
    const { products } = parse(
      'gula pasir jual lima belas ribu terus beras jual dua ratus',
    );

    expect(products).toHaveLength(2);
    expect(products[1].price).toBe(200000);
    expect(products[1].confidence).toBe('medium');
    expect(products[1].note).toMatch(/diwarisi/i);
  });
});

describe('memisahkan produk', () => {
  it('kata sambung memulai produk baru', () => {
    const { products } = parse(
      'indomie goreng jual tiga ribu terus aqua jual lima ribu lalu teh botol jual enam ribu',
    );

    expect(products.map((p) => p.name)).toEqual(['Indomie Goreng', 'Aqua', 'Teh Botol']);
  });

  it('"abis itu" tidak ikut jadi nama produk', () => {
    const { products } = parse('gula jual lima belas ribu abis itu kopi jual dua ribu');

    expect(products.map((p) => p.name)).toEqual(['Gula', 'Kopi']);
  });

  /**
   * Pemilik toko yang sudah lancar berhenti menyebut kata sambung sama sekali.
   * Nama baru setelah sebuah baris yang sudah lengkap adalah satu-satunya
   * penanda yang tersisa.
   */
  it('nama baru setelah baris lengkap memulai produk baru tanpa kata sambung', () => {
    const { products } = parse('indomie goreng tiga ribu aqua lima ribu');

    expect(products.map((p) => p.name)).toEqual(['Indomie Goreng', 'Aqua']);
    expect(products[1].price).toBe(5000);
  });
});

describe('ukuran kemasan bukan stok', () => {
  it('"enam ratus mili" tetap bagian dari nama', () => {
    const { products } = parse('aqua botol enam ratus mili jual lima ribu');

    expect(products[0].name).toMatch(/600 ml/i);
    expect(products[0].qty).toBeNull();
    expect(products[0].price).toBe(5000);
  });

  it('"dua dus" adalah stok, bukan nama', () => {
    const { products } = parse('indomie goreng dua dus jual tiga ribu');

    expect(products[0]).toMatchObject({ qty: 2, unit: 'dus', price: 3000 });
    expect(products[0].name).toBe('Indomie Goreng');
  });
});

describe('katalog toko', () => {
  it('nama yang mirip dirapikan memakai ejaan katalog, dan itu ditandai', () => {
    const { products } = parse('indomi goreng jual tiga ribu', {
      productNames: ['Indomie Goreng', 'Indomie Soto'],
    });

    expect(products[0].name).toBe('Indomie Goreng');
    expect(products[0].confidence).toBe('medium');
    expect(products[0].note).toMatch(/indomi goreng/i);
  });

  it('nama yang sudah persis tidak diragukan', () => {
    const { products } = parse('indomie goreng modal dua ribu jual tiga ribu', {
      productNames: ['Indomie Goreng'],
    });

    expect(products[0]).toMatchObject({ name: 'Indomie Goreng', confidence: 'high' });
  });

  /**
   * Batas yang disengaja: produk baru memang tidak punya acuan. Namanya
   * ditulis apa adanya, bukan dipaksa cocok ke produk lain yang bunyinya
   * kebetulan mirip.
   */
  it('produk yang belum ada di katalog tidak dipaksa cocok', () => {
    const { products } = parse('sarden maya jual delapan ribu', {
      productNames: ['Indomie Goreng', 'Aqua Botol'],
    });

    expect(products[0].name).toBe('Sarden Maya');
  });
});

describe('kekosongan', () => {
  it('produk tanpa angka tetap keluar sebagai baris kosong untuk diisi', () => {
    const { products } = parse('sabun colek');

    expect(products[0]).toMatchObject({ name: 'Sabun Colek', hpp: null, price: null });
  });

  it('ucapan tanpa nama produk dilaporkan, bukan dikarang', () => {
    const { products, unreadableReason } = parse('lima ribu sepuluh ribu');

    expect(products).toHaveLength(0);
    expect(unreadableReason).toBeTruthy();
  });

  it('dikte kosong punya alasannya sendiri', () => {
    const { products, unreadableReason } = parse('   ');

    expect(products).toHaveLength(0);
    expect(unreadableReason).toMatch(/tertangkap/i);
  });

  it('bunyi pengisi tidak masuk ke nama produk', () => {
    const { products } = parse('eh anu indomie goreng ya jual tiga ribu aja');

    expect(products[0].name).toBe('Indomie Goreng');
  });
});

describe('setiap keraguan selalu punya keterangan', () => {
  /**
   * Aturan yang mengikat seluruh berkas. Baris "medium" tanpa `note` adalah
   * cacat: layar tinjauan menandainya perlu dicek tanpa memberi tahu APA yang
   * harus dicek, dan pemilik toko akhirnya melewatinya begitu saja.
   */
  const dictations = [
    'teh gelas tiga ribu',
    'rokok surya jual tiga belas lima',
    'sabun lifebuoy jual tiga',
    'minyak goreng dua belas ribu empat belas ribu',
    'gula jual lima belas ribu terus beras jual dua ratus',
  ];

  for (const text of dictations) {
    it(`"${text}"`, () => {
      for (const p of parse(text).products) {
        if (p.confidence !== 'high') expect(p.note).toBeTruthy();
      }
    });
  }
});
