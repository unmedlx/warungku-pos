import { useCallback, useEffect, useRef, useState } from 'react';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import {
  applyServerQuota,
  canStart as cacheCanStart,
  fetchVoiceCartQuota,
  inGrace,
  isQuotaExceeded,
  loadCache,
  newSessionId,
  postVoiceCartSession,
  saveCache,
  syncVoiceCartSessions,
  viewOf,
  type VoiceCartCache,
  type VoiceCartQuotaView,
} from '@/lib/voice-cart-quota';

export interface UseVoiceCartQuota {
  quota: VoiceCartQuotaView;
  /** Boleh menyalakan mikrofon sekarang? Keputusan lokal, tidak menunggu jaringan. */
  canStart: () => boolean;
  /**
   * Catat bahwa mikrofon benar-benar menyala. `false` bila server menolak
   * (jatah habis dari perangkat lain) — pemanggil wajib mematikan mikrofon.
   */
  recordStart: () => Promise<boolean>;
  /** Mikrofon mati; membuka jendela sesi-yang-sama untuk "Coba lagi". */
  recordStop: () => void;
}

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

export function useVoiceCartQuota(storeId?: string): UseVoiceCartQuota {
  const { profile, isLoggedIn, isSubscribed, isSyncSubscribed } = useCloudAuth();
  const subscribed = isSubscribed || isSyncSubscribed;
  const userKey = profile?.user?.id ?? (isLoggedIn ? 'pending-profile' : 'guest');
  const canUseServer = isLoggedIn && !!profile?.user?.id;

  const cacheRef = useRef<VoiceCartCache>(loadCache(userKey));
  const [cache, setCacheState] = useState<VoiceCartCache>(cacheRef.current);

  const setCache = useCallback(
    (next: VoiceCartCache) => {
      cacheRef.current = next;
      saveCache(userKey, next);
      setCacheState(next);
    },
    [userKey],
  );

  // Ganti akun (atau profil baru termuat): baca cache milik akun itu.
  useEffect(() => {
    const next = loadCache(userKey);
    cacheRef.current = next;
    setCacheState(next);
  }, [userKey]);

  /** Kirim sesi offline lalu segarkan hitungan dari server. Gagal diam-diam. */
  const refresh = useCallback(async () => {
    if (!canUseServer || !isOnline()) return;
    try {
      const pending = cacheRef.current.pending;
      const q = pending.length > 0 ? await syncVoiceCartSessions(pending) : await fetchVoiceCartQuota();
      const sent = new Set(pending.map((p) => p.id));
      const latest = cacheRef.current;
      setCache({ ...applyServerQuota(latest, q), pending: latest.pending.filter((p) => !sent.has(p.id)) });
    } catch {
      /* offline atau server sibuk — cache lokal tetap dipakai */
    }
  }, [canUseServer, setCache]);

  useEffect(() => {
    void refresh();
    const onOnline = () => void refresh();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refresh]);

  const canStart = useCallback(() => cacheCanStart(cacheRef.current, subscribed), [subscribed]);

  const recordStart = useCallback(async () => {
    const now = new Date();
    const current = cacheRef.current;

    // Nyala ulang dalam jendela sesi yang sama: tidak dihitung lagi.
    if (inGrace(current, now.getTime())) {
      setCache({ ...current, lastSessionAt: now.getTime() });
      return true;
    }

    const session = { id: newSessionId(), startedAt: now.toISOString(), storeId };
    const withSession = { ...current, lastSessionAt: now.getTime() };

    if (canUseServer && isOnline()) {
      try {
        const q = await postVoiceCartSession(session);
        setCache(applyServerQuota({ ...cacheRef.current, lastSessionAt: now.getTime() }, q));
        return true;
      } catch (err) {
        if (isQuotaExceeded(err)) {
          const latest = cacheRef.current;
          setCache({ ...latest, serverUsed: Math.max(latest.serverUsed, latest.limit), unlimited: false, lastSessionAt: null });
          return false;
        }
        // Jaringan putus di tengah jalan: jatuh ke jalur offline di bawah.
      }
    }

    setCache({ ...withSession, pending: [...withSession.pending, session] });
    return true;
  }, [canUseServer, setCache, storeId]);

  const recordStop = useCallback(() => {
    const latest = cacheRef.current;
    if (latest.lastSessionAt === null) return;
    setCache({ ...latest, lastSessionAt: Date.now() });
  }, [setCache]);

  return { quota: viewOf(cache, new Date(), subscribed), canStart, recordStart, recordStop };
}
