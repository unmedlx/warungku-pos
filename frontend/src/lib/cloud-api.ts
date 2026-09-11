/**
 * Thin client untuk KanPOS Cloud API (backup + subscription).
 *
 * Token Google ID (JWT) di-inject lewat getter yang didaftarkan oleh
 * use-cloud-auth, supaya call site tidak perlu mengoper token manual.
 */

const BASE_URL = (import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:3210').replace(/\/$/, '');

let tokenGetter: () => string | null = () => null;
export function setCloudTokenGetter(fn: () => string | null) {
  tokenGetter = fn;
}

/**
 * Didaftarkan oleh use-cloud-auth. Mengembalikan true bila sesi berhasil
 * diperpanjang, sehingga request yang kena 401 layak diulang.
 */
let refreshHandler: (() => Promise<boolean>) | null = null;
export function setCloudRefreshHandler(fn: (() => Promise<boolean>) | null) {
  refreshHandler = fn;
}

// === Types ===
export type PlanCategory = 'STORAGE' | 'SYNC';

export interface Plan {
  id: string;
  name: string;
  storageLimitMb: number;
  price: number;
  category: PlanCategory;
  maxStores: number | null;
  /** Batas anggota per toko (termasuk pemilik). null = tak terbatas. */
  maxMembers?: number | null;
}

export interface StorageUsage {
  usedBytes?: number;
  usedMb: number;
  limitMb: number;
  remainingMb: number;
}

export interface Subscription {
  id: string;
  planId: string;
  plan: Plan;
  startDate: string;
  endDate: string;
  status: string; // ACTIVE | EXPIRED | ...
  hasActiveSubscription: boolean;
}

export interface CloudUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  planId: string | null;
  storageLimitMb: number;
  syncExpiry: string | null;
  maxStores?: number | null; // batas jumlah toko sesuai paket sync aktif
  createdAt: string;
}

export interface CloudBackup {
  id: string;
  userId?: string;
  fileName: string;
  fileKey?: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface CloudStore {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  identifier?: string | null;
  address1?: string | null;
  address2?: string | null;
  provinceId?: number | null;
  provinceName?: string | null;
  cityId?: number | null;
  cityName?: string | null;
  districtId?: number | null;
  districtName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  timezone?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operationalHours?: any;
  logoUrl?: string | null;
  /** Peran user yang sedang login di toko ini. null pada respons lama. */
  role?: StoreRole | null;
  isOwner?: boolean | null;
  _count?: {
    products: number;
    storeTransactions: number;
    backups: number;
  };
}

export type StoreRole = 'OWNER' | 'ADMIN' | 'STAFF';

/** Anggota cloud sebuah toko — akun Google yang diundang pemilik. */
export interface StoreMember {
  id: string;
  userId: string;
  storeId: string;
  role: StoreRole;
  permissions: string[] | null;
  name: string | null;
  email: string | null;
  picture: string | null;
  joinedAt: string;
}

/** Undangan yang belum diterima. `code` diberikan ke calon anggota. */
export interface StoreInvite {
  id: string;
  storeId: string;
  email: string;
  role: StoreRole;
  permissions: string[] | null;
  code: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserProfile {
  user: CloudUser;
  subscription: Subscription | null;
  syncSubscription: Subscription | null;
  storageUsage: StorageUsage;
  backups: CloudBackup[];
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface PageParams {
  page?: number;
  limit?: number;
}

function buildPageQuery(params?: PageParams): string {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// Fallback pagination bila server (versi lama) tidak mengembalikan blok pagination.
function fallbackPagination<T>(items: T[], params?: PageParams): Pagination {
  const limit = params?.limit ?? items.length;
  return { page: params?.page ?? 1, limit, totalItems: items.length, totalPages: 1, hasMore: false };
}

export interface CheckoutResult {
  message: string;
  paymentLink: string;
  transaction: { id: string; status: string; planId: string; amount: number };
}

export interface VerifyResult {
  message: string;
  transaction: { id: string; status: string };
}

export interface PaymentTransaction {
  id: string;
  userId?: string;
  planId: string;
  amount: number;
  status: string; // PENDING | COMPLETED | FAILED | ...
  paymentGatewayRef?: string;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
}

// === Core fetch ===
class CloudApiError extends Error {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = 'CloudApiError';
    this.status = status;
    this.body = body;
  }
}

function authHeaders(): Record<string, string> {
  const token = tokenGetter();
  if (!token) throw new CloudApiError('Belum login Google', 401, null);
  return { Authorization: `Bearer ${token}` };
}

/**
 * `fetch` yang tahu cara memperpanjang sesi.
 *
 * Access token berumur jam-an, jadi 401 di tengah pemakaian adalah hal biasa —
 * bukan tanda user harus login ulang. Sekali kena 401, sesi diperpanjang lalu
 * request diulang dengan token baru. Kalau perpanjangan juga gagal, barulah
 * 401 diteruskan ke pemanggil.
 */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401 || !refreshHandler) return res;

  const refreshed = await refreshHandler().catch(() => false);
  if (!refreshed) return res;

  const token = tokenGetter();
  if (!token) return res;

  return fetch(input, {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
  });
}

async function parseError(res: Response): Promise<never> {
  let body: unknown = null;
  let message = `Permintaan gagal (${res.status})`;
  try {
    body = await res.json();
    if (body && typeof body === 'object' && 'error' in body) {
      message = String((body as { error: unknown }).error);
    }
  } catch {
    /* non-JSON error body */
  }
  throw new CloudApiError(message, res.status, body);
}

/**
 * Pemanggil generik untuk endpoint bertoken.
 *
 * Modul lain (mis. `vision-api`) memakai ini supaya penanganan refresh token,
 * header auth, dan penerjemahan galat tidak ditulis ulang — termasuk
 * `code` dari server yang dipakai UI untuk membedakan jenis kegagalan.
 */
export async function cloudFetch(path: string, init?: RequestInit): Promise<unknown> {
  const headers: Record<string, string> = { ...authHeaders() };
  // FormData harus membawa boundary-nya sendiri; menyetel Content-Type manual
  // di sini justru merusak unggahan multipart.
  if (init?.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await apiFetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) await parseError(res);
  if (res.status === 204) return null;
  return res.json();
}

// === Endpoints ===

/** Daftar paket langganan (publik, tanpa auth). */
export async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch(`${BASE_URL}/api/plans`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.plans ?? [];
}

/* ── Sesi ────────────────────────────────────────────────────────────── */

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  /** true bila akun baru dibuat pada login ini — dipakai untuk sambutan. */
  isNewUser?: boolean;
  user: { id: string; email: string; name: string; picture?: string | null };
}

/**
 * Tukar Google ID token dengan sesi backend. Sekaligus sign in dan sign up:
 * backend membuat user kalau `googleSub`-nya belum dikenal.
 */
export async function createSession(idToken: string): Promise<SessionResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

/** Perpanjang sesi. Sengaja `fetch` biasa supaya tidak memanggil dirinya sendiri. */
export async function refreshSession(refreshToken: string): Promise<SessionResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

/* ── Bootstrap ───────────────────────────────────────────────────────── */

export interface PendingInvite {
  id: string;
  storeId: string;
  storeName: string | null;
  storeLogoUrl: string | null;
  role: StoreRole;
  expiresAt: string;
}

/**
 * Jawaban atas "apa yang harus ditampilkan setelah login?" dalam satu panggilan:
 * punya toko sendiri, terhubung ke toko orang lain, atau belum punya apa-apa.
 */
export interface BootstrapData {
  user: CloudUser;
  subscription: Subscription | null;
  syncSubscription: Subscription | null;
  storageUsage: StorageUsage;
  stores: CloudStore[];
  pendingInvites: PendingInvite[];
  canCreateStore: boolean;
  maxStores: number;
  ownedStoreCount: number;
}

/**
 * Data pembuka aplikasi: user, langganan, daftar toko, dan undangan tertunda.
 *
 * Diberi batas waktu karena pemanggilnya — gerbang akun — berdiri di depan
 * seluruh aplikasi. Server yang lambat atau jaringan yang menggantung tidak
 * boleh membuat kasir tak bisa dibuka; lewat batas ini, pemanggil jatuh ke
 * jalur toko lokal.
 */
export async function fetchBootstrap(timeoutMs = 8000): Promise<BootstrapData> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await apiFetch(`${BASE_URL}/api/bootstrap`, {
      headers: authHeaders(),
      signal: ctrl.signal,
    });
    if (!res.ok) await parseError(res);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Profil user + status langganan + kuota + daftar backup. */
export async function fetchProfile(): Promise<UserProfile> {
  const res = await apiFetch(`${BASE_URL}/api/user/profile`, { headers: authHeaders() });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function listBackups(params?: PageParams): Promise<Paginated<CloudBackup>> {
  const res = await apiFetch(`${BASE_URL}/api/backups${buildPageQuery(params)}`, { headers: authHeaders() });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  const items: CloudBackup[] = data.backups ?? [];
  return { items, pagination: data.pagination ?? fallbackPagination(items, params) };
}

/** Upload satu file JSON backup (multipart). storeId wajib jika user punya sync subscription aktif. */
export async function uploadBackup(jsonString: string, fileName: string, storeId?: string): Promise<CloudBackup> {
  const form = new FormData();
  const blob = new Blob([jsonString], { type: 'application/json' });
  form.append('file', blob, fileName);
  if (storeId) form.append('storeId', storeId);
  const res = await apiFetch(`${BASE_URL}/api/backups`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.backup;
}

/** Unduh isi backup (JSON) untuk restore. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function downloadBackup(id: string): Promise<any> {
  const res = await apiFetch(`${BASE_URL}/api/backups/${id}/download`, { headers: authHeaders() });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function deleteBackup(id: string): Promise<void> {
  const res = await apiFetch(`${BASE_URL}/api/backups/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res);
}

export async function checkoutPlan(planId: string, opts?: { mobile?: string; redirectURL?: string }): Promise<CheckoutResult> {
  const res = await apiFetch(`${BASE_URL}/api/payments/checkout`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, ...opts }),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function verifyPayment(transactionId: string): Promise<VerifyResult> {
  const res = await apiFetch(`${BASE_URL}/api/payments/verify/${transactionId}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

/** Riwayat transaksi pembelian/langganan user (paginated). */
export async function fetchPaymentHistory(params?: PageParams): Promise<Paginated<PaymentTransaction>> {
  const res = await apiFetch(`${BASE_URL}/api/payments/history${buildPageQuery(params)}`, { headers: authHeaders() });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  const items: PaymentTransaction[] = data.history ?? [];
  return { items, pagination: data.pagination ?? fallbackPagination(items, params) };
}

// === Store Management ===

export async function fetchStores(): Promise<CloudStore[]> {
  const res = await apiFetch(`${BASE_URL}/api/stores`, { headers: authHeaders() });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.stores ?? [];
}

export async function createStore(name: string): Promise<CloudStore> {
  const res = await apiFetch(`${BASE_URL}/api/stores`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.store;
}

export async function renameStore(id: string, name: string): Promise<CloudStore> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${id}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.store;
}

export async function deleteStore(id: string): Promise<void> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res);
}

export interface CloudStoreUpdateInput {
  name: string;
  address1?: string | null;
  address2?: string | null;
  provinceId?: number | null;
  provinceName?: string | null;
  cityId?: number | null;
  cityName?: string | null;
  districtId?: number | null;
  districtName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  timezone?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operationalHours?: any;
}

export interface DestinationItem {
  id: number;
  name: string;
}

export async function checkIdentifierAvailability(q: string): Promise<boolean> {
  const res = await apiFetch(`${BASE_URL}/api/stores/identifier/check?q=${encodeURIComponent(q)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return !!data.available;
}

export async function updateStoreIdentifier(id: string, identifier: string | null): Promise<CloudStore> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${id}/identifier`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.store;
}

export async function updateStoreVisibility(id: string, isPublic: boolean): Promise<CloudStore> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${id}/visibility`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPublic }),
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.store;
}

export async function updateStoreDetails(id: string, data: CloudStoreUpdateInput): Promise<CloudStore> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${id}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await parseError(res);
  const dataJson = await res.json();
  return dataJson.store;
}

export async function fetchProvinces(): Promise<DestinationItem[]> {
  const res = await apiFetch(`${BASE_URL}/api/destinations/provinces`, { headers: authHeaders() });
  if (!res.ok) await parseError(res);
  const json = await res.json();
  return json.data ?? [];
}

export async function fetchCities(provinceId: number | string): Promise<DestinationItem[]> {
  const res = await apiFetch(`${BASE_URL}/api/destinations/cities/${provinceId}`, { headers: authHeaders() });
  if (!res.ok) await parseError(res);
  const json = await res.json();
  return json.data ?? [];
}

export async function fetchDistricts(cityId: number | string): Promise<DestinationItem[]> {
  const res = await apiFetch(`${BASE_URL}/api/destinations/districts/${cityId}`, { headers: authHeaders() });
  if (!res.ok) await parseError(res);
  const json = await res.json();
  return json.data ?? [];
}

export async function uploadStoreLogo(id: string, file: File): Promise<CloudStore> {
  const form = new FormData();
  form.append('logo', file);
  const res = await apiFetch(`${BASE_URL}/api/stores/${id}/logo`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.store;
}

export async function deleteStoreLogo(id: string): Promise<CloudStore> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${id}/logo`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.store;
}

/**
 * Daftar karyawan (`users`) sengaja tidak lagi ikut di sini. Sumber
 * kebenarannya sekarang endpoint anggota di atas — kalau keduanya jalan,
 * perangkat yang membawa daftar lama bisa menghidupkan kembali anggota yang
 * sudah dikeluarkan pemilik.
 */
// === Anggota toko (multi-user cloud) ===

/** Daftar anggota + undangan yang masih berlaku. `invites` kosong untuk STAFF. */
export async function fetchStoreMembers(
  storeId: string,
): Promise<{ members: StoreMember[]; invites: StoreInvite[]; myRole: StoreRole }> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${storeId}/members`, {
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return { members: data.members ?? [], invites: data.invites ?? [], myRole: data.myRole };
}

export async function inviteStoreMember(
  storeId: string,
  input: { email: string; role: Exclude<StoreRole, 'OWNER'>; permissions?: string[] | null },
): Promise<StoreInvite> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${storeId}/invites`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.invite;
}

export async function revokeStoreInvite(storeId: string, inviteId: string): Promise<void> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${storeId}/invites/${inviteId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res);
}

export async function updateStoreMember(
  storeId: string,
  userId: string,
  input: { role?: Exclude<StoreRole, 'OWNER'>; permissions?: string[] | null },
): Promise<StoreMember> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${storeId}/members/${userId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.member;
}

export async function removeStoreMember(storeId: string, userId: string): Promise<void> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${storeId}/members/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res);
}

/** Anggota keluar dari toko orang lain. Pemilik tidak bisa memakai ini. */
export async function leaveStore(storeId: string): Promise<void> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${storeId}/leave`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res);
}

/** Menukar kode undangan jadi keanggotaan. Email akun harus cocok. */
export async function acceptStoreInvite(
  code: string,
): Promise<{ member: StoreMember; store: { id: string; name: string } }> {
  const res = await apiFetch(`${BASE_URL}/api/invites/accept`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export interface SyncPayload {
  /**
   * Id perangkat pengirim (`storeSettings.deviceId`). Wajib: `id` lokal adalah
   * auto-increment Dexie per perangkat, jadi server memakai ini untuk memisah
   * record dari dua perangkat yang kebetulan punya id sama.
   */
  deviceId: string;
  categories?: any[];
  products?: any[];
  customers?: any[];
  transactions?: any[];
  transactionItems?: any[];
  expenseCategories?: any[];
  expenses?: any[];
  debts?: any[];
  debtPayments?: any[];
  stockOpnames?: any[];
  stockOpnameItems?: any[];
}

export interface SyncResponse {
  message: string;
  /**
   * Tabel yang ditolak server karena perangkat ini tidak berhak mendorongnya —
   * katalog hanya boleh diubah dari perangkat pemilik toko.
   */
  rejectedTables?: string[];
}

/** Master data yang ditarik dari toko; lihat `MASTER_TABLES` di backend. */
export interface StoreChanges {
  tables: Record<string, any[]>;
  total: number;
  syncedAt: string | null;
  hasMore: boolean;
  role: StoreRole;
  masterTables: string[];
}

/**
 * Menarik master data toko (kategori, produk, kategori pengeluaran) yang
 * berasal dari perangkat lain. Data transaksi tidak ikut — tiap perangkat
 * memiliki miliknya sendiri.
 */
export async function fetchStoreChanges(
  storeId: string,
  opts: { since?: string | null; deviceId?: string } = {},
): Promise<StoreChanges> {
  const qs = new URLSearchParams();
  if (opts.since) qs.set('since', opts.since);
  if (opts.deviceId) qs.set('deviceId', opts.deviceId);
  const suffix = qs.toString() ? `?${qs}` : '';

  const res = await apiFetch(`${BASE_URL}/api/stores/${storeId}/sync${suffix}`, {
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export function hasCloudToken(): boolean {
  try {
    return tokenGetter() !== null;
  } catch {
    return false;
  }
}

export async function syncStoreData(storeId: string, payload: SyncPayload): Promise<SyncResponse> {
  const res = await apiFetch(`${BASE_URL}/api/stores/${storeId}/sync`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export { CloudApiError };
