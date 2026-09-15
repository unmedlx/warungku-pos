/**
 * Kuota Keranjang Suara untuk pengguna gratis: 10 sesi mikrofon per bulan.
 *
 * Hybrid online/offline. Layar kasir wajib hidup tanpa internet, jadi
 * keputusannya selalu diambil dari cache lokal; server hanya memperbarui cache
 * itu dan menjadi hakim terakhir saat perangkat online. Sesi yang terjadi saat
 * offline disimpan sebagai `pending` dan dikirim begitu koneksi kembali.
 */

import { cloudFetch, CloudApiError } from './cloud-api';

export const FREE_VOICE_CART_SESSIONS = 10;

/**
 * Mikrofon yang dinyalakan lagi sebentar setelah mati — "Coba lagi" setelah
 * jaringan putus, atau stop lalu lanjut bicara — masih dianggap sesi yang sama.
 * Tanpa ini satu transaksi bisa menghabiskan beberapa jatah sekaligus.
 */
export const SESSION_GRACE_MS = 60_000;

const MAX_PENDING_AGE_MS = 40 * 24 * 60 * 60 * 1000;

export interface VoiceCartQuotaView {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
}

export interface PendingSession {
  id: string;
  startedAt: string;
  storeId?: string;
}

export interface VoiceCartCache {
  /** Bulan kalender lokal, `YYYY-MM`. */
  period: string;
  /** Pemakaian yang sudah dikonfirmasi server untuk periode ini. */
  serverUsed: number;
  limit: number;
  unlimited: boolean;
  /** Sesi yang belum diterima server. Untuk tamu (belum login) selamanya di sini. */
  pending: PendingSession[];
  /** Kapan sesi terakhir yang dihitung berakhir — dasar jendela `SESSION_GRACE_MS`. */
  lastSessionAt: number | null;
}

interface ServerQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  unlimited: boolean;
  resetsAt: string;
}

export const periodOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const storageKey = (userKey: string) => `kankitu.voiceCartQuota.v1.${userKey}`;

export function emptyCache(now = new Date()): VoiceCartCache {
  return {
    period: periodOf(now),
    serverUsed: 0,
    limit: FREE_VOICE_CART_SESSIONS,
    unlimited: false,
    pending: [],
    lastSessionAt: null,
  };
}

/** Pergantian bulan: hitungan server diulang, sesi pending bulan lalu tetap dikirim tapi tidak dihitung. */
export function rollPeriod(cache: VoiceCartCache, now = new Date()): VoiceCartCache {
  const period = periodOf(now);
  if (cache.period === period) return cache;
  // Sesi yang terlalu tua juga ditolak server, jadi tidak perlu disimpan terus.
  const cutoff = now.getTime() - MAX_PENDING_AGE_MS;
  const pending = cache.pending.filter((p) => new Date(p.startedAt).getTime() >= cutoff);
  return { ...cache, period, serverUsed: 0, pending };
}

export function loadCache(userKey: string, now = new Date()): VoiceCartCache {
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) return emptyCache(now);
    const parsed = JSON.parse(raw) as Partial<VoiceCartCache>;
    return rollPeriod({ ...emptyCache(now), ...parsed, pending: parsed.pending ?? [] }, now);
  } catch {
    return emptyCache(now);
  }
}

export function saveCache(userKey: string, cache: VoiceCartCache) {
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(cache));
  } catch {
    /* penyimpanan penuh/diblokir — kuota tetap berjalan di memori */
  }
}

export function viewOf(cache: VoiceCartCache, now = new Date(), subscribed = false): VoiceCartQuotaView {
  const period = periodOf(now);
  const pendingNow = cache.pending.filter((p) => periodOf(new Date(p.startedAt)) === period).length;
  const used = cache.serverUsed + pendingNow;
  const unlimited = subscribed || cache.unlimited;
  return { unlimited, limit: cache.limit, used, remaining: Math.max(0, cache.limit - used) };
}

export function inGrace(cache: VoiceCartCache, now = Date.now()): boolean {
  return cache.lastSessionAt !== null && now - cache.lastSessionAt < SESSION_GRACE_MS;
}

export function canStart(cache: VoiceCartCache, subscribed: boolean, now = new Date()): boolean {
  if (inGrace(cache, now.getTime())) return true;
  const view = viewOf(cache, now, subscribed);
  return view.unlimited || view.remaining > 0;
}

export function applyServerQuota(cache: VoiceCartCache, q: ServerQuota, now = new Date()): VoiceCartCache {
  return {
    ...rollPeriod(cache, now),
    serverUsed: q.used,
    unlimited: q.unlimited,
    limit: q.limit ?? cache.limit,
  };
}

export const newSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `vc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* ── API ─────────────────────────────────────────────────────────────── */

export async function fetchVoiceCartQuota(): Promise<ServerQuota> {
  const res = (await cloudFetch('/api/voice-cart/quota')) as { quota: ServerQuota };
  return res.quota;
}

export async function postVoiceCartSession(s: PendingSession): Promise<ServerQuota> {
  const res = (await cloudFetch('/api/voice-cart/sessions', {
    method: 'POST',
    body: JSON.stringify(s),
  })) as { quota: ServerQuota };
  return res.quota;
}

export async function syncVoiceCartSessions(sessions: PendingSession[]): Promise<ServerQuota> {
  const res = (await cloudFetch('/api/voice-cart/sessions/sync', {
    method: 'POST',
    body: JSON.stringify({ sessions }),
  })) as { quota: ServerQuota };
  return res.quota;
}

/** Galat yang berarti server menjawab dan menolak — bukan gangguan jaringan. */
export const isQuotaExceeded = (err: unknown) =>
  err instanceof CloudApiError && err.status === 429 && err.body?.code === 'VOICE_CART_QUOTA_EXCEEDED';
