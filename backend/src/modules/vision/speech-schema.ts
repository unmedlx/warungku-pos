import { z } from 'zod';

/**
 * Skema hasil ekstraksi dari ucapan.
 *
 * Sengaja terpisah dari `schema.ts` (jalur foto) walaupun bentuk produknya
 * mirip. Alasannya bukan kerapian, tapi karena aturannya berlawanan di satu
 * titik penting: di foto, harga jual tidak boleh ditebak karena nota supplier
 * berisi harga beli; di ucapan, "jual tiga ribu" adalah pernyataan eksplisit
 * pemilik toko yang justru wajib dipakai. Menggabungkan keduanya dalam satu
 * prompt akan membuat model bimbang di kolom yang paling mahal untuk salah.
 */

export const SPEECH_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    transcript: { type: 'string', nullable: true },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          hpp: { type: 'number', nullable: true },
          price: { type: 'number', nullable: true },
          unit: { type: 'string', nullable: true },
          qty: { type: 'number', nullable: true },
          category_hint: { type: 'string', nullable: true },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          note: { type: 'string', nullable: true },
          /** Detik ke berapa produk ini mulai & selesai disebut. */
          start_sec: { type: 'number', nullable: true },
          end_sec: { type: 'number', nullable: true },
          /** Kutipan apa adanya, dipakai UI untuk menjelaskan asal angka. */
          heard: { type: 'string', nullable: true },
          /**
           * Tafsir lain untuk angka yang ambigu ("tiga belas lima" bisa 13.500
           * atau 13.000). UI menawarkannya sebagai pilihan satu ketukan.
           */
          alternatives: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', enum: ['hpp', 'price', 'qty'] },
                value: { type: 'number' },
                label: { type: 'string', nullable: true },
              },
              required: ['field', 'value'],
            },
          },
        },
        required: ['name', 'confidence'],
      },
    },
    unreadable_reason: { type: 'string', nullable: true },
  },
  required: ['products'],
} as const;

/** Angka yang datang sebagai string ("15.000", "Rp 3.500") tetap diterima. */
const looseNumber = z
  .union([z.number(), z.string()])
  .nullable()
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const cleaned = v.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  });

const looseString = z
  .union([z.string(), z.number()])
  .nullable()
  .optional()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s.length > 0 ? s : null;
  });

export const speechResultSchema = z.object({
  transcript: looseString,
  products: z
    .array(
      z.object({
        name: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
        hpp: looseNumber,
        price: looseNumber,
        unit: looseString,
        qty: looseNumber,
        category_hint: looseString,
        confidence: z
          .enum(['high', 'medium', 'low'])
          .nullable()
          .optional()
          .transform((v) => v ?? 'medium'),
        note: looseString,
        start_sec: looseNumber,
        end_sec: looseNumber,
        heard: looseString,
        alternatives: z
          .array(
            z.object({
              field: z.enum(['hpp', 'price', 'qty']),
              value: looseNumber,
              label: looseString,
            }),
          )
          .nullable()
          .optional()
          .transform((v) => (v ?? []).filter((a) => a.value != null)),
      }),
    )
    .default([]),
  unreadable_reason: looseString,
});

export type RawSpeechResult = z.infer<typeof speechResultSchema>;

/**
 * Katalog toko yang dikirim sebagai konteks.
 *
 * Ini bagian yang paling menentukan kualitas hasil, lebih dari perumusan
 * prompt mana pun: tanpa daftar nama produk yang sudah ada, "aqua enam ratus"
 * jadi produk baru alih-alih cocok dengan "Aqua Botol 600ml", dan katalog
 * pemilik toko cepat penuh kembar.
 */
export interface CatalogHints {
  productNames: string[];
  units: string[];
  categories: string[];
  businessMode: 'retail' | 'wholesale' | 'resto';
}

const MODE_NOTE: Record<CatalogHints['businessMode'], string> = {
  retail:
    'Usahanya warung/toko kelontong. Pemilik biasanya menyebut modal, harga jual, dan stok. Satuan yang lazim: pcs, dus, renteng, bungkus, botol.',
  wholesale:
    'Usahanya grosir. Pemilik sering menyebut harga bertingkat ("kalau ambil selusin harganya sekian"). Harga tingkat kedua itu belum didukung — catat di "note" dan JANGAN masukkan ke "price".',
  resto:
    'Usahanya restoran/warung makan. Pemilik biasanya HANYA menyebut harga jual menu, tanpa modal. HPP kosong itu normal di sini dan bukan alasan menurunkan confidence.',
};

/** Daftar acuan toko, dilampirkan sama persis di jalur audio maupun transkrip. */
function catalogBlock(hints: CatalogHints): string {
  const catalog =
    hints.productNames.length > 0
      ? `\n\nPRODUK YANG SUDAH ADA DI TOKO INI (untuk mencocokkan ejaan dan merek, JANGAN dipakai untuk menambah produk yang tidak disebut):\n${hints.productNames.slice(0, 300).join(', ')}`
      : '';
  const units =
    hints.units.length > 0 ? `\n\nSATUAN YANG DIPAKAI TOKO INI: ${hints.units.join(', ')}` : '';
  const cats =
    hints.categories.length > 0
      ? `\n\nKATEGORI YANG ADA: ${hints.categories.join(', ')}`
      : '';
  return `${catalog}${units}${cats}`;
}

/**
 * Instruksi ekstraksi dari ucapan.
 *
 * Yang membedakannya dari prompt foto:
 * - angka lisan ("dua ribu lima ratus") dan idiom pasar ("tiga belas lima");
 * - pewarisan skala ribuan antar item, yang tidak punya padanan di teks cetak;
 * - harga jual boleh — bahkan harus — diisi kalau pemilik toko menyebutnya.
 */
export function buildSpeechPrompt(hints: CatalogHints, durationSec: number): string {
  return `Kamu mendengarkan rekaman suara pemilik warung, toko grosir, atau restoran di Indonesia yang sedang mendaftarkan produk jualannya. Panjang rekaman sekitar ${Math.round(durationSec)} detik.

${MODE_NOTE[hints.businessMode]}

Tugasmu: keluarkan daftar produk yang dia sebutkan beserta angkanya sebagai JSON sesuai skema.

ATURAN ANGKA LISAN (paling menentukan)
- "dua ribu lima ratus" = 2500. "lima belas ribu" = 15000. "seratus dua puluh ribu" = 120000.
- Bentuk pasar: "lima rebu" = 5000, "rong ewu" = 2000, "15rb"/"15k" = 15000, "satu setengah juta" = 1500000.
- IDIOM HARGA: "tiga belas lima" berarti 13.500 (tiga belas ribu lima ratus). Begitu juga "dua puluh lima ratus" = 2500, "sepuluh dua" = 10.200 atau 10.000 + 200 tergantung konteks. Untuk SEMUA bentuk seperti ini: pilih tafsir yang paling masuk akal, set confidence "medium", isi "note" yang menjelaskan keraguannya, dan isi "alternatives" dengan tafsir lainnya.
- PEWARISAN SKALA: kalau item sebelumnya "dua puluh lima ribu" lalu item berikutnya cuma "dua puluh tiga", itu berarti 23000. Ikuti skala item sebelumnya, set confidence "medium", dan jelaskan di "note".
- Keluarkan angka murni tanpa "Rp", titik, atau koma.

ATURAN HARGA
- "hpp" = modal/harga beli. Kata yang dipakai pemilik toko: "modal", "hpp", "beli", "kulakan", "ambil dari agen".
- "price" = harga jual. Kata yang dipakai: "jual", "harga", "eceran", "dilepas".
- BERBEDA dengan membaca nota: di sini pemilik toko menyatakan harganya sendiri, jadi kalau dia bilang "jual tiga ribu", ISI "price" dengan 3000. Jangan dikosongkan.
- Kalau dia hanya menyebut SATU angka tanpa kata "modal" atau "jual": untuk restoran anggap itu harga jual ("price"); untuk warung dan grosir isi "price" juga tapi set confidence "medium" dan tanyakan di "note" apakah itu modal atau harga jual.
- Kalau dia menyebut harga bertingkat ("kalau ambil dua belas ke atas empat belas ribu"), isi harga eceran di "price" dan tulis harga grosirnya di "note".

MEMISAHKAN PRODUK
- Penanda ganti produk: "terus", "lalu", "abis itu", "selanjutnya", jeda panjang, atau nama produk baru yang jelas.
- Jangan menggabungkan dua produk jadi satu baris, dan jangan memecah satu nama produk jadi dua baris.
- Nama produk ditulis rapi dengan kapitalisasi wajar: "indomi goreng" → "Indomie Goreng". Cocokkan ejaan merek dengan daftar produk toko kalau ada yang mirip.

ATURAN KEKOSONGAN
- Yang tidak disebutkan diisi null. JANGAN menebak harga, stok, atau satuan dari pengetahuan umum.
- Jangan menambahkan produk yang tidak disebut, walaupun ada di daftar produk toko.
- Abaikan bagian rekaman yang bukan pendaftaran produk (batuk, bicara ke orang lain, suara latar).

SATUAN
- Pakai satuan yang disebut, huruf kecil: pcs, kg, gram, liter, ml, dus, renteng, lusin, sak, ikat, bungkus, botol, porsi.
- Kalau tidak disebut, biarkan null.

CONFIDENCE
- "high": ucapan jelas, angka tidak ambigu, tidak ada yang perlu ditebak.
- "medium": terdengar tapi ada keraguan (idiom angka, skala diwarisi, tidak jelas modal atau jual).
- "low": sebagian tertutup suara latar atau kamu menduga-duga.
- Setiap baris "medium" atau "low" WAJIB punya "note" singkat dalam Bahasa Indonesia yang menyebutkan APA yang harus dicek pemilik toko.

PENELUSURAN
- "start_sec" dan "end_sec" diisi perkiraan detik ke berapa produk itu disebut, supaya pemilik toko bisa memutar ulang bagian itu saja.
- "heard" diisi kutipan apa adanya yang kamu dengar untuk baris itu.
- "transcript" diisi transkrip lengkap rekaman apa adanya.

KALAU GAGAL
- Kalau tidak ada satu pun produk yang bisa ditangkap, kembalikan "products" kosong dan isi "unreadable_reason" dengan alasan singkat dalam Bahasa Indonesia (contoh: "Suara tertutup suara sekitar", "Tidak ada nama produk yang disebut").${catalogBlock(hints)}`;
}

// ---------------------------------------------------------------------------
// Jalur transkrip: pengenalan suara dikerjakan di perangkat
// ---------------------------------------------------------------------------

/**
 * Bentuk hasil untuk masukan berupa teks.
 *
 * Sama dengan jalur audio tanpa `transcript`, `start_sec`, dan `end_sec`:
 * transkripnya justru masukan di sini, dan penanda detik tidak ada padanannya
 * pada teks. `heard` tetap dipertahankan — di jalur ini nilainya malah lebih
 * tinggi, karena potongan transkrip asli adalah satu-satunya cara pemilik toko
 * melihat bahwa yang salah adalah pendengaran HP-nya, bukan ucapannya.
 */
export const TRANSCRIPT_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          hpp: { type: 'number', nullable: true },
          price: { type: 'number', nullable: true },
          unit: { type: 'string', nullable: true },
          qty: { type: 'number', nullable: true },
          category_hint: { type: 'string', nullable: true },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          note: { type: 'string', nullable: true },
          heard: { type: 'string', nullable: true },
          alternatives: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', enum: ['hpp', 'price', 'qty'] },
                value: { type: 'number' },
                label: { type: 'string', nullable: true },
              },
              required: ['field', 'value'],
            },
          },
        },
        required: ['name', 'confidence'],
      },
    },
    unreadable_reason: { type: 'string', nullable: true },
  },
  required: ['products'],
} as const;

/**
 * Batas panjang transkrip yang diterima.
 *
 * Bukan soal biaya — teks sepanjang ini murah. Ini penjaga agar prompt tidak
 * bisa dibanjiri lewat kolom yang isinya sepenuhnya ditentukan aplikasi klien.
 */
export const MAX_TRANSCRIPT_CHARS = 4000;

/**
 * Instruksi untuk transkrip yang dihasilkan di perangkat.
 *
 * Perbedaan pokoknya dengan `buildSpeechPrompt` bukan gaya, tapi asumsi tentang
 * masukan. Di jalur audio, model mendengar sendiri dan keraguannya bersifat
 * akustik. Di sini model menerima teks yang SUDAH rusak — pengenalan suara
 * bawaan perangkat menulis angka dan merek dengan salah, dan informasi
 * akustiknya tidak bisa dipanggil kembali. Karena itu tugas utamanya bergeser
 * dari mengurai menjadi merekonstruksi, dan katalog toko naik statusnya dari
 * pembantu ejaan menjadi sandaran utama.
 *
 * Konsekuensi yang disengaja: model diminta lebih longgar menerima kemiripan
 * bunyi, tapi lebih ketat menurunkan `confidence` — di jalur ini "kelihatan
 * yakin padahal salah dengar" adalah mode gagal yang paling merugikan.
 */
export function buildTranscriptPrompt(hints: CatalogHints, transcript: string): string {
  return `Kamu mengurai hasil pengenalan suara dari HP pemilik warung, toko grosir, atau restoran di Indonesia yang sedang mendaftarkan produk jualannya ke aplikasi kasir.

${MODE_NOTE[hints.businessMode]}

PENTING: teks di bawah adalah keluaran pengenalan suara otomatis di perangkat, bukan ketikan. Teks itu SUDAH PASTI memuat salah dengar — terutama pada angka, nama merek, dan batas antar produk. Tugasmu merekonstruksi apa yang sebenarnya diucapkan, lalu keluarkan JSON sesuai skema.

TRANSKRIP
"""
${transcript}
"""

MEMPERBAIKI SALAH DENGAR
- Nama yang bunyinya mirip dengan produk di daftar acuan toko: PAKAI nama dari daftar acuan, persis seperti tertulis di sana. Contoh: "indomi goreng" → "Indomie Goreng", "le mineral" → "Le Minerale", "gula ku" → "Gulaku".
- Kata yang jelas hasil salah dengar tapi tidak ada padanannya di daftar acuan: tulis ejaan paling wajar menurut konteks produk warung Indonesia.
- Pengenalan suara sering memecah satu kata jadi dua ("in do mie") atau menyambung dua kata jadi satu. Perbaiki keduanya.
- Setiap baris yang namanya kamu perbaiki lewat pencocokan bunyi WAJIB confidence "medium" ke bawah, dengan "note" yang menyebut apa yang terdengar dan jadi apa kamu membacanya.

ATURAN ANGKA (paling menentukan)
- Angka yang tertulis sebagai kata: "dua ribu lima ratus" = 2500, "lima belas ribu" = 15000, "seratus dua puluh ribu" = 120000.
- Bentuk pasar: "lima rebu" = 5000, "rong ewu" = 2000, "15rb"/"15k" = 15000, "satu setengah juta" = 1500000.
- Format Indonesia kalau transkrip menulis dengan digit: titik adalah pemisah ribuan. "15.000" = 15000.
- IDIOM HARGA: "tiga belas lima" berarti 13.500. "dua puluh lima ratus" = 2500. Untuk SEMUA bentuk seperti ini: pilih tafsir paling masuk akal, set confidence "medium", isi "note", dan isi "alternatives" dengan tafsir lainnya.
- PEWARISAN SKALA: kalau item sebelumnya "dua puluh lima ribu" lalu item berikutnya cuma "dua puluh tiga", itu berarti 23000. Set confidence "medium" dan jelaskan di "note".
- Pengenalan suara kadang menulis angka dengan digit yang menempel salah ("2 500" jadi "2500" atau "25 00"). Kalau angka hasilnya tidak masuk akal sebagai harga barang warung, pilih tafsir yang masuk akal dan turunkan confidence.
- Keluarkan angka murni tanpa "Rp", titik, atau koma.

ATURAN HARGA
- "hpp" = modal/harga beli. Kata pemicu: "modal", "hpp", "beli", "kulakan", "ambil dari agen".
- "price" = harga jual. Kata pemicu: "jual", "harga", "eceran", "dilepas".
- BERBEDA dengan membaca nota: di sini pemilik toko menyatakan harganya sendiri, jadi kalau dia bilang "jual tiga ribu", ISI "price" dengan 3000. Jangan dikosongkan.
- Kalau dia hanya menyebut SATU angka tanpa kata pemicu: untuk restoran anggap itu harga jual ("price"); untuk warung dan grosir isi "price" juga tapi set confidence "medium" dan tanyakan di "note" apakah itu modal atau harga jual.
- Kalau dia menyebut harga bertingkat ("kalau ambil dua belas ke atas empat belas ribu"), isi harga eceran di "price" dan tulis harga grosirnya di "note".

MEMISAHKAN PRODUK
- Transkrip perangkat sering tanpa tanda baca. Pisahkan berdasarkan pergantian nama barang, BUKAN berdasarkan titik atau koma.
- Penanda ganti produk: "terus", "lalu", "abis itu", "selanjutnya", atau nama produk baru yang jelas.
- Kalau ragu apakah dua penyebutan adalah satu produk atau dua, pilih SATU produk dan jelaskan keraguannya di "note". Gabungan lebih mudah dibetulkan pemilik toko daripada duplikat yang lolos ke katalog.

ATURAN KEKOSONGAN
- Yang tidak disebutkan diisi null. JANGAN menebak harga, stok, atau satuan dari pengetahuan umum.
- Jangan menambahkan produk yang tidak disebut, walaupun ada di daftar acuan toko.
- Buang kata pengisi dan sisa bunyi latar yang ikut tertranskrip: "eh", "anu", "itu", "apa namanya", "oke", "hmm".

SATUAN
- Pakai satuan yang disebut, huruf kecil: pcs, kg, gram, liter, ml, dus, renteng, lusin, sak, ikat, bungkus, botol, porsi.
- Kalau tidak disebut, biarkan null.

CONFIDENCE
- "high": nama ada persis di daftar acuan atau tidak ambigu sama sekali, DAN angkanya tidak perlu ditafsirkan. Di jalur transkrip ini "high" harus jarang.
- "medium": kamu menafsirkan sesuatu — nama dicocokkan lewat bunyi, skala angka diwarisi, idiom harga, atau tidak jelas modal vs jual.
- "low": bagian transkrip itu kacau dan kamu menduga-duga.
- Setiap baris "medium" atau "low" WAJIB punya "note" singkat dalam Bahasa Indonesia yang menyebutkan APA yang harus dicek pemilik toko.

PENELUSURAN
- "heard" diisi potongan transkrip ASLI yang menghasilkan baris itu, apa adanya termasuk salah dengarnya. Jangan dirapikan.

KALAU GAGAL
- Kalau transkrip tidak memuat satu pun produk (kosong, cuma bunyi latar yang tertranskrip, atau kalimat yang tidak berhubungan), kembalikan "products" kosong dan isi "unreadable_reason" dengan alasan singkat dalam Bahasa Indonesia (contoh: "Tidak ada nama produk yang terdengar", "Ucapan tidak tertangkap jelas").${catalogBlock(hints)}`;
}
