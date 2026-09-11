export interface Metrics {
  revenue: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  discount: number;
  transactions: number;
  avgTicket: number;
  margin: number;
}

export interface Delta {
  revenue: number | null;
  netProfit: number | null;
  transactions: number | null;
  avgTicket: number | null;
}

export interface StoreOverview {
  id: string;
  name: string;
  timezone: string;
  logoUrl: string | null;
  lastSyncedAt: string | null;
  /** Belum sinkron >24 jam — angkanya tidak boleh ditampilkan sebagai angka hari ini. */
  stale: boolean;
  today: Metrics;
  sparkline: { date: string; value: number }[];
  current: Metrics;
  previous: Metrics;
  delta: Delta;
}

export interface Overview {
  range: { from: string; to: string } | null;
  totals: { current: Metrics; previous: Metrics; delta: Delta };
  stores: StoreOverview[];
}

export interface CompareRow {
  id: string;
  name: string;
  revenue: number;
  transactions: number;
  avgTicket: number;
  netProfit: number;
  margin: number;
  deltaRevenue: number | null;
  contribution: number;
}

export interface Comparison {
  range: { from: string; to: string } | null;
  rows: CompareRow[];
  totals: { current: Metrics; previous: Metrics; delta: Delta };
}

export interface TrendPoint {
  month: string;
  revenue: number;
  netProfit: number;
  transactions: number;
}

export interface Trend {
  months: TrendPoint[];
  previousYear: TrendPoint[];
}

export interface Health {
  stores: {
    id: string;
    name: string;
    lastSyncedAt: string | null;
    stale: boolean;
    neverSynced: boolean;
  }[];
  staleCount: number;
  storage: {
    usedMb: number;
    limitMb: number;
    usedPercent: number;
    backupCount: number;
    latestBackupAt: string | null;
  };
  plan: {
    name: string | null;
    price: number | null;
    maxStores: number | null;
    storeCount: number;
    expiresAt: string | null;
    daysLeft: number | null;
  };
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  picture?: string | null;
}

/** Satu toko/cabang milik user — bentuknya mengikuti `mapStore` di backend. */
export interface Store {
  id: string;
  userId: string;
  name: string;
  identifier: string | null;
  isPublic: boolean;
  address1: string | null;
  address2: string | null;
  provinceName: string | null;
  cityName: string | null;
  districtName: string | null;
  phone: string | null;
  timezone: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanSummary {
  id: string;
  name: string;
  storageLimitMb: number;
  price: number;
  category: 'STORAGE' | 'SYNC';
  maxStores: number | null;
}

export interface SubscriptionSummary {
  id: string;
  planId: string;
  plan: PlanSummary;
  startDate: string;
  endDate: string;
  status: string;
  hasActiveSubscription: boolean;
}

/**
 * Respons utuh `/api/user/profile`. `Profile` di atas hanya potongan `user`-nya,
 * yang dipakai sidebar; halaman Pengaturan butuh sisanya.
 */
export interface Account {
  user: Profile & {
    planId: string | null;
    storageLimitMb: number;
    syncExpiry: string | null;
    maxStores: number | null;
    createdAt: string;
  };
  subscription: SubscriptionSummary | null;
  syncSubscription: SubscriptionSummary | null;
  storageUsage: {
    usedBytes: number;
    usedMb: number;
    limitMb: number;
    remainingMb: number;
  };
  backups: { id: string; fileName: string; fileSize: number; createdAt: string; updatedAt: string }[];
}
