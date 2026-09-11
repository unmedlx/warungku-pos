/**
 * Client untuk endpoint scan produk dari foto.
 *
 * Dipisah dari `cloud-api.ts` karena berbeda sifat: satu-satunya fitur di
 * aplikasi ini yang mensyaratkan koneksi, dan satu-satunya yang punya kuota
 * pemakaian. Memisahkannya membuat kedua hal itu tidak menular ke jalur
 * cloud lain yang sudah mapan.
 */

import { cloudFetch, CloudApiError } from './cloud-api';

export type ScanConfidence = 'high' | 'medium' | 'low';

export interface ScannedProduct {
  name: string;
  hpp: number | null;
  price: number | null;
  unit: string | null;
  qty: number | null;
  categoryHint: string | null;
  confidence: ScanConfidence;
  note: string | null;
  imageIndex: number;
}

export interface ScanQuota {
  limit: number;
  used: number;
  remaining: number;
  source: 'plan' | 'free';
  resetsAt: string;
}

export interface ScanStatus {
  enabled: boolean;
  /**
   * Provider yang aktif bisa saja hanya mampu membaca gambar. Dikabarkan
   * terpisah supaya tombol rekam tidak muncul lalu gagal di akhir alur —
   * setelah pemilik toko selesai bicara adalah waktu terburuk untuk memberi
   * tahu bahwa fiturnya tidak ada.
   */
  speechEnabled: boolean;
  /**
   * Apakah server bisa mengurai transkrip teks. Dipisah dari `speechEnabled`
   * karena aplikasi memilih jalurnya dari dua hal sekaligus: kemampuan server
   * dan ada-tidaknya pengenalan suara di perangkat.
   */
  transcriptEnabled: boolean;
  maxImages: number;
  maxAudioSeconds: number;
  quota: ScanQuota;
}

export interface SpokenAlternative {
  field: 'hpp' | 'price' | 'qty';
  value: number;
  label: string | null;
}

export interface SpokenProduct {
  name: string;
  hpp: number | null;
  price: number | null;
  unit: string | null;
  qty: number | null;
  categoryHint: string | null;
  confidence: ScanConfidence;
  note: string | null;
  startSec: number | null;
  endSec: number | null;
  heard: string | null;
  alternatives: SpokenAlternative[];
}

export interface SpeechResponse {
  products: SpokenProduct[];
  transcript: string | null;
  unreadableReason: string | null;
  quota: ScanQuota;
}

/** Katalog toko yang dikirim sebagai konteks pencocokan nama. */
export interface CatalogHints {
  productNames: string[];
  units: string[];
  categories: string[];
  businessMode: 'retail' | 'wholesale' | 'resto';
}

export interface ScanResponse {
  products: ScannedProduct[];
  unreadableReason: string | null;
  quota: ScanQuota;
}

export async function fetchScanStatus(): Promise<ScanStatus> {
  const res = await cloudFetch('/api/vision/quota');
  return res as ScanStatus;
}

export class ScanTimeoutError extends Error {
  constructor() {
    super('SCAN_TIMEOUT');
    this.name = 'ScanTimeoutError';
  }
}

export class ScanAbortedError extends Error {
  constructor() {
    super('SCAN_ABORTED');
    this.name = 'ScanAbortedError';
  }
}

/**
 * Batas tunggu client. Pembacaan satu nota wajar memakan 10–30 detik, tapi
 * tanpa batas atas satu request yang menggantung membuat layar memproses
 * terkunci selamanya — tidak ada cara keluar bagi pemilik toko selain
 * menutup paksa aplikasi.
 *
 * Harus lebih longgar dari `VISION_TIMEOUT_SECONDS` di server (120 dtk).
 * Kalau client menyerah lebih dulu, pemilik toko melihat "terlalu lama"
 * padahal server punya pesan galat yang lebih berguna sesaat kemudian.
 */
const SCAN_TIMEOUT_MS = 150_000;

/**
 * Kode galat dikembalikan apa adanya lewat `CloudApiError.code` supaya UI bisa
 * membedakan "kuota habis" (tawarkan paket) dari "layanan sibuk" (suruh coba
 * lagi) — dua hal yang butuh jalan keluar berbeda bagi pemilik toko.
 */
export async function scanProducts(
  files: File[],
  opts: { storeId?: string; signal?: AbortSignal } = {},
): Promise<ScanResponse> {
  const form = new FormData();
  files.forEach((f) => form.append('images', f));
  if (opts.storeId) form.append('storeId', opts.storeId);

  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, SCAN_TIMEOUT_MS);

  // `AbortSignal.any` belum ada di semua WebView Android yang dipakai aplikasi
  // ini, jadi sinyal batal dari pemanggil disambung manual.
  const forward = () => ctrl.abort();
  opts.signal?.addEventListener('abort', forward);

  try {
    const res = await cloudFetch('/api/vision/scan-products', {
      method: 'POST',
      body: form,
      signal: ctrl.signal,
    });
    return res as ScanResponse;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw timedOut ? new ScanTimeoutError() : new ScanAbortedError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', forward);
  }
}

export { CloudApiError };

/**
 * Batas tunggu untuk jalur suara.
 *
 * Lebih ketat daripada foto: satu rekaman 60 detik jauh lebih kecil dari lima
 * foto, jadi menunggu 2,5 menit di sini berarti ada yang menggantung, bukan
 * ada yang lambat.
 */
const SPEECH_TIMEOUT_MS = 90_000;

export async function scanProductsFromAudio(
  recording: { blob: Blob; mimeType: string; durationSec: number },
  hints: CatalogHints,
  opts: { storeId?: string; signal?: AbortSignal } = {},
): Promise<SpeechResponse> {
  const form = new FormData();
  // Nama berkas ikut menentukan tipe yang dibaca multer di sebagian WebView,
  // jadi ekstensinya diselaraskan dengan mime type yang benar-benar dipakai.
  const ext = recording.mimeType.includes('mp4')
    ? 'm4a'
    : recording.mimeType.includes('ogg')
      ? 'ogg'
      : recording.mimeType.includes('aac')
        ? 'aac'
        : 'webm';
  form.append('audio', recording.blob, `rekaman.${ext}`);
  form.append('durationSec', String(recording.durationSec));
  form.append('catalog', JSON.stringify(hints));
  if (opts.storeId) form.append('storeId', opts.storeId);

  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, SPEECH_TIMEOUT_MS);

  const forward = () => ctrl.abort();
  opts.signal?.addEventListener('abort', forward);

  try {
    const res = await cloudFetch('/api/vision/scan-audio', {
      method: 'POST',
      body: form,
      signal: ctrl.signal,
    });
    return res as SpeechResponse;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw timedOut ? new ScanTimeoutError() : new ScanAbortedError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', forward);
  }
}

/**
 * Kirim transkrip yang sudah dihasilkan perangkat untuk diurai jadi produk.
 *
 * Payload-nya teks, bukan berkas, jadi jauh lebih cepat sampai daripada
 * `scanProductsFromAudio` — itu keunggulan utama jalur ini di jaringan warung.
 * Batas tunggunya ikut diperketat: kalau permintaan sekecil ini menggantung
 * satu setengah menit, yang terjadi bukan lambat tapi macet.
 */
const TRANSCRIPT_TIMEOUT_MS = 45_000;

export async function parseProductsFromTranscript(
  transcript: string,
  hints: CatalogHints,
  opts: { storeId?: string; signal?: AbortSignal } = {},
): Promise<SpeechResponse> {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, TRANSCRIPT_TIMEOUT_MS);

  const forward = () => ctrl.abort();
  opts.signal?.addEventListener('abort', forward);

  try {
    const res = await cloudFetch('/api/vision/parse-transcript', {
      method: 'POST',
      body: JSON.stringify({ transcript, catalog: hints, storeId: opts.storeId }),
      signal: ctrl.signal,
    });
    return res as SpeechResponse;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw timedOut ? new ScanTimeoutError() : new ScanAbortedError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', forward);
  }
}
