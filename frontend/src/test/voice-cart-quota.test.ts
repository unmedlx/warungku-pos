/*
 * ==========================================
 * OFFLINE MODE - VOICE CART QUOTA TESTS DISABLED
 * ==========================================
 * Voice cart quota functionality has been disabled for offline mode.
 * All voice cart quota tests are now commented out.
 */

// import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// import { act, renderHook, waitFor } from '@testing-library/react';
// import {
//   FREE_VOICE_CART_SESSIONS,
//   SESSION_GRACE_MS,
//   applyServerQuota,
//   canStart,
//   emptyCache,
//   loadCache,
//   saveCache,
//   viewOf,
//   type VoiceCartCache,
// } from '@/lib/voice-cart-quota';

// /**
//  * Jatah Keranjang Suara: 10 sesi mikrofon per bulan untuk akun gratis.
//  * Keputusannya lokal supaya kasir tetap jalan offline.
//  */

// const SEPT = new Date(2026, 8, 15, 10, 0, 0);

// const withPending = (n: number, at = SEPT): VoiceCartCache => ({
//   ...emptyCache(at),
//   pending: Array.from({ length: n }, (_, i) => ({ id: `s${i}`, startedAt: at.toISOString() })),
// });

// describe('perhitungan kuota', () => {
//   it('akun gratis berhenti di sesi ke-10', () => {
//     expect(canStart(withPending(9), false, SEPT)).toBe(true);
//     expect(canStart(withPending(FREE_VOICE_CART_SESSIONS), false, SEPT)).toBe(false);
//     expect(viewOf(withPending(10), SEPT).remaining).toBe(0);
//   });

//   it('pelanggan tidak dibatasi', () => {
//     expect(canStart(withPending(50), true, SEPT)).toBe(true);
//     const fromServer = applyServerQuota(emptyCache(SEPT), { limit: null, used: 80, remaining: null, unlimited: true, resetsAt: '' }, SEPT);
//     expect(canStart(fromServer, false, SEPT)).toBe(true);
//   });

//   it('pemakaian server dan sesi offline dijumlah', () => {
//     const cache = { ...withPending(3), serverUsed: 7 };
//     expect(viewOf(cache, SEPT).used).toBe(10);
//     expect(canStart(cache, false, SEPT)).toBe(false);
//   });

//   it('jatah pulih saat bulan berganti', () => {
//     const cache = { ...withPending(10), serverUsed: 0 };
//     saveCache('u1', cache);
//     const october = new Date(2026, 9, 1, 8);
//     const loaded = loadCache('u1', october);
//     expect(viewOf(loaded, october).used).toBe(0);
//     expect(canStart(loaded, october)).toBe(true);
//   });

//   it('nyala ulang dalam jendela sesi yang sama tetap boleh walau jatah habis', () => {
//     const cache = { ...withPending(10), lastSessionAt: SEPT.getTime() - 5000 };
//     expect(canStart(cache, false, SEPT)).toBe(true);
//     const later = new Date(SEPT.getTime() + SESSION_GRACE_MS);
//     expect(canStart(cache, false, later)).toBe(false);
//   });
// });

// /* ── Hook: hybrid online/offline ─────────────────────────────────────── */

// const auth = { profile: { user: { id: 'u-1' } }, isLoggedIn: true, isSubscribed: false, isSyncSubscribed: false };
// vi.mock('@/hooks/use-cloud-auth', () => ({ useCloudAuth: () => auth }));

// const api = vi.hoisted(() => ({ cloudFetch: vi.fn() }));
// vi.mock('@/lib/cloud-api', () => {
//   class CloudApiError extends Error {
//     constructor(message: string, public status: number, public body: unknown) {
//       super(message);
//     }
//   }
//   return { cloudFetch: api.cloudFetch, CloudApiError };
// });

// const quota = (used: number) => ({ quota: { limit: 10, used, remaining: 10 - used, unlimited: false, resetsAt: '' } });

// describe('useVoiceCartQuota', () => {
//   beforeEach(() => {
//     localStorage.clear();
//     api.cloudFetch.mockReset();
//   });
//   afterEach(() => {
//     Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
//   });

//   it('offline: sesi dicatat lokal lalu dikirim saat online', async () => {
//     Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
//     const { useVoiceCartQuota } = await import('@/hooks/use-voice-cart-quota');
//     const { result } = renderHook(() => useVoiceCartQuota());

//     await act(async () => {
//       expect(await result.current.recordStart()).toBe(true);
//     });
//     expect(result.current.quota.used).toBe(1);
//     expect(api.cloudFetch).not.toHaveBeenCalled();

//     api.cloudFetch.mockResolvedValue(quota(1));
//     Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
//     await act(async () => {
//       window.dispatchEvent(new Event('online'));
//     });

//     await waitFor(() => expect(api.cloudFetch).toHaveBeenCalledWith('/api/voice-cart/sessions/sync', expect.anything()));
//     await waitFor(() => expect(JSON.parse(localStorage.getItem('kankitu.voiceCartQuota.v1.u-1')!).pending).toHaveLength(0));
//     expect(result.current.quota.used).toBe(1);
//   });

//   it('online: server menolak saat jatah habis dari perangkat lain', async () => {
//     const { CloudApiError } = await import('@/lib/cloud-api');
//     api.cloudFetch.mockImplementation(async (path: string) => {
//       if (path === '/api/voice-cart/quota') return quota(9);
//       throw new CloudApiError('habis', 429, { code: 'VOICE_CART_QUOTA_EXCEEDED' });
//     });
//     const { useVoiceCartQuota } = await import('@/hooks/use-voice-cart-quota');
//     const { result } = renderHook(() => useVoiceCartQuota());
//     await waitFor(() => expect(result.current.quota.used).toBe(9));

//     let ok = true;
//     await act(async () => {
//       ok = await result.current.recordStart();
//     });
//     expect(ok).toBe(false);
//     expect(result.current.canStart()).toBe(false);
//   });
// });
