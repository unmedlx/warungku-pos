import { describe, expect, it } from 'vitest';
import type { Product } from '@/lib/db';
import { parseQty, parseSpokenCart, scoreName, splitFragments } from '@/lib/spoken-cart';

/** Pemenggalan butuh katalog untuk memutuskan; tes memakai katalog yang sama. */
const splitFragments2 = (text: string) => splitFragments(text, CATALOG);

/**
 * Spesifikasi kasir suara, dalam bentuk yang bisa dijalankan.
 *
 * Tabel "Aturan keputusan" di `docs/kasir-suara-mockup.html` adalah janji ke
 * pemilik toko; berkas ini yang menjaganya tetap benar. Kalau ambang atau
 * pembobotan diubah nanti, tes inilah yang memberi tahu perilaku mana yang ikut
 * berubah — dan yang paling berbahaya untuk berubah diam-diam adalah kasus
 * "seharusnya TIDAK masuk keranjang".
 */

let nextId = 1;
function product(name: string, extra: Partial<Product> = {}): Product {
  return {
    id: nextId++,
    name,
    sku: name.toUpperCase().replace(/\s+/g, '-'),
    categoryId: 1,
    price: 3500,
    hpp: 3000,
    stock: 50,
    unit: 'pcs',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: 0,
    deletedAt: null,
    ...extra,
  };
}

const CATALOG: Product[] = [
  product('Indomie Goreng'),
  product('Indomie Soto'),
  product('Teh Gelas'),
  product('Aqua Botol 600ml'),
  product('Sampoerna Mild 16'),
  product('Gula Pasir', { unit: 'kg' }),
  product('Susu Tiga Sapi'),
];

function names(text: string) {
  const { matches } = parseSpokenCart(text, CATALOG);
  return matches.map((m) => `${m.product.name} ×${m.qty}`);
}

describe('angka', () => {
  const cases: [string, number][] = [
    ['satu', 1],
    ['dua', 2],
    ['sepuluh', 10],
    ['sebelas', 11],
    ['dua belas', 12],
    ['dua puluh', 20],
    ['dua puluh lima', 25],
    ['setengah', 0.5],
    ['dua setengah', 2.5],
    ['3', 3],
  ];

  it.each(cases)('“%s” = %s', (text, expected) => {
    expect(parseQty(text.split(' '), 0)?.value).toBe(expected);
  });

  it('melahap satuan yang mengekor angka', () => {
    // Tanpa ini "kilo" tersisa dan jadi nama barang berikutnya.
    const parsed = parseQty(['dua', 'kilo', 'gula'], 0);
    expect(parsed).toEqual({ value: 2, next: 2 });
  });

  it('membaca "sekilo" sebagai satu', () => {
    expect(parseQty(['sekilo'], 0)?.value).toBe(1);
  });

  it('bukan angka mengembalikan null', () => {
    expect(parseQty(['indomie'], 0)).toBeNull();
  });
});

describe('pemenggalan ucapan', () => {
  it('membaca pola <nama> <jumlah>', () => {
    expect(splitFragments2('indomie goreng dua')).toEqual([{ name: 'indomie goreng', qty: 2 }]);
  });

  it('membaca pola <jumlah> <nama>', () => {
    expect(splitFragments2('dua indomie goreng')).toEqual([{ name: 'indomie goreng', qty: 2 }]);
  });

  it('memecah beberapa barang dalam satu tarikan napas tanpa kata sambung', () => {
    expect(splitFragments2('indomie goreng dua teh gelas satu')).toEqual([
      { name: 'indomie goreng', qty: 2 },
      { name: 'teh gelas', qty: 1 },
    ]);
  });

  it('menghormati kata sambung', () => {
    expect(splitFragments2('teh gelas dua terus gula tiga')).toEqual([
      { name: 'teh gelas', qty: 2 },
      { name: 'gula', qty: 3 },
    ]);
  });

  it('tanpa jumlah dianggap satu', () => {
    expect(splitFragments2('teh gelas')).toEqual([{ name: 'teh gelas', qty: 1 }]);
  });

  it('angka di tengah nama bukan jumlah', () => {
    // "Tiga" di sini bagian merek. Kalau ia dibaca sebagai jumlah, kasir
    // mendapat 3 buah "sapi dua" yang tidak pernah ada.
    expect(splitFragments2('susu tiga sapi dua')).toEqual([{ name: 'susu tiga sapi', qty: 2 }]);
  });

  it('membuang bunyi pengisi', () => {
    expect(splitFragments2('eh anu teh gelas dua')).toEqual([{ name: 'teh gelas', qty: 2 }]);
  });
});

describe('pencocokan nama', () => {
  it('nama persis menang telak', () => {
    expect(scoreName('indomie goreng', 'Indomie Goreng')).toBe(1);
  });

  it('satu kata generik tidak menyamai nama lengkap', () => {
    // Justru inilah yang membuat "Indomie dua" jatuh ke jalur ambigu alih-alih
    // diam-diam memilih salah satu varian.
    expect(scoreName('indomie', 'Indomie Goreng')).toBeLessThan(
      scoreName('indomie goreng', 'Indomie Goreng'),
    );
  });

  it('salah dengar ringan masih dikenali', () => {
    expect(scoreName('indomi gorng', 'Indomie Goreng')).toBeGreaterThan(0.74);
  });

  it('barang yang sama sekali beda bernilai rendah', () => {
    expect(scoreName('kopi kapal api', 'Indomie Goreng')).toBeLessThan(0.45);
  });
});

describe('masuk keranjang', () => {
  it('“Indomie goreng dua”', () => {
    expect(names('indomie goreng dua')).toEqual(['Indomie Goreng ×2']);
  });

  it('“dua Indomie goreng”', () => {
    expect(names('dua indomie goreng')).toEqual(['Indomie Goreng ×2']);
  });

  it('“teh gelas satu” — "gelas" di sini bagian nama, bukan satuan', () => {
    expect(names('teh gelas satu')).toEqual(['Teh Gelas ×1']);
  });

  it('“gula dua kilo” — satuan setelah angka tidak jadi barang baru', () => {
    expect(names('gula dua kilo')).toEqual(['Gula Pasir ×2']);
  });

  it('“gula setengah kilo” — pecahan didukung', () => {
    expect(names('gula setengah kilo')).toEqual(['Gula Pasir ×0.5']);
  });

  it('“Susu Tiga Sapi dua”', () => {
    expect(names('susu tiga sapi dua')).toEqual(['Susu Tiga Sapi ×2']);
  });

  it('salah dengar ringan tetap masuk', () => {
    expect(names('indomi gorng dua')).toEqual(['Indomie Goreng ×2']);
  });

  it('beberapa barang dalam satu ucapan', () => {
    expect(names('indomie goreng dua teh gelas satu sama aqua botol 600ml satu')).toEqual([
      'Indomie Goreng ×2',
      'Teh Gelas ×1',
      'Aqua Botol 600ml ×1',
    ]);
  });
});

describe('TIDAK masuk keranjang', () => {
  it('dua kandidat berdekatan ditanyakan, bukan ditebak', () => {
    const { matches, unclear } = parseSpokenCart('indomie dua', CATALOG);

    expect(matches).toEqual([]);
    expect(unclear).toHaveLength(1);
    expect(unclear[0].qty).toBe(2);
    // Jumlahnya ikut terbawa, jadi kasir cukup satu ketukan untuk memilih.
    expect(unclear[0].candidates.map((c) => c.name)).toEqual(
      expect.arrayContaining(['Indomie Goreng', 'Indomie Soto']),
    );
  });

  it('barang di luar katalog tidak dipaksakan ke yang mirip', () => {
    const { matches, unclear } = parseSpokenCart('kopi kapal api sachet tiga', CATALOG);

    expect(matches).toEqual([]);
    expect(unclear).toHaveLength(1);
    expect(unclear[0].candidates).toEqual([]);
  });

  it('obrolan dengan pembeli lewat tanpa efek', () => {
    // Katalog tertutup adalah penyaringnya: kalimat ini tidak menyerupai
    // produk mana pun, jadi tidak ada yang perlu ditawarkan ke kasir.
    const { matches, unclear } = parseSpokenCart('bentar ya bu ini kembaliannya', CATALOG);

    expect(matches).toEqual([]);
    expect(unclear.every((u) => u.candidates.length === 0)).toBe(true);
  });

  it('harga yang terucap tidak jadi jumlah barang', () => {
    // "dua ribu" harus gagal terurai. Kalau ribuan didukung, salah bicara satu
    // kali memasukkan 2000 bungkus ke keranjang.
    expect(parseQty(['dua', 'ribu'], 0)?.value).toBe(2);
    const { matches } = parseSpokenCart('dua ribu', CATALOG);
    expect(matches).toEqual([]);
  });

  it('ucapan kosong tidak menghasilkan apa-apa', () => {
    expect(parseSpokenCart('   ', CATALOG)).toEqual({ matches: [], unclear: [] });
  });
});
