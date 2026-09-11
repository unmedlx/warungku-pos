import type { Product } from '@/lib/db';

/**
 * Mengubah ucapan kasir jadi baris keranjang.
 *
 * Seluruhnya berjalan di perangkat, tanpa AI dan tanpa jaringan. Itu bukan
 * penghematan, tapi syarat: layar kasir harus tetap bekerja saat internet
 * warung mati, dan fitur yang hilang justru di jam sibuk tidak layak dipakai
 * siapa pun. Bisa lokal karena persoalannya memang tertutup — yang dicari
 * hanya produk milik toko ini, bukan produk apa pun di dunia. Itu mencocokkan,
 * bukan mengarang, dan mencocokkan tidak butuh model bahasa.
 *
 * Aturan yang menaungi seluruh berkas ini: **kalau tidak yakin, jangan
 * menebak**. Barang salah yang masuk keranjang diam-diam di depan pembeli jauh
 * lebih mahal daripada barang yang gagal tertangkap — yang kedua langsung
 * terlihat kasir dan dibetulkan dengan satu ketukan, yang pertama baru ketahuan
 * setelah uang berpindah.
 */

// ---------------------------------------------------------------------------
// Angka
// ---------------------------------------------------------------------------

const DIGIT_WORDS: Record<string, number> = {
  nol: 0,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
};

const WHOLE_WORDS: Record<string, number> = {
  sepuluh: 10,
  sebelas: 11,
  seratus: 100,
};

/**
 * Satuan yang lazim disebut kasir warung.
 *
 * Dipakai hanya untuk melahap kata satuan yang menempel SETELAH angka
 * ("dua kilo"), tidak pernah untuk membuang kata dari nama produk. Bedanya
 * penting: "Teh Gelas" adalah merek, dan membuang kata "gelas" dari nama akan
 * membuat produk yang paling laku di warung justru tidak pernah ketemu.
 */
const UNIT_WORDS = new Set([
  'kilo',
  'kilogram',
  'kg',
  'gram',
  'gr',
  'ons',
  'liter',
  'ltr',
  'ml',
  'pcs',
  'pieces',
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
]);

/** Kata sambung yang menandai ganti barang. */
const SEPARATORS = new Set(['terus', 'lalu', 'sama', 'dan', 'plus', 'kemudian', 'trus']);

/** Bunyi pengisi yang ikut tertranskrip dan tidak membawa arti. */
const FILLERS = new Set(['eh', 'anu', 'ya', 'yah', 'oke', 'ok', 'hmm', 'em', 'apa', 'itu', 'nya']);

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .replace(/[.,]/g, ' , ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export interface ParsedQty {
  value: number;
  /** Indeks token pertama setelah frasa angka (termasuk satuannya). */
  next: number;
}

/**
 * Baca frasa angka mulai dari `start`.
 *
 * Hanya menangani angka kecil — jumlah barang di warung, bukan harga. Ribuan
 * sengaja tidak didukung: satu-satunya cara "dua ribu" muncul di sini adalah
 * kasir salah bicara, dan memasukkan 2000 bungkus ke keranjang jauh lebih
 * berbahaya daripada gagal mengurainya.
 */
export function parseQty(tokens: string[], start: number): ParsedQty | null {
  let i = start;
  let total = 0;
  let current: number | null = null;
  let matched = false;

  while (i < tokens.length) {
    const t = tokens[i];

    if (/^\d+([.,]\d+)?$/.test(t)) {
      if (current != null) total += current;
      current = Number.parseFloat(t.replace(',', '.'));
      i += 1;
      matched = true;
      continue;
    }

    if (t === 'setengah') {
      total += (current ?? 0) + 0.5;
      current = null;
      i += 1;
      matched = true;
      continue;
    }

    if (t in WHOLE_WORDS) {
      if (current != null) total += current;
      current = WHOLE_WORDS[t];
      i += 1;
      matched = true;
      continue;
    }

    // "dua belas" = 12, "dua puluh" = 20, "dua ratus" = 200.
    if (t === 'belas' || t === 'puluh' || t === 'ratus') {
      if (current == null) break;
      current = t === 'belas' ? current + 10 : current * (t === 'puluh' ? 10 : 100);
      i += 1;
      matched = true;
      continue;
    }

    if (t in DIGIT_WORDS) {
      if (current != null) total += current;
      current = DIGIT_WORDS[t];
      i += 1;
      matched = true;
      continue;
    }

    // "sekilo", "sebungkus", "sedus" — satu, digabung dengan satuannya.
    if (t.startsWith('se') && UNIT_WORDS.has(t.slice(2))) {
      if (current != null) total += current;
      current = 1;
      i += 1;
      matched = true;
      break;
    }

    break;
  }

  if (!matched) return null;

  // Satuan yang mengekor angka ikut dilahap supaya tidak tersisa jadi nama
  // barang berikutnya: "gula dua kilo" bukan "gula dua" lalu "kilo".
  if (i < tokens.length && UNIT_WORDS.has(tokens[i])) i += 1;

  const value = total + (current ?? 0);
  return Number.isFinite(value) && value > 0 ? { value, next: i } : null;
}

// ---------------------------------------------------------------------------
// Pencocokan nama
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 0;
  // Awalan yang sama dihargai: pengenalan suara jauh lebih sering merusak
  // akhiran kata ("indomie" → "indomi") daripada awalannya.
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return 0.92;
  return Math.max(0, 1 - levenshtein(a, b) / longest);
}

/**
 * Seberapa cocok kata-kata yang diucapkan dengan kata-kata sebuah nama produk.
 *
 * Tiap kata yang diucapkan dicarikan padanan terbaiknya, lalu dirata-rata.
 * Cakupan nama produk ikut diperhitungkan dengan bobot lebih kecil: tanpa itu
 * "indomie" mendapat nilai sempurna untuk "Indomie Goreng Rendang", dan kasir
 * yang menyebut satu kata generik akan mendapat varian yang salah tanpa pernah
 * diberi tahu. Dengan itu, kasus seperti ini turun nilainya dan jatuh ke jalur
 * "kurang yakin" — di mana kasir yang memilih.
 */
function scoreTokens(spoken: string[], name: string[]): number {
  if (spoken.length === 0 || name.length === 0) return 0;

  let spokenScore = 0;
  for (const qt of spoken) {
    let best = 0;
    for (const pt of name) best = Math.max(best, tokenSimilarity(qt, pt));
    spokenScore += best;
  }
  spokenScore /= spoken.length;

  let covered = 0;
  for (const pt of name) {
    let best = 0;
    for (const qt of spoken) best = Math.max(best, tokenSimilarity(pt, qt));
    if (best >= 0.8) covered += 1;
  }

  return spokenScore * 0.75 + (covered / name.length) * 0.25;
}

/** Bentuk publik untuk pengujian dan pemakaian sekali jalan. */
export function scoreName(spoken: string, productName: string): number {
  return scoreTokens(
    normalizeText(spoken).split(' ').filter(Boolean),
    normalizeText(productName).split(' ').filter(Boolean),
  );
}

// ---------------------------------------------------------------------------
// Hasil
// ---------------------------------------------------------------------------

export interface SpokenMatch {
  product: Product;
  qty: number;
  /** Potongan ucapan yang menghasilkan baris ini, apa adanya. */
  heard: string;
  score: number;
}

export interface SpokenUnclear {
  heard: string;
  qty: number;
  /** Kandidat terdekat, untuk ditawarkan sebagai pilihan satu ketukan. */
  candidates: Product[];
}

export interface SpokenCartResult {
  matches: SpokenMatch[];
  unclear: SpokenUnclear[];
}

/**
 * Ambang masuk keranjang.
 *
 * Sengaja tinggi. Menurunkannya menambah barang yang tertangkap, tapi yang
 * bertambah lebih dulu adalah barang salah — dan itu justru kegagalan yang
 * tidak terlihat kasir sampai pembeli sudah pergi.
 */
export const ACCEPT_SCORE = 0.74;

/** Beda tipis antara juara satu dan dua berarti tebakan, bukan pengenalan. */
export const AMBIGUOUS_GAP = 0.08;

/** Di bawah ini kandidat tidak layak ditawarkan sama sekali. */
export const CANDIDATE_FLOOR = 0.45;

/**
 * Sepanjang apa satu nama produk boleh dianggap membentang.
 *
 * Membatasinya menjaga biaya pemindaian tetap kecil, sekaligus mencegah satu
 * ucapan panjang tanpa kata sambung tertelan jadi satu nama raksasa.
 */
const MAX_NAME_TOKENS = 6;

interface Prepared {
  product: Product;
  tokens: string[];
}

interface Fragment {
  name: string;
  qty: number;
}

function prepare(products: Product[]): Prepared[] {
  return products.map((product) => ({
    product,
    tokens: normalizeText(product.name).split(' ').filter(Boolean),
  }));
}

function bestScoreForSpan(span: string[], prepared: Prepared[]): number {
  let best = 0;
  for (const p of prepared) best = Math.max(best, scoreTokens(span, p.tokens));
  return best;
}

/**
 * Pecah ucapan jadi pasangan nama + jumlah, dengan katalog sebagai penentu.
 *
 * Pemenggalan TIDAK bisa dilakukan dari bentuk kalimatnya saja, dan ini bukan
 * detail kecil. Secara sintaks "susu tiga sapi dua" dan "indomie goreng dua teh
 * gelas satu" persis sama bentuknya: nama, angka, nama, angka. Yang membedakan
 * hanya satu hal — "Susu Tiga Sapi" ada di katalog toko, sedangkan "Indomie
 * Goreng Dua Teh" tidak.
 *
 * Karena itu tiap posisi dicoba beberapa panjang nama, dan yang dipakai adalah
 * bentangan yang paling cocok dengan katalog. Angka di tengah nama merek jadi
 * tidak pernah dianggap jumlah, tanpa perlu satu pun aturan khusus per merek.
 */
export function splitFragments(text: string, products: Product[]): Fragment[] {
  const prepared = prepare(products);
  const tokens = tokenize(text).filter((t) => !FILLERS.has(t));
  const fragments: Fragment[] = [];

  let pendingQty: number | null = null;
  /** Barang terakhir yang belum dapat jumlah eksplisit dari kata sesudahnya. */
  let awaitingQty = -1;

  const emit = (name: string) => {
    if (name.length === 0) return;
    fragments.push({ name, qty: pendingQty ?? 1 });
    awaitingQty = pendingQty == null ? fragments.length - 1 : -1;
    pendingQty = null;
  };

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];

    if (t === ',' || SEPARATORS.has(t)) {
      pendingQty = null;
      awaitingQty = -1;
      i += 1;
      continue;
    }

    const qty = parseQty(tokens, i);
    if (qty) {
      if (awaitingQty >= 0) {
        // Pola "<nama> <jumlah>".
        fragments[awaitingQty].qty = qty.value;
        awaitingQty = -1;
      } else {
        // Pola "<jumlah> <nama>": tahan untuk nama sesudahnya.
        pendingQty = qty.value;
      }
      i = qty.next;
      continue;
    }

    /**
     * Cari bentangan nama terbaik mulai dari sini.
     *
     * Bentangan dibedakan dua macam: yang bersih dari angka, dan yang menelan
     * angka ke dalam nama. Yang kedua hanya boleh menang kalau hasilnya
     * benar-benar meyakinkan — aturan inilah yang memisahkan "Susu Tiga Sapi"
     * (menelan "tiga" menghasilkan kecocokan sempurna, jadi boleh) dari "kopi
     * kapal api sachet tiga" (menelan "tiga" cuma menghasilkan kemiripan
     * setengah hati dengan merek lain, jadi "tiga" tetap jumlah).
     *
     * Tanpa pembedaan ini, satu angka yang kebetulan ada di sebuah merek akan
     * menyedot jumlah barang milik ucapan lain.
     */
    let cleanLen = 1;
    let cleanScore = -1;
    let absorbLen = -1;
    let absorbScore = -1;

    for (let len = 1; len <= MAX_NAME_TOKENS && i + len <= tokens.length; len += 1) {
      const span = tokens.slice(i, i + len);
      if (span.some((s) => s === ',' || SEPARATORS.has(s))) break;

      const score = bestScoreForSpan(span, prepared);
      const absorbsQty = span.some((_, k) => parseQty(tokens, i + k) != null);

      if (absorbsQty) {
        if (score > absorbScore) {
          absorbScore = score;
          absorbLen = len;
        }
      } else if (score > cleanScore) {
        cleanScore = score;
        cleanLen = len;
      }
    }

    const absorb = absorbLen > 0 && absorbScore >= ACCEPT_SCORE && absorbScore > cleanScore;
    const bestLen = absorb ? absorbLen : cleanLen;
    const bestScore = absorb ? absorbScore : cleanScore;

    if (bestScore < CANDIDATE_FLOOR) {
      // Tidak ada yang mendekati. Telan sampai penanda berikutnya lalu
      // laporkan apa adanya — kasir perlu tahu ucapannya tidak dikenali.
      let end = i;
      while (
        end < tokens.length &&
        tokens[end] !== ',' &&
        !SEPARATORS.has(tokens[end]) &&
        !parseQty(tokens, end)
      ) {
        end += 1;
      }
      emit(tokens.slice(i, Math.max(end, i + 1)).join(' '));
      i = Math.max(end, i + 1);
      continue;
    }

    emit(tokens.slice(i, i + bestLen).join(' '));
    i += bestLen;
  }

  return fragments;
}

/**
 * Cocokkan satu penggalan ucapan ke katalog toko.
 *
 * Produk yang tidak bisa dijual — stok habis padahal stoknya dikelola —
 * sengaja TIDAK disaring di sini. Kasir yang menyebutnya perlu tahu bahwa
 * barangnya memang kosong; menghilangkannya diam-diam membuat ucapan yang
 * benar terasa seperti tidak terdengar.
 */
export function matchFragment(
  fragment: Fragment,
  products: Product[],
): { match: SpokenMatch | null; unclear: SpokenUnclear | null } {
  const spoken = normalizeText(fragment.name).split(' ').filter(Boolean);
  const scored = prepare(products)
    .map(({ product, tokens }) => ({ product, score: scoreTokens(spoken, tokens) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < CANDIDATE_FLOOR) {
    return { match: null, unclear: { heard: fragment.name, qty: fragment.qty, candidates: [] } };
  }

  const runnerUp = scored[1];
  const ambiguous = runnerUp != null && best.score - runnerUp.score < AMBIGUOUS_GAP;

  if (best.score >= ACCEPT_SCORE && !ambiguous) {
    return {
      match: { product: best.product, qty: fragment.qty, heard: fragment.name, score: best.score },
      unclear: null,
    };
  }

  return {
    match: null,
    unclear: {
      heard: fragment.name,
      qty: fragment.qty,
      candidates: scored
        .filter((s) => s.score >= CANDIDATE_FLOOR)
        .slice(0, 3)
        .map((s) => s.product),
    },
  };
}

/** Urai satu potongan ucapan yang sudah final jadi isi keranjang. */
export function parseSpokenCart(text: string, products: Product[]): SpokenCartResult {
  const matches: SpokenMatch[] = [];
  const unclear: SpokenUnclear[] = [];

  for (const fragment of splitFragments(text, products)) {
    const result = matchFragment(fragment, products);
    if (result.match) matches.push(result.match);
    else if (result.unclear) unclear.push(result.unclear);
  }

  return { matches, unclear };
}
