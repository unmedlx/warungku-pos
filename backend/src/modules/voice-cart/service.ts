import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { visionConfig } from '@/config';
import { AppError } from '@/lib/error';

export interface VoiceCartQuota {
  /** null berarti tidak dibatasi (pelanggan berbayar). */
  limit: number | null;
  used: number;
  remaining: number | null;
  unlimited: boolean;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Periode mengikuti bulan kalender, sama seperti kuota AI Scan: pemilik toko
 * cukup tahu jatahnya pulih tiap tanggal 1.
 */
function currentPeriod(now = new Date()) {
  return {
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

/**
 * Langganan apa pun yang masih aktif (STORAGE maupun SYNC) membuka Keranjang
 * Suara tanpa batas.
 */
async function hasActiveSubscription(userId: string): Promise<boolean> {
  const count = await prisma.subscription.count({
    where: { userId, hasActiveSubscription: true, endDate: { gt: new Date() } },
  });
  return count > 0;
}

export async function getQuota(userId: string): Promise<VoiceCartQuota> {
  const { periodStart, periodEnd } = currentPeriod();
  const [unlimited, used] = await Promise.all([
    hasActiveSubscription(userId),
    prisma.voiceCartSession.count({
      where: { userId, startedAt: { gte: periodStart, lt: periodEnd } },
    }),
  ]);

  const limit = unlimited ? null : visionConfig.voiceCartFreeQuota;
  return {
    limit,
    used,
    remaining: limit === null ? null : Math.max(0, limit - used),
    unlimited,
    periodStart,
    periodEnd,
  };
}

export interface SessionInput {
  id: string;
  startedAt: Date;
  storeId?: string;
}

/**
 * Batas seberapa jauh ke belakang sesi offline masih diterima. Lebih tua dari
 * itu periodenya sudah lewat dan tidak memengaruhi kuota siapa pun.
 */
const MAX_BACKDATE_MS = 40 * 24 * 60 * 60 * 1000;

function clampStartedAt(startedAt: Date, now: Date): Date | null {
  if (Number.isNaN(startedAt.getTime())) return now;
  if (startedAt.getTime() > now.getTime()) return now; // jam perangkat maju
  if (now.getTime() - startedAt.getTime() > MAX_BACKDATE_MS) return null;
  return startedAt;
}

async function insertSession(userId: string, s: SessionInput, startedAt: Date, offline: boolean) {
  try {
    await prisma.voiceCartSession.create({
      data: { userId, clientSessionId: s.id, storeId: s.storeId, startedAt, offline },
    });
  } catch (err) {
    // Id yang sama dikirim ulang (retry jaringan) — sudah tercatat, abaikan.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return;
    throw err;
  }
}

/**
 * Sesi yang baru dimulai saat perangkat online. Ditolak bila jatah gratis
 * habis — ini satu-satunya titik di mana server benar-benar memblokir.
 */
export async function startSession(userId: string, s: SessionInput): Promise<VoiceCartQuota> {
  const existing = await prisma.voiceCartSession.findUnique({
    where: { userId_clientSessionId: { userId, clientSessionId: s.id } },
  });
  if (existing) return getQuota(userId);

  const before = await getQuota(userId);
  if (!before.unlimited && (before.remaining ?? 0) <= 0) {
    throw new AppError('Jatah Keranjang Suara bulan ini sudah habis', 429, 'VOICE_CART_QUOTA_EXCEEDED');
  }

  await insertSession(userId, s, new Date(), false);
  return getQuota(userId);
}

/**
 * Sesi yang sudah terjadi saat offline. Tidak ditolak meski melewati jatah —
 * mikrofonnya sudah terlanjur menyala — tapi tetap dihitung, sehingga sesi
 * online berikutnya diblokir sampai periode berganti.
 */
export async function syncSessions(userId: string, sessions: SessionInput[]): Promise<VoiceCartQuota> {
  const now = new Date();
  for (const s of sessions) {
    const startedAt = clampStartedAt(s.startedAt, now);
    if (!startedAt) continue;
    await insertSession(userId, s, startedAt, true);
  }
  return getQuota(userId);
}
