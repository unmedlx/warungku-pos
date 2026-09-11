import { clearSession, getToken, setSession, type Session } from './auth';
import type {
  AdminPlan,
  AuditList,
  GrantResult,
  PlanInput,
  Growth,
  Overview,
  PaymentFilter,
  PlanBreakdown,
  ReconcileResult,
  TransactionList,
  UserDetail,
  UserFilter,
  UserList,
} from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3210';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Dipasang oleh App agar 401 langsung memicu layar masuk, bukan error diam. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

type Params = Record<string, string | number | undefined>;

async function request<T>(
  path: string,
  opts: { params?: Params; method?: string; body?: unknown } = {},
): Promise<T> {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const token = getToken();
  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401) {
    clearSession();
    onUnauthorized?.();
    throw new ApiError('Sesi berakhir, silakan masuk lagi.', 401);
  }

  if (!res.ok) {
    let msg = `Permintaan gagal (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* respons bukan JSON — pakai pesan default */
    }
    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/**
 * Satu-satunya panggilan tanpa sesi: menukar Google ID token dengan sesi
 * admin. Backend menolak akun yang belum ada atau belum berperan admin.
 */
export async function loginWithGoogle(idToken: string): Promise<Session> {
  const res = await fetch(new URL('/api/admin/auth/google', BASE_URL).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body?.error ?? 'Gagal masuk', res.status);

  const session = body as Session;
  setSession(session);
  return session;
}

export const fetchOverview = () => request<Overview>('/api/admin/metrics/overview');
export const fetchPlanBreakdown = () => request<PlanBreakdown>('/api/admin/metrics/plans');
export const fetchGrowth = (months = 12) =>
  request<Growth>('/api/admin/metrics/growth', { params: { months } });

export const fetchUsers = (params: { q?: string; filter?: UserFilter; page?: number }) =>
  request<UserList>('/api/admin/users', { params });

export const fetchUserDetail = (id: string) => request<UserDetail>(`/api/admin/users/${id}`);

export const fetchAdminPlans = (includeArchived = false) =>
  request<{ plans: AdminPlan[] }>('/api/admin/plans', {
    params: includeArchived ? { includeArchived: 'true' } : undefined,
  });

export const createPlan = (body: PlanInput) =>
  request<{ message: string; plan: AdminPlan }>('/api/admin/plans', { method: 'POST', body });

export const updatePlan = (id: string, body: Partial<PlanInput>) =>
  request<{ message: string; plan: AdminPlan }>(`/api/admin/plans/${id}`, {
    method: 'PATCH',
    body,
  });

export const archivePlan = (id: string, archived: boolean, reason: string) =>
  request<{ message: string; activeSubscriptions: number }>(`/api/admin/plans/${id}/archive`, {
    method: 'POST',
    body: { archived, reason },
  });

/** `days` kosong = pakai durasi bawaan paket. */
export const grantSubscription = (
  id: string,
  body: { planId: string; days?: number; reason: string },
) => request<GrantResult>(`/api/admin/users/${id}/subscription`, { method: 'POST', body });

export const suspendUser = (id: string, suspended: boolean, reason: string) =>
  request<{ message: string; suspended: boolean }>(`/api/admin/users/${id}/suspend`, {
    method: 'POST',
    body: { suspended, reason },
  });

export const fetchTransactions = (params: { filter?: PaymentFilter; q?: string; page?: number }) =>
  request<TransactionList>('/api/admin/payments', { params });

export const fetchAudit = (params: { page?: number; limit?: number }) =>
  request<AuditList>('/api/admin/audit', { params });

export const reconcilePayment = (id: string) =>
  request<ReconcileResult>(`/api/admin/payments/${id}/reconcile`, { method: 'POST' });
