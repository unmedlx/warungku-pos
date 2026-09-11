import { prisma } from '@/lib/db';
import { visionConfig } from '@/config';
import { AppError, BadRequestError } from '@/lib/error';
import { getVisionProvider } from './providers';
import { MAX_TRANSCRIPT_CHARS, type CatalogHints } from './speech-schema';
import type { ExtractedProduct, SpokenProduct, VisionAudio, VisionImage } from './types';

export interface ScanQuota {
  /** Jatah per periode. */
  limit: number;
  used: number;
  remaining: number;
  /** Kapan hitungan pemakaian dimulai ulang. */
  periodStart: Date;
  periodEnd: Date;
  /** Dari paket berbayar, atau jatah gratis. */
  source: 'plan' | 'free';
}

/**
 * Periode kuota mengikuti bulan kalender, bukan tanggal langganan.
 *
 * Pilihan sederhana yang disengaja: pemilik toko bisa menebak sendiri kapan
 * jatahnya pulih ("tanggal 1"), tanpa harus tahu kapan ia berlangganan.
 */
function currentPeriod(now = new Date()) {
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { periodStart, periodEnd };
}

export async function getQuota(userId: string): Promise<ScanQuota> {
  const { periodStart, periodEnd } = currentPeriod();

  const [subscriptions, used] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId, hasActiveSubscription: true, endDate: { gt: new Date() } },
      include: { plan: true },
    }),
    prisma.aiScanUsage.count({
      where: {
        userId,
        countsAgainstQuota: true,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
    }),
  ]);

  // Pengguna bisa memegang lebih dari satu langganan aktif (storage + sync);
  // yang berlaku adalah jatah terbesar, bukan yang pertama ditemukan.
  const planQuota = subscriptions.reduce((max, s) => Math.max(max, s.plan.aiScanQuota ?? 0), 0);
  const limit = planQuota > 0 ? planQuota : visionConfig.freeQuota;

  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    periodStart,
    periodEnd,
    source: planQuota > 0 ? 'plan' : 'free',
  };
}

export function isEnabled(): boolean {
  return visionConfig.enabled;
}

export interface ScanResult {
  products: ExtractedProduct[];
  unreadableReason: string | null;
  quota: ScanQuota;
}

/**
 * Panggilan provider selalu dibatasi waktu.
 *
 * SDK provider punya percobaan ulang berjenjang sendiri, sehingga satu
 * permintaan bisa tertahan jauh lebih lama daripada satu panggilan biasa.
 * Tanpa batas di sini, request HTTP tidak pernah membalas dan aplikasi
 * terkunci di layar memproses.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AppError('Pemrosesan terlalu lama. Coba lagi.', 504, 'VISION_TIMEOUT')),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export async function scanProducts(
  userId: string,
  images: VisionImage[],
  storeId?: string,
): Promise<ScanResult> {
  if (!visionConfig.enabled) {
    throw new AppError('Fitur scan foto belum aktif di server ini', 503, 'VISION_DISABLED');
  }
  if (images.length === 0) throw new BadRequestError('Tidak ada foto yang dikirim');
  if (images.length > visionConfig.maxImages) {
    throw new BadRequestError(`Maksimal ${visionConfig.maxImages} foto sekali proses`);
  }

  // Kuota diperiksa sebelum memanggil provider — memanggil dulu lalu menolak
  // hasilnya berarti membayar untuk pekerjaan yang dibuang.
  const quotaBefore = await getQuota(userId);
  if (quotaBefore.remaining <= 0) {
    throw new AppError('Kuota scan bulan ini sudah habis', 429, 'VISION_QUOTA_EXCEEDED');
  }

  const provider = getVisionProvider();
  const result = await withTimeout(provider.extractProducts(images), visionConfig.timeoutMs);

  /**
   * Percobaan yang tidak menghasilkan satu baris pun tetap dicatat sebagai
   * jejak biaya, tapi tidak memotong kuota. Memotong jatah karena kamera HP
   * pengguna buruk terasa seperti dihukum, dan itu keluhan yang wajar.
   */
  const countsAgainstQuota = result.products.length > 0;

  await prisma.aiScanUsage.create({
    data: {
      userId,
      storeId: storeId ?? null,
      provider: provider.name,
      model: provider.model,
      kind: 'image',
      imageCount: images.length,
      rowCount: result.products.length,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      countsAgainstQuota,
    },
  });

  return {
    products: result.products,
    unreadableReason: result.unreadableReason,
    quota: await getQuota(userId),
  };
}

export interface SpeechResult {
  products: SpokenProduct[];
  transcript: string | null;
  unreadableReason: string | null;
  quota: ScanQuota;
}

/**
 * Ekstraksi produk dari rekaman suara.
 *
 * Alurnya sengaja dibuat kembaran `scanProducts` — kuota diperiksa lebih dulu,
 * panggilan provider dibatasi waktu, dan percobaan nol baris dicatat tapi
 * tidak memotong jatah. Perbedaan perlakuan di antara keduanya hanya akan
 * jadi kejutan buat pemilik toko: dari sisi dia, keduanya "pakai AI sekali".
 */
export async function scanProductsFromAudio(
  userId: string,
  audio: VisionAudio,
  hints: CatalogHints,
  storeId?: string,
): Promise<SpeechResult> {
  if (!visionConfig.enabled) {
    throw new AppError('Fitur suara belum aktif di server ini', 503, 'VISION_DISABLED');
  }
  if (audio.buffer.length === 0) throw new BadRequestError('Rekaman kosong');
  if (audio.durationSec > visionConfig.maxAudioSeconds + 2) {
    throw new BadRequestError(
      `Rekaman maksimal ${visionConfig.maxAudioSeconds} detik sekali proses`,
    );
  }

  const quotaBefore = await getQuota(userId);
  if (quotaBefore.remaining <= 0) {
    throw new AppError('Kuota AI bulan ini sudah habis', 429, 'VISION_QUOTA_EXCEEDED');
  }

  const provider = getVisionProvider();
  if (!provider.extractProductsFromAudio) {
    // Provider yang hanya bisa melihat tetap sah untuk foto. Yang tidak boleh
    // terjadi adalah aplikasi menampilkan tombol rekam lalu gagal di akhir,
    // jadi `/quota` juga mengabarkan kesiapan ini sebelum tombolnya muncul.
    throw new AppError('Provider ini belum mendukung suara', 503, 'SPEECH_UNSUPPORTED');
  }

  const result = await withTimeout(
    provider.extractProductsFromAudio(audio, hints),
    visionConfig.timeoutMs,
  );

  const countsAgainstQuota = result.products.length > 0;

  await prisma.aiScanUsage.create({
    data: {
      userId,
      storeId: storeId ?? null,
      provider: provider.name,
      model: provider.model,
      kind: 'audio',
      imageCount: 0,
      durationMs: Math.round(audio.durationSec * 1000),
      rowCount: result.products.length,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      countsAgainstQuota,
    },
  });

  return {
    products: result.products,
    transcript: result.transcript,
    unreadableReason: result.unreadableReason,
    quota: await getQuota(userId),
  };
}

/** Dipakai `/quota` supaya aplikasi tahu apakah tombol rekam layak ditampilkan. */
export function isSpeechEnabled(): boolean {
  if (!visionConfig.enabled) return false;
  try {
    return typeof getVisionProvider().extractProductsFromAudio === 'function';
  } catch {
    return false;
  }
}

/**
 * Ekstraksi produk dari transkrip yang dihasilkan perangkat.
 *
 * Jalur ini jauh lebih murah daripada mengirim audio — teks pendek, tanpa
 * token audio. Meski begitu pemakaiannya tetap memotong kuota yang sama.
 * Membedakannya akan memaksa pemilik toko memahami perbedaan yang tidak dia
 * pilih dan tidak dia lihat: dari sisi dia, dua-duanya "bicara ke aplikasi
 * sekali". Kalau ongkosnya ingin dibedakan, tempatnya di jatah paket, bukan di
 * kepala pengguna.
 */
export async function parseProductsFromTranscript(
  userId: string,
  transcript: string,
  hints: CatalogHints,
  storeId?: string,
): Promise<SpeechResult> {
  if (!visionConfig.enabled) {
    throw new AppError('Fitur suara belum aktif di server ini', 503, 'VISION_DISABLED');
  }

  const cleaned = transcript.trim();
  if (cleaned.length === 0) throw new BadRequestError('Transkrip kosong');
  if (cleaned.length > MAX_TRANSCRIPT_CHARS) {
    throw new BadRequestError('Ucapan terlalu panjang untuk diproses sekaligus');
  }

  const quotaBefore = await getQuota(userId);
  if (quotaBefore.remaining <= 0) {
    throw new AppError('Kuota AI bulan ini sudah habis', 429, 'VISION_QUOTA_EXCEEDED');
  }

  const provider = getVisionProvider();
  if (!provider.parseTranscript) {
    throw new AppError('Provider ini belum mendukung suara', 503, 'SPEECH_UNSUPPORTED');
  }

  const result = await withTimeout(
    provider.parseTranscript(cleaned, hints),
    visionConfig.timeoutMs,
  );

  const countsAgainstQuota = result.products.length > 0;

  await prisma.aiScanUsage.create({
    data: {
      userId,
      storeId: storeId ?? null,
      provider: provider.name,
      model: provider.model,
      kind: 'transcript',
      imageCount: 0,
      rowCount: result.products.length,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      countsAgainstQuota,
    },
  });

  return {
    products: result.products,
    transcript: result.transcript,
    unreadableReason: result.unreadableReason,
    quota: await getQuota(userId),
  };
}

/**
 * Dipakai `/quota` supaya aplikasi tahu jalur mana yang layak ditawarkan.
 *
 * Dipisah dari `isSpeechEnabled` karena keduanya bisa berbeda: provider yang
 * bisa mengurai teks belum tentu bisa mendengar audio, dan aplikasi memilih
 * jalurnya berdasarkan ini digabung dengan ketersediaan pengenalan suara di
 * perangkat.
 */
export function isTranscriptEnabled(): boolean {
  if (!visionConfig.enabled) return false;
  try {
    return typeof getVisionProvider().parseTranscript === 'function';
  } catch {
    return false;
  }
}
