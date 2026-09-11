/**
 * Kontrak provider ekstraksi produk dari gambar.
 *
 * Sengaja dipisah dari service supaya penggantian provider (Gemini → yang lain)
 * tidak menyentuh kuota, validasi, maupun bentuk respons ke aplikasi.
 */

export interface VisionImage {
  buffer: Buffer;
  mimeType: string;
}

export interface VisionAudio {
  buffer: Buffer;
  mimeType: string;
  /** Durasi rekaman menurut perekam di aplikasi, untuk pencatatan biaya. */
  durationSec: number;
}

/**
 * Satu baris hasil bacaan. Semua field selain `name` boleh null: kolom yang
 * tidak terbaca dikosongkan, tidak pernah ditebak — harga karangan jauh lebih
 * berbahaya bagi pemilik toko daripada kolom kosong yang terlihat jelas.
 */
export interface ExtractedProduct {
  name: string;
  /** Harga beli / modal. Ini yang biasanya tertulis di nota supplier. */
  hpp: number | null;
  /**
   * Harga jual. Hanya diisi kalau memang tertulis di sumber (mis. daftar harga
   * atau papan menu). Untuk nota supplier nilainya null — menebak harga jual
   * bukan wewenang sistem.
   */
  price: number | null;
  unit: string | null;
  qty: number | null;
  categoryHint: string | null;
  confidence: 'high' | 'medium' | 'low';
  /** Alasan singkat kalau confidence bukan `high`, dalam Bahasa Indonesia. */
  note: string | null;
  /** Foto ke berapa baris ini berasal (1-based), untuk penelusuran di UI. */
  imageIndex: number;
}

export interface VisionUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface VisionExtractResult {
  products: ExtractedProduct[];
  usage: VisionUsage;
  /** Diisi provider kalau seluruh gambar tidak terbaca sama sekali. */
  unreadableReason: string | null;
}

/**
 * Tafsir lain untuk satu angka yang ambigu. "Tiga belas lima" diisi 13.500 di
 * kolomnya, lalu 13.000 ditawarkan di sini — pemilik toko memilih dengan satu
 * ketukan alih-alih mengetik ulang di keyboard HP.
 */
export interface SpokenAlternative {
  field: 'hpp' | 'price' | 'qty';
  value: number;
  /** Penjelasan singkat, mis. "tiga belas ribu". */
  label: string | null;
}

/**
 * Satu baris hasil dengar. Bentuknya sengaja sama dengan `ExtractedProduct`
 * kecuali penelusurannya: foto menunjuk ke lembar keberapa, ucapan menunjuk ke
 * detik keberapa.
 */
export interface SpokenProduct {
  name: string;
  hpp: number | null;
  price: number | null;
  unit: string | null;
  qty: number | null;
  categoryHint: string | null;
  confidence: 'high' | 'medium' | 'low';
  note: string | null;
  /** Perkiraan detik mulai & selesai produk ini disebut. Null kalau model tidak yakin. */
  startSec: number | null;
  endSec: number | null;
  /** Kutipan apa adanya untuk baris ini. */
  heard: string | null;
  alternatives: SpokenAlternative[];
}

export interface SpeechExtractResult {
  products: SpokenProduct[];
  usage: VisionUsage;
  /** Transkrip lengkap, ditampilkan kalau tidak ada produk yang tertangkap. */
  transcript: string | null;
  unreadableReason: string | null;
}

export interface VisionProvider {
  readonly name: string;
  readonly model: string;
  extractProducts(images: VisionImage[]): Promise<VisionExtractResult>;
  /**
   * Opsional: provider yang belum bisa mendengar tetap sah dipakai untuk foto.
   * Service yang memutuskan fitur suara mati, bukan provider yang melempar.
   */
  extractProductsFromAudio?(
    audio: VisionAudio,
    hints: import('./speech-schema').CatalogHints,
  ): Promise<SpeechExtractResult>;
  /**
   * Opsional: urai transkrip yang sudah dihasilkan di perangkat.
   *
   * Jalur ini berbeda dari `extractProductsFromAudio` bukan cuma pada bentuk
   * masukan. Di sini pengenalan suara terjadi di HP, jadi yang sampai ke
   * provider adalah teks yang sudah kehilangan informasi akustik — termasuk
   * salah dengarnya. Konsekuensinya jauh lebih murah dan cepat, dengan
   * ketergantungan penuh pada katalog toko untuk memulihkan nama yang rusak.
   */
  parseTranscript?(
    transcript: string,
    hints: import('./speech-schema').CatalogHints,
  ): Promise<SpeechExtractResult>;
}
