import { z } from 'zod';

/**
 * Skema hasil ekstraksi.
 *
 * Dipakai dua kali dengan tujuan berbeda:
 * - `RESPONSE_JSON_SCHEMA` dikirim ke provider sebagai kontrak structured output;
 * - `extractionResultSchema` memvalidasi apa yang benar-benar kembali.
 *
 * Keduanya tetap dipertahankan: structured output menurunkan peluang bentuk
 * respons ngawur, tapi tidak menjaminnya. Model boleh salah — yang tidak boleh
 * adalah data ngawur lolos ke service.
 */

export const RESPONSE_JSON_SCHEMA = {
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
          image_index: { type: 'integer' },
        },
        required: ['name', 'confidence', 'image_index'],
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

export const extractionResultSchema = z.object({
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
          // Tanpa tingkat keyakinan, anggap perlu diperiksa. Menaikkannya jadi
          // "high" akan membuat baris lolos tinjauan tanpa pernah dinilai.
          .transform((v) => v ?? 'medium'),
        note: looseString,
        image_index: z
          .union([z.number(), z.string()])
          .nullable()
          .optional()
          .transform((v) => {
            const n = Number(v);
            return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1;
          }),
      }),
    )
    .default([]),
  unreadable_reason: looseString,
});

export type RawExtractionResult = z.infer<typeof extractionResultSchema>;

/**
 * Instruksi ekstraksi.
 *
 * Tiga aturan yang paling menentukan kualitas hasil di lapangan, dan alasannya:
 * - format angka Indonesia (`15.000` = lima belas ribu, bukan lima belas koma nol);
 * - larangan menebak — kolom tak terbaca dikosongkan dan ditandai;
 * - pemisahan HPP vs harga jual — nota supplier hampir selalu harga beli, dan
 *   mengisinya sebagai harga jual akan membuat pemilik toko rugi diam-diam.
 */
export const EXTRACTION_PROMPT = `Kamu membaca foto daftar produk milik pemilik warung, toko grosir, atau restoran di Indonesia. Sumbernya bisa nota supplier, daftar harga tulis tangan, papan menu, atau label rak.

Tugasmu: keluarkan daftar produk beserta angkanya sebagai JSON sesuai skema.

ATURAN ANGKA
- Format Indonesia: titik adalah pemisah ribuan, koma adalah desimal. "15.000" = 15000. "1.500,50" = 1500.5.
- Singkatan: "15rb"/"15k" = 15000, "1,5jt" = 1500000, "2rb5" = 2500.
- Keluarkan angka murni tanpa "Rp", titik, atau koma.

ATURAN HARGA (paling penting)
- "hpp" = harga beli/modal. Nota supplier dan faktur pembelian berisi ini.
- "price" = harga jual ke pembeli. Isi HANYA kalau sumbernya memang daftar harga jual, papan menu, atau label rak.
- Kalau sumbernya nota/faktur pembelian: isi "hpp", biarkan "price" null. JANGAN PERNAH menghitung atau menebak harga jual.
- Kalau tertulis harga per lusin/dus tapi tidak ada harga satuan, isi apa adanya dan sebutkan di "note".

ATURAN KEKOSONGAN
- Kolom yang tidak terbaca jelas diisi null. JANGAN menebak, mengarang, atau melengkapi dari pengetahuan umum.
- Nama produk yang tidak terbaca sebagian: tulis bagian yang terbaca, set confidence "low", jelaskan di "note".
- Jangan menambahkan produk yang tidak ada di foto.

SATUAN
- Pakai satuan yang tertulis, dinormalkan huruf kecil: pcs, kg, gram, liter, ml, dus, renteng, lusin, sak, ikat, bungkus, botol, porsi.
- Kalau tidak tertulis, biarkan null.

CONFIDENCE
- "high": teks dan angka terbaca jelas, tidak ada keraguan.
- "medium": terbaca tapi ada yang meragukan (tulisan tangan, angka mirip, satuan tidak jelas).
- "low": sebagian tertutup, buram, atau kamu menduga-duga.
- Setiap baris dengan confidence "medium" atau "low" WAJIB punya "note" singkat dalam Bahasa Indonesia yang menjelaskan apa yang harus dicek pemilik toko.

LAIN-LAIN
- "image_index" diisi nomor foto tempat baris itu berada (1 untuk foto pertama).
- Lewati baris yang jelas bukan produk: total, subtotal, PPN, diskon, ongkir, tanda tangan, nomor nota, nama toko.
- Kalau tidak ada satu pun produk yang terbaca, kembalikan "products" kosong dan isi "unreadable_reason" dengan alasan singkat dalam Bahasa Indonesia (contoh: "Foto terlalu buram", "Tidak ada daftar produk di foto").`;
