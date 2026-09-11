import { clearToken, getToken } from './auth';
import type { Account, Comparison, Health, Overview, Profile, Store, Trend } from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Dipasang oleh App agar 401 langsung memicu layar login, bukan error diam. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

/**
 * Satu-satunya tempat 401 ditangani. `downloadExport` tidak bisa lewat `send`
 * karena harus memproses blob, dan dulu ia punya penanganan errornya sendiri
 * yang lupa membuang token — sesi kadaluwarsa hanya memunculkan "Ekspor gagal"
 * sementara pengguna tetap duduk di dashboard dengan angka basi. Cabang 401-nya
 * diangkat ke sini supaya kedua jalur tidak bisa mencong lagi.
 */
function tolakKarenaSesiHabis(): never {
  clearToken();
  onUnauthorized?.();
  throw new ApiError('Sesi berakhir, silakan masuk lagi.', 401);
}

interface SendOptions {
  params?: Record<string, string | undefined>;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function send<T>(path: string, opts: SendOptions = {}): Promise<T> {
  const { params, method = 'GET', body } = opts;
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v) url.searchParams.set(k, v);
  }

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401) tolakKarenaSesiHabis();
  if (!res.ok) {
    let msg = method === 'GET' ? `Gagal memuat data (${res.status})` : `Gagal menyimpan (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) msg = errBody.error;
    } catch {
      /* respons bukan JSON — pakai pesan default */
    }
    throw new ApiError(msg, res.status);
  }
  // 204 No Content (mis. hapus toko) tidak punya body untuk di-parse.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function request<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  return send<T>(path, { params });
}

export interface Range {
  from?: string;
  to?: string;
  [key: string]: string | undefined;
}

/**
 * Backend membungkus profil di dalam `{ user, subscription, storageUsage, ... }`
 * (lihat backend `getUserProfile`), sementara dashboard hanya butuh bagian
 * user-nya. Tanpa unwrap ini `profile.name` undefined dan App langsung crash.
 */
export const fetchProfile = async (): Promise<Profile> => {
  const body = await request<Profile | { user: Profile }>('/api/user/profile');
  return body && typeof body === 'object' && 'user' in body ? body.user : (body as Profile);
};

/** Respons profil utuh — dipakai halaman Pengaturan (paket, kuota, langganan). */
export const fetchAccount = () => request<Account>('/api/user/profile');

// === Toko & cabang ===

export const fetchStores = async (): Promise<Store[]> => {
  const body = await request<{ stores: Store[] }>('/api/stores');
  return body.stores ?? [];
};

export const createStore = async (name: string): Promise<Store> => {
  const body = await send<{ store: Store }>('/api/stores', { method: 'POST', body: { name } });
  return body.store;
};

/** Backend mewajibkan `name`; field lain opsional dan hanya dikirim saat diubah. */
export const updateStore = async (
  id: string,
  data: { name: string; phone?: string | null; address1?: string | null; timezone?: string | null },
): Promise<Store> => {
  const body = await send<{ store: Store }>(`/api/stores/${id}`, { method: 'PUT', body: data });
  return body.store;
};

export const deleteStore = (id: string) => send<void>(`/api/stores/${id}`, { method: 'DELETE' });

export const updateStoreVisibility = async (id: string, isPublic: boolean): Promise<Store> => {
  const body = await send<{ store: Store }>(`/api/stores/${id}/visibility`, {
    method: 'PATCH',
    body: { isPublic },
  });
  return body.store;
};

export const updateStoreIdentifier = async (id: string, identifier: string | null): Promise<Store> => {
  const body = await send<{ store: Store }>(`/api/stores/${id}/identifier`, {
    method: 'PATCH',
    body: { identifier },
  });
  return body.store;
};

export const checkIdentifier = async (q: string): Promise<boolean> => {
  const body = await request<{ available: boolean }>('/api/stores/identifier/check', { q });
  return body.available;
};

export const fetchOverview = (range: Range) =>
  request<Overview>('/api/analytics/overview', range);

export const fetchComparison = (range: Range) =>
  request<Comparison>('/api/analytics/compare', range);

export const fetchTrend = (months = 12, storeId?: string) =>
  request<Trend>('/api/analytics/trend', { months: String(months), storeId });

export const fetchHealth = () => request<Health>('/api/analytics/health');

/**
 * Unduh CSV. Endpoint butuh header Authorization sehingga tidak bisa dibuka
 * lewat `<a href>` biasa — ambil sebagai blob lalu picu unduhan.
 */
export async function downloadExport(dataset: 'daily' | 'transactions', range: Range) {
  const url = new URL('/api/analytics/export', BASE_URL);
  url.searchParams.set('dataset', dataset);
  if (range.from) url.searchParams.set('from', range.from);
  if (range.to) url.searchParams.set('to', range.to);

  const token = getToken();
  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) tolakKarenaSesiHabis();
  if (!res.ok) throw new ApiError('Ekspor gagal', res.status);

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `kanpos-${dataset}-${range.from ?? 'awal'}-${range.to ?? 'kini'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
