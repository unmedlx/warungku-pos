import { normalizeText, scoreName } from '@/lib/spoken-cart';
import type { CatalogHints, SpokenAlternative, SpokenProduct } from '@/lib/vision-api';

/**
 * Mengubah dikte pemilik toko jadi baris draft produk, tanpa AI dan tanpa
 * jaringan.
 *
 * Pasangan `spoken-cart.ts` untuk layar produk, dan sengaja dibentuk semirip
 * mungkin dengannya. Bedanya satu, dan itu yang membentuk seluruh berkas ini:
 * kasir memilih dari himpunan TERTUTUP — produk yang sudah ada — sementara di
 * sini produknya memang belum ada. Katalog yang di sana jadi tulang punggung
 * sekaligus jaring pengaman, di sini cuma pembantu ejaan.
 *
 * Konsekuensinya, jaring pengamannya dipindah ke tempat lain: layar tinjauan.
 * Setiap baris yang keluar dari sini WAJIB diperiksa pemilik toko sebelum
 * tersimpan, dan tiap kolomnya bisa disunting. Karena itu aturan di sini
 * berlawanan dengan `spoken-cart.ts` — di sana "kalau ragu, jangan menebak",
 * di sini "kalau ragu, TEBAK tapi katakan bahwa itu tebakan". Kolom kosong
 * memaksa pemilik toko mengetik dari nol; tebakan yang ditandai cuma perlu
 * dilirik. Itulah gunanya `confidence`, `note`, dan `alternatives`.
 *
 * Yang tidak bisa dikerjakan di sini — dan memang tidak dicoba — adalah
 * membetulkan salah dengar pada nama produk yang BELUM ada di katalog.
 * "in do mie" bisa dirapikan jadi "Indomie" lewat pencocokan katalog; merek
 * yang baru pertama kali disebut tidak punya acuan apa pun. Untuk itu nama
 * ditulis apa adanya dan pemilik toko membetulkannya di layar tinjauan.
 */

// ---------------------------------------------------------------------------
// Kosakata
// ---------------------------------------------------------------------------

const DIGITS: Record<string, number> = {
  nol: 0,
  satu: 1,
  se: 1,
  dua: 2,
  rong: 2, // Jawa, lazim di pasar: "rong ewu".
  tiga: 3,
  telu: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
};

/** Angka yang sudah lengkap sebagai satu kata. */
const WHOLE: Record<string, number> = {
  sepuluh: 10,
  sebelas: 11,
  seratus: 100,
  seperempat: 0.25,
  setengah: 0.5,
};

const THOUSAND = new Set(['ribu', 'rebu', 'ewu', 'rb', 'k']);
const MILLION = new Set(['juta', 'jt', 'm']);

/** Skala yang sudah membawa angkanya sendiri: "seribu", bukan "satu ribu". */
const WHOLE_SCALE: Record<string, number> = { seribu: 1000, serebu: 1000, sejuta: 1_000_000 };

/**
 * Kata yang menyatakan KOLOM mana yang sedang diisi.
 *
 * Ini bagian yang membuat pengurai lokal layak dipakai sama sekali. Tanpa kata
 * pemicu, satu deret angka tidak bisa dibedakan mana modal dan mana harga
 * jual — dan menukar keduanya adalah satu-satunya kesalahan di fitur ini yang
 * merugikan pemilik toko dalam rupiah, bukan sekadar waktu.
 */
const TRIGGERS: Record<string, 'hpp' | 'price' | 'qty'> = {
  modal: 'hpp',
  modalnya: 'hpp',
  hpp: 'hpp',
  kulakan: 'hpp',
  kulak: 'hpp',
  beli: 'hpp',
  belinya: 'hpp',
  pokok: 'hpp',
  jual: 'price',
  jualnya: 'price',
  dijual: 'price',
  harga: 'price',
  harganya: 'price',
  eceran: 'price',
  dilepas: 'price',
  stok: 'qty',
  stoknya: 'qty',
  stock: 'qty',
  sisa: 'qty',
  masuk: 'qty',
  jumlah: 'qty',
  banyaknya: 'qty',
};

/**
 * Satuan hitung: menempel SETELAH angka jumlah ("dua dus").
 *
 * Dipisah dari satuan ukuran di bawah karena perlakuannya berlawanan. Yang ini
 * menandai bahwa angka sebelumnya adalah stok, bukan harga.
 */
const COUNT_UNITS = new Set([
  'pcs',
  'biji',
  'buah',
  'bungkus',
  'bks',
  'botol',
  'kaleng',
  'sachet',
  'saset',
  'renteng',
  'dus',
  'karton',
  'pak',
  'pack',
  'lusin',
  'ikat',
  'porsi',
  'batang',
  'butir',
  'lembar',
  'slop',
  'karung',
  'sak',
  'kilo',
  'kilogram',
  'kg',
  'liter',
  'ltr',
]);

/**
 * Satuan UKURAN, yang justru bagian dari nama produk.
 *
 * "Aqua enam ratus mili" bukan enam ratus botol Aqua — enam ratus mili adalah
 * ukurannya. Tanpa pemisahan ini, ukuran kemasan masuk ke kolom stok dan
 * angkanya konyol persis pada produk yang paling sering didaftarkan di warung:
 * air mineral, minyak, dan gula kemasan.
 */
const SIZE_UNITS: Record<string, string> = {
  ml: 'ml',
  mili: 'ml',
  mililiter: 'ml',
  gram: 'gram',
  gr: 'gram',
  g: 'gram',
  ons: 'ons',
  cc: 'cc',
};

/** Bunyi pengisi yang ikut tertranskrip dan tidak membawa arti. */
const FILLERS = new Set([
  'eh',
  'anu',
  'ya',
  'yah',
  'oke',
  'ok',
  'hmm',
  'em',
  'itu',
  'nya',
  'rp',
  'rupiah',
  'perak',
  'per',
  'aja',
  'saja',
  'sih',
  'deh',
  'nih',
  'punya',
  'dengan',
  'ke',
  'di',
  // "jual tiga ribu, ralat, jual tiga ribu lima ratus": kata pemicu yang
  // disebut ulang sudah menimpa nilai sebelumnya, jadi "ralat" cukup dibuang
  // supaya tidak terbaca sebagai nama produk berikutnya.
  'ralat',
]);

/**
 * Kata yang menandai pergantian produk.
 *
 * Sengaja hanya yang kuat. "dan" dan "sama" juga memisahkan barang di kasir,
 * tapi di sini keduanya sering muncul di TENGAH nama produk ("sabun cuci
 * piring sama sponnya"), dan aturan berkas ini jelas: satu baris gabungan
 * mudah dipecah pemilik toko di layar tinjauan, sedangkan produk kembar yang
 * lolos ke katalog baru ketahuan berbulan-bulan kemudian.
 */
const SEPARATORS = new Set([
  'terus',
  'trus',
  'lalu',
  'selanjutnya',
  'kemudian',
  'berikutnya',
  'abis',
  'habis',
]);

// ---------------------------------------------------------------------------
// Angka
// ---------------------------------------------------------------------------

export interface ParsedNumber {
  value: number;
  /** Indeks token pertama setelah frasa angka. */
  next: number;
  /** Kata skala ("ribu", "juta") benar-benar diucapkan. */
  scaled: boolean;
  /**
   * Angka satuan yang menggantung dan tidak bisa menempel secara tata bahasa.
   *
   * Inilah idiom pasar. "tiga belas lima" bukan angka yang sah: "tiga belas"
   * sudah lengkap, jadi "lima" tidak punya tempat — dan yang dimaksud pemilik
   * toko adalah 13.500. Bandingkan dengan "dua puluh lima", yang justru angka
   * lengkap dan berarti 25.
   *
   * Perbedaannya murni tata bahasa, bukan tebak-tebakan: satuan boleh menempel
   * pada puluhan bermultiplier ("dua puluh …"), tapi tidak pada belasan atau
   * pada "sepuluh".
   */
  dangling: number | null;
  /** Nilai puluhan sebelum satuan yang menggantung, untuk menyusun tafsir lain. */
  base: number;
}

function numericToken(t: string): number | null {
  // "15rb", "15k", "2jt" — pengenalan suara di HP sering menulis begini.
  const suffixed = /^(\d+([.,]\d+)?)(rb|ribu|k|jt|juta)$/.exec(t);
  if (suffixed) {
    const n = Number(suffixed[1].replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    return n * (suffixed[3] === 'jt' || suffixed[3] === 'juta' ? 1_000_000 : 1000);
  }
  // "15.000" — di Indonesia titik adalah pemisah ribuan, bukan desimal.
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  if (/^\d+([.,]\d+)?$/.test(t)) {
    const n = Number(t.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isNumberStart(t: string): boolean {
  return (
    numericToken(t) != null ||
    t in DIGITS ||
    t in WHOLE ||
    t in WHOLE_SCALE ||
    THOUSAND.has(t) ||
    MILLION.has(t) ||
    t === 'puluh' ||
    t === 'ratus' ||
    // Wajib ikut. Tanpa ini pemecah segmen membaca "belas" sebagai kata biasa
    // dan memotong "dua belas ribu" tepat di tengah angkanya — yang tersisa
    // di kolom harga adalah 2.000, bukan 12.000.
    t === 'belas'
  );
}

/**
 * Skala terdekat di depan, kalau frasa angka ini diteruskan.
 *
 * Dipakai untuk memutuskan pertanyaan yang tidak bisa dijawab per-token:
 * apakah "dua belas ribu empat belas ribu" satu angka atau dua. Jawabannya
 * ada pada skalanya. "dua ribu lima ratus" meneruskan ke skala yang lebih
 * KECIL, jadi satu angka; "dua belas ribu empat belas ribu" mengulang skala
 * yang sama, yang berarti pemilik toko sudah berpindah ke angka berikutnya —
 * modal lalu harga jual.
 *
 * Tanpa ini keduanya tertelan jadi satu dan hasilnya 26.000: satu harga yang
 * tidak pernah disebut siapa pun.
 */
function scaleAhead(tokens: string[], start: number): number {
  for (let i = start; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (THOUSAND.has(t)) return 1000;
    if (MILLION.has(t)) return 1_000_000;
    if (t in WHOLE_SCALE) return WHOLE_SCALE[t];
    if (!isNumberStart(t)) return 0;
  }
  return 0;
}

/**
 * Baca frasa angka lengkap mulai dari `start`.
 *
 * Berbeda dari `parseQty` di `spoken-cart.ts`, yang sengaja MENOLAK ribuan
 * karena di sana angkanya adalah cacah barang dan "dua ribu bungkus" hampir
 * pasti salah dengar. Di sini angkanya harga, dan ribuan justru bentuk yang
 * paling lazim.
 */
export function parseNumber(tokens: string[], start: number): ParsedNumber | null {
  let i = start;
  let total = 0;
  let current = 0;
  let last = 0;
  let matched = false;
  let scaled = false;
  let dangling: number | null = null;
  let base = 0;
  /** Belasan dan "sepuluh" sudah lengkap: satuan sesudahnya menggantung. */
  let closed = false;
  /** Skala terakhir yang sudah dilahap, untuk mengenali angka berikutnya. */
  let flushed = 0;

  const flushScale = (mult: number) => {
    total += (current === 0 ? 1 : current) * mult;
    current = 0;
    last = 0;
    closed = false;
    scaled = true;
    flushed = mult;
  };

  while (i < tokens.length) {
    const t = tokens[i];

    if (t in WHOLE_SCALE) {
      if (matched) break;
      total += WHOLE_SCALE[t];
      matched = true;
      scaled = true;
      i += 1;
      continue;
    }

    // Skala yang mengulang atau naik berarti angka BARU, bukan lanjutan.
    if (flushed > 0 && isNumberStart(t)) {
      const ahead = scaleAhead(tokens, i);
      if (ahead >= flushed) break;
    }

    const literal = numericToken(t);
    if (literal != null) {
      if (matched) break; // "2 500" adalah dua angka, bukan satu.
      current += literal;
      last = literal;
      matched = true;
      if (literal >= 1000) scaled = true;
      i += 1;
      continue;
    }

    if (t === 'belas') {
      if (!matched) break;
      // "tiga" sudah menambah 3; belasan menaikkannya jadi 13.
      current += 10;
      last = current;
      closed = true;
      i += 1;
      continue;
    }

    if (t === 'puluh') {
      if (!matched) break;
      current += last * 10 - last;
      last *= 10;
      i += 1;
      continue;
    }

    if (t === 'ratus') {
      if (!matched) break;
      current += last * 100 - last;
      last *= 100;
      closed = false;
      i += 1;
      continue;
    }

    if (THOUSAND.has(t)) {
      flushScale(1000);
      matched = true;
      i += 1;
      continue;
    }

    if (MILLION.has(t)) {
      flushScale(1_000_000);
      matched = true;
      i += 1;
      continue;
    }

    if (t in WHOLE) {
      const v = WHOLE[t];
      if (matched && v < 1) {
        // "satu setengah juta": pecahan menempel pada angka sebelumnya.
        current += v;
        i += 1;
        continue;
      }
      if (matched) break;
      current += v;
      last = v;
      closed = v === 10 || v === 11;
      matched = true;
      i += 1;
      continue;
    }

    if (t in DIGITS) {
      const v = DIGITS[t];
      if (matched && closed) {
        // Satuan yang tidak punya tempat: idiom harga pasar.
        dangling = v;
        base = total + current;
        i += 1;
        // Apa pun setelah ini bukan bagian dari angka yang sama.
        break;
      }
      if (matched && current > 0 && current < 10) {
        /**
         * Dua satuan berturut-turut: "enam lima" sesudah "enam puluh ribu".
         *
         * Bentuk pasar yang paling padat — pemilik toko menyebut dua digit
         * pertama saja dan menganggap sisanya sudah jelas. Diperlakukan sama
         * dengan satuan menggantung lainnya: dibaca, lalu diakui sebagai
         * tafsir lewat `confidence` dan `alternatives`.
         */
        dangling = v;
        base = current;
        i += 1;
        break;
      }
      if (matched && current % 10 !== 0 && current !== 0) break;
      current += v;
      last = v;
      matched = true;
      i += 1;
      continue;
    }

    break;
  }

  if (!matched) return null;
  return { value: total + current, next: i, scaled, dangling, base };
}

// ---------------------------------------------------------------------------
// Menafsirkan angka sebagai rupiah
// ---------------------------------------------------------------------------

/**
 * Harga terkecil yang masuk akal untuk barang warung.
 *
 * Di bawah ini hampir pasti pemilik toko menghilangkan kata "ribu" — bukan
 * barang seharga tujuh rupiah.
 */
const IMPLAUSIBLE_PRICE = 100;

export interface MoneyReading {
  value: number;
  confident: boolean;
  note: string | null;
  alternatives: number[];
}

/**
 * Ubah hasil `parseNumber` jadi rupiah, beserta keraguannya.
 *
 * `lastScale` adalah skala item sebelumnya. Pewarisan skala bukan kemewahan:
 * pemilik toko yang mendikte sepuluh produk berturut-turut menyebut "ribu"
 * pada yang pertama lalu berhenti menyebutnya — dan sepuluh baris berikutnya
 * akan berisi angka seperseribu kalau pewarisan ini tidak ada.
 */
export function readMoney(n: ParsedNumber, lastScale: number): MoneyReading {
  if (n.dangling != null) {
    /**
     * Dua bentuk, satu aturan.
     *
     * "enam lima" → 65.000: dua satuan yang disebut berurutan adalah dua digit
     * pertama sebuah angka ribuan.
     * "tiga belas lima" → 13.500: satuan sesudah belasan adalah ratusannya.
     *
     * Yang membedakan cuma apakah bagian depannya masih satu digit.
     */
    const primary =
      n.base < 10 ? (n.base * 10 + n.dangling) * 1000 : n.base * 1000 + n.dangling * 100;
    return {
      value: primary,
      confident: false,
      note: `Terdengar seperti idiom harga; dibaca ${primary.toLocaleString('id-ID')}.`,
      alternatives: [n.base * 1000],
    };
  }

  if (n.scaled || n.value >= 1000) {
    return { value: n.value, confident: true, note: null, alternatives: [] };
  }

  if (n.value < IMPLAUSIBLE_PRICE) {
    return {
      value: n.value * 1000,
      confident: false,
      note: `Kata "ribu" tidak terdengar; dibaca ${(n.value * 1000).toLocaleString('id-ID')}.`,
      alternatives: [n.value],
    };
  }

  /**
   * 100–999. Dua kemungkinan yang tidak bisa dipisahkan dari teks saja: harga
   * permen Rp500 yang memang segitu, atau ribuan yang kata skalanya hilang.
   *
   * Yang menentukan adalah item SEBELUMNYA. Pemilik toko yang baru saja
   * menyebut "lima belas ribu" lalu bilang "tiga ratus" hampir pasti
   * meneruskan skala yang sama; kalau belum ada skala yang terbentuk, angka
   * apa adanya yang lebih layak dipercaya.
   */
  const inherited = lastScale >= 1000;
  return {
    value: inherited ? n.value * 1000 : n.value,
    confident: false,
    note: inherited
      ? `Skala ribuan diwarisi dari produk sebelumnya; dibaca ${(n.value * 1000).toLocaleString('id-ID')}.`
      : 'Angka di bawah seribu — cek apakah maksudnya ribuan.',
    alternatives: [inherited ? n.value : n.value * 1000],
  };
}

// ---------------------------------------------------------------------------
// Memecah dikte jadi segmen produk
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return normalizeText(text)
    .replace(/[.,](?!\d)/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Pecah dikte panjang jadi satu segmen per produk.
 *
 * Dua penanda dipakai. Yang pertama kata sambung yang eksplisit. Yang kedua
 * lebih halus tapi jauh lebih sering menyelamatkan: sebuah segmen yang SUDAH
 * punya nama dan sudah punya angka, lalu disusul kata yang bukan angka dan
 * bukan pemicu — itu nama produk berikutnya, walaupun pemilik toko lupa bilang
 * "terus".
 */
export function splitSegments(text: string): string[][] {
  const tokens = tokenize(text);
  const out: string[][] = [];
  let current: string[] = [];
  let sawNumber = false;
  let sawName = false;

  const flush = () => {
    if (current.length > 0) out.push(current);
    current = [];
    sawNumber = false;
    sawName = false;
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];

    if (SEPARATORS.has(t)) {
      // "abis itu" — kata keduanya ikut ditelan supaya tidak jadi nama produk.
      if ((t === 'abis' || t === 'habis') && tokens[i + 1] === 'itu') i += 1;
      flush();
      continue;
    }

    if (FILLERS.has(t)) continue;

    const isNum = isNumberStart(t);
    const isTrigger = t in TRIGGERS;

    if (!isNum && !isTrigger && !COUNT_UNITS.has(t) && !(t in SIZE_UNITS)) {
      if (sawName && sawNumber) {
        flush();
      }
      sawName = true;
      current.push(t);
      continue;
    }

    if (isNum) sawNumber = true;
    current.push(t);
  }

  flush();
  return out;
}

// ---------------------------------------------------------------------------
// Satu segmen jadi satu produk
// ---------------------------------------------------------------------------

/** Ambang pencocokan nama ke katalog; sengaja sama dengan layar kasir. */
export const NAME_MATCH_SCORE = 0.74;

function titleCase(tokens: string[]): string {
  return tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' ');
}

interface Slot {
  value: number;
  alternatives: number[];
  notes: string[];
  confident: boolean;
}

interface SegmentState {
  /** Skala item sebelumnya, diwarisi kalau item ini tidak menyebut "ribu". */
  lastScale: number;
}

function parseSegment(
  tokens: string[],
  hints: CatalogHints,
  state: SegmentState,
): SpokenProduct | null {
  const nameTokens: string[] = [];
  const notes: string[] = [];
  const alternatives: SpokenAlternative[] = [];
  let confident = true;

  let hpp: Slot | null = null;
  let price: Slot | null = null;
  let qty: number | null = null;
  let unit: string | null = null;
  /** Angka tanpa kata pemicu, diputuskan belakangan. */
  const loose: Slot[] = [];

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];

    if (FILLERS.has(t)) {
      i += 1;
      continue;
    }

    const trigger = TRIGGERS[t];
    if (trigger) {
      const n = parseNumber(tokens, i + 1);
      if (!n) {
        i += 1;
        continue;
      }
      if (trigger === 'qty') {
        qty = n.value;
        const after = tokens[n.next];
        if (after && COUNT_UNITS.has(after)) {
          unit = after;
          i = n.next + 1;
          continue;
        }
        i = n.next;
        continue;
      }
      const read = readMoney(n, state.lastScale);
      const slot: Slot = {
        value: read.value,
        alternatives: read.alternatives,
        notes: read.note ? [read.note] : [],
        confident: read.confident,
      };
      if (trigger === 'hpp') hpp = slot;
      else price = slot;
      if (n.scaled || read.value >= 1000) state.lastScale = 1000;
      i = n.next;
      continue;
    }

    if (isNumberStart(t)) {
      const n = parseNumber(tokens, i);
      if (!n) {
        i += 1;
        continue;
      }
      const after = tokens[n.next];

      // Ukuran kemasan adalah bagian dari nama, bukan angka yang berdiri
      // sendiri: "Aqua enam ratus mili".
      if (after && after in SIZE_UNITS) {
        nameTokens.push(String(n.value), SIZE_UNITS[after]);
        i = n.next + 1;
        continue;
      }

      // Angka yang disusul satuan hitung adalah stok: "dua dus".
      if (after && COUNT_UNITS.has(after)) {
        qty = n.value;
        unit = after;
        i = n.next + 1;
        continue;
      }

      const read = readMoney(n, state.lastScale);
      loose.push({
        value: read.value,
        alternatives: read.alternatives,
        notes: read.note ? [read.note] : [],
        confident: read.confident,
      });
      if (n.scaled || read.value >= 1000) state.lastScale = 1000;
      i = n.next;
      continue;
    }

    if (COUNT_UNITS.has(t) || t in SIZE_UNITS) {
      // Satuan tanpa angka di depannya: "Beras karung" — bagian dari nama.
      if (!unit && qty == null) nameTokens.push(t);
      i += 1;
      continue;
    }

    nameTokens.push(t);
    i += 1;
  }

  if (nameTokens.length === 0) return null;

  /**
   * Angka tanpa kata pemicu.
   *
   * Satu angka: harga jual, karena itu yang paling sering disebut sendirian —
   * tapi ditandai, karena pemilik warung kadang menyebut modalnya duluan.
   * Dua angka: urutan lisan yang lazim adalah modal lalu jual.
   */
  if (loose.length === 1 && !price && !hpp) {
    price = loose[0];
    if (hints.businessMode !== 'resto') {
      price.confident = false;
      price.notes.push('Cek apakah angka ini modal atau harga jual.');
    }
  } else if (loose.length >= 2 && !price && !hpp) {
    hpp = loose[0];
    price = loose[1];
    hpp.confident = false;
    hpp.notes.push('Dibaca sebagai modal lalu harga jual — cek urutannya.');
  } else if (loose.length >= 1) {
    // Satu kolom sudah terisi lewat kata pemicu; sisanya mengisi pasangannya.
    if (!price) price = loose[0];
    else if (!hpp) hpp = loose[0];
  }

  /**
   * Nama dicocokkan ke katalog toko.
   *
   * Ini satu-satunya cara pengurai lokal bisa membetulkan salah dengar, dan
   * batasnya jelas: hanya untuk produk yang SUDAH ada. Untuk produk baru —
   * yang justru alasan fitur ini dipakai — nama ditulis apa adanya dan
   * pemilik toko merapikannya di layar tinjauan.
   */
  const spokenName = nameTokens.join(' ');
  let name = titleCase(nameTokens);
  let best = { name: '', score: 0 };
  for (const candidate of hints.productNames) {
    const score = scoreName(spokenName, candidate);
    if (score > best.score) best = { name: candidate, score };
  }
  if (best.score >= NAME_MATCH_SCORE) {
    if (normalizeText(best.name) !== normalizeText(spokenName)) {
      notes.push(`Terdengar "${spokenName}", dicocokkan ke "${best.name}".`);
      confident = false;
    }
    name = best.name;
  }

  const categoryHint =
    hints.categories.find((c) => nameTokens.includes(normalizeText(c))) ?? null;

  for (const [field, slot] of [
    ['hpp', hpp],
    ['price', price],
  ] as const) {
    if (!slot) continue;
    notes.push(...slot.notes);
    if (!slot.confident) confident = false;
    for (const alt of slot.alternatives) {
      alternatives.push({ field, value: alt, label: alt.toLocaleString('id-ID') });
    }
  }

  return {
    name,
    hpp: hpp?.value ?? null,
    price: price?.value ?? null,
    unit,
    qty,
    categoryHint,
    confidence: confident ? 'high' : 'medium',
    note: notes.length > 0 ? notes.join(' ') : null,
    startSec: null,
    endSec: null,
    heard: spokenName,
    alternatives,
  };
}

// ---------------------------------------------------------------------------
// Hasil
// ---------------------------------------------------------------------------

export interface SpokenProductResult {
  products: SpokenProduct[];
  /** Terisi hanya kalau tidak ada satu pun produk yang bisa ditangkap. */
  unreadableReason: string | null;
}

/**
 * Urai satu dikte penuh jadi daftar produk.
 *
 * Seluruhnya berjalan di perangkat: tanpa jaringan, tanpa login, tanpa kuota,
 * dan tanpa jeda. Itu bukan penghematan biaya, melainkan pembukaan akses —
 * pendaftaran produk paling sering dilakukan sambil membongkar kiriman agen,
 * di gudang, dengan sinyal seadanya.
 */
export function parseSpokenProducts(text: string, hints: CatalogHints): SpokenProductResult {
  const segments = splitSegments(text);
  const state: SegmentState = { lastScale: 0 };
  const products: SpokenProduct[] = [];

  for (const segment of segments) {
    const product = parseSegment(segment, hints, state);
    if (product) products.push(product);
  }

  if (products.length === 0) {
    return {
      products: [],
      unreadableReason:
        text.trim().length === 0
          ? 'Tidak ada suara yang tertangkap.'
          : 'Tidak ada nama produk yang terdengar.',
    };
  }

  return { products, unreadableReason: null };
}
