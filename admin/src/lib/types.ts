export interface Admin {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  role: 'ADMIN' | 'SUPERADMIN';
}

export interface Overview {
  generatedAt: string;
  users: { total: number; new: number; active: number; activeWindowDays: number };
  stores: { total: number };
  subscriptions: { active: number; expiringSoon: number };
  revenue: { thisMonth: number; lastMonth: number; currency: string };
  queue: { stuckPayments: number; expiringSubscriptions: number; nearQuota: number };
}

export interface PlanBreakdown {
  free: { users: number };
  plans: {
    id: string;
    name: string;
    category: 'STORAGE' | 'SYNC';
    price: number;
    users: number;
    activeSubscriptions: number;
    revenueThisMonth: number;
  }[];
}

export interface AdminPlan {
  id: string;
  name: string;
  category: 'STORAGE' | 'SYNC';
  price: number;
  durationDays: number;
  storageLimitMb: number;
  maxStores: number | null;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
  users: number;
  activeSubscriptions: number;
}

export interface PlanInput {
  id?: string;
  name: string;
  category: 'STORAGE' | 'SYNC';
  price: number;
  durationDays: number;
  storageLimitMb: number;
  maxStores: number | null;
}

export interface GrantResult {
  message: string;
  before: { planId: string | null; endDate: string | null };
  after: { planId: string; endDate: string; days: number };
  diperpanjangDari: string | null;
}

export interface Growth {
  months: { month: string; signups: number; revenue: number }[];
}

export interface AuditLogRow {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string };
}

export interface AuditList {
  logs: AuditLogRow[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  role: string;
  suspended: boolean;
  plan: { id: string; name: string; category: string } | null;
  subscription: { status: string; endDate: string; daysLeft: number } | null;
  stores: number;
  storage: { usedMb: number; limitMb: number; ratio: number };
  lastActivityAt: string | null;
  createdAt: string;
}

export interface UserList {
  users: UserRow[];
  pagination: Pagination;
}

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  role: string;
  suspended: boolean;
  suspendedAt: string | null;
  createdAt: string;
  plan: { id: string; name: string; category: string } | null;
  maxStores: number | null;
  syncExpiry: string | null;
  storage: { usedMb: number; limitMb: number; remainingMb: number; files: number };
  stores: {
    id: string;
    name: string;
    isPublic: boolean;
    identifier: string | null;
    timezone: string | null;
    lastSyncAt: string | null;
    createdAt: string;
  }[];
  subscriptions: {
    id: string;
    plan: string;
    status: string;
    startDate: string;
    endDate: string;
  }[];
  transactions: {
    id: string;
    plan: string;
    amount: number;
    status: string;
    reference: string | null;
    createdAt: string;
  }[];
  backups: {
    id: string;
    fileName: string;
    fileSize: number;
    storeId: string | null;
    createdAt: string;
  }[];
}

export interface TransactionRow {
  id: string;
  user: { id: string; name: string; email: string };
  plan: { id: string; name: string };
  amount: number;
  status: string;
  reference: string | null;
  createdAt: string;
  ageHours: number;
}

export interface TransactionList {
  transactions: TransactionRow[];
  pagination: Pagination;
}

export interface ReconcileResult {
  message: string;
  transaction: { id: string; status: string; reference: string | null };
  before: { status: string | null };
  after: { status: string };
  changed: boolean;
}

export type UserFilter =
  | 'all'
  | 'paid'
  | 'free'
  | 'expiring'
  | 'expired'
  | 'near_quota'
  | 'suspended';

export type PaymentFilter = 'attention' | 'all' | 'completed' | 'pending' | 'failed';
