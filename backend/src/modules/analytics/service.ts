import { prisma } from '@/lib/db';
import { AppError } from '@/lib/error';
import {
  dayKeyIn,
  monthKeyIn,
  parseDateIn,
  resolveTimezone,
  startOfDayIn,
} from '@/lib/timezone';

/**
 * Agregasi laporan untuk dashboard cloud (Tier 1).
 *
 * Sumber data adalah `SyncRecord` — payload JSON mentah hasil push dari aplikasi
 * kasir. Agregasi dikerjakan di memori: untuk skala satu pemilik usaha (puluhan
 * ribu transaksi) ini masih murah, dan menghindari query JSON yang terikat dialek
 * Postgres. Bila satu akun tumbuh sampai ratusan ribu transaksi, ganti bagian
 * `loadRows` dengan tabel agregat harian yang di-update saat sync.
 */

interface TxRow {
  total: number;
  profit: number;
  discountAmount: number;
  date: Date;
  status?: string;
  receiptNumber?: string;
  createdBy?: number;
}

interface ExpenseRow {
  amount: number;
  date: Date;
  isDeleted?: number;
}

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

function emptyMetrics(): Metrics {
  return {
    revenue: 0,
    grossProfit: 0,
    expenses: 0,
    netProfit: 0,
    discount: 0,
    transactions: 0,
    avgTicket: 0,
    margin: 0,
  };
}

function finalize(m: Metrics): Metrics {
  m.netProfit = m.grossProfit - m.expenses;
  m.avgTicket = m.transactions > 0 ? m.revenue / m.transactions : 0;
  m.margin = m.revenue > 0 ? (m.netProfit / m.revenue) * 100 : 0;
  return m;
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Transaksi yang boleh dihitung: sudah selesai, bukan bill yang masih terbuka. */
function isCounted(payload: any): boolean {
  return payload?.status !== 'open' && payload?.isDeleted !== 1;
}

/**
 * Sengaja tetap berbasis kepemilikan (`Store.userId`), bukan keanggotaan:
 * analitik memuat laba, modal, dan margin lintas toko — angka yang hanya
 * relevan dan boleh dilihat pemilik. Karyawan mengakses laporan operasional
 * lewat aplikasi, bukan endpoint ini.
 */
async function loadStores(userId: string, storeIds?: string[]) {
  const stores = await prisma.store.findMany({
    where: { userId, ...(storeIds?.length ? { id: { in: storeIds } } : {}) },
    orderBy: { createdAt: 'asc' },
  });
  if (!stores.length) return [];
  return stores;
}

/** Ambil baris transaksi + beban satu toko, sudah dinormalkan dan disaring. */
async function loadRows(storeId: string) {
  const records = await prisma.syncRecord.findMany({
    where: { storeId, tableName: { in: ['transactions', 'expenses'] } },
    select: { tableName: true, payload: true },
  });

  const transactions: TxRow[] = [];
  const expenses: ExpenseRow[] = [];

  for (const r of records) {
    const p = r.payload as any;
    if (!p) continue;
    const date = toDate(p.date);
    if (!date) continue;

    if (r.tableName === 'transactions') {
      if (!isCounted(p)) continue;
      transactions.push({
        total: num(p.total),
        profit: num(p.profit),
        discountAmount: num(p.discountAmount),
        date,
        status: p.status,
        receiptNumber: p.receiptNumber,
        createdBy: p.createdBy,
      });
    } else {
      if (p.isDeleted === 1) continue;
      expenses.push({ amount: num(p.amount), date, isDeleted: p.isDeleted });
    }
  }

  return { transactions, expenses };
}

function accumulate(
  rows: { transactions: TxRow[]; expenses: ExpenseRow[] },
  from: Date,
  to: Date,
): Metrics {
  const m = emptyMetrics();
  const lo = from.getTime();
  const hi = to.getTime();

  for (const t of rows.transactions) {
    const ts = t.date.getTime();
    if (ts < lo || ts >= hi) continue;
    m.revenue += t.total;
    m.grossProfit += t.profit;
    m.discount += t.discountAmount;
    m.transactions += 1;
  }
  for (const e of rows.expenses) {
    const ts = e.date.getTime();
    if (ts < lo || ts >= hi) continue;
    m.expenses += e.amount;
  }
  return finalize(m);
}

function deltaPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function withDelta(current: Metrics, previous: Metrics) {
  return {
    current,
    previous,
    delta: {
      revenue: deltaPct(current.revenue, previous.revenue),
      netProfit: deltaPct(current.netProfit, previous.netProfit),
      transactions: deltaPct(current.transactions, previous.transactions),
      avgTicket: deltaPct(current.avgTicket, previous.avgTicket),
    },
  };
}

/** Rentang tanggal yang diminta klien, plus rentang pembanding sepanjang durasi yang sama. */
export function resolveRange(tz: string, from?: string, to?: string) {
  const now = new Date();
  const end = to ? parseDateIn(tz, to, true) : new Date(startOfDayIn(tz, now).getTime() + 86400000);
  const start = from
    ? parseDateIn(tz, from)
    : new Date(end.getTime() - 30 * 86400000);
  if (start >= end) throw new AppError('Rentang tanggal tidak valid', 400);

  const span = end.getTime() - start.getTime();
  return {
    start,
    end,
    prevStart: new Date(start.getTime() - span),
    prevEnd: start,
  };
}

const MAX_SYNC_AGE_MS = 24 * 3600 * 1000;

/**
 * 1.1 Ringkasan semua toko + 1.2 sumber data perbandingan.
 *
 * Toko yang datanya basi (>24 jam tanpa sync) ditandai `stale` dan kartu hari
 * ini-nya dikosongkan di UI. Menampilkan angka lama seolah-olah angka hari ini
 * adalah cara tercepat kehilangan kepercayaan pemilik toko.
 */
export async function getOverview(
  userId: string,
  opts: { from?: string; to?: string; storeIds?: string[] } = {},
) {
  const stores = await loadStores(userId, opts.storeIds);
  if (!stores.length) {
    return { stores: [], totals: withDelta(emptyMetrics(), emptyMetrics()), range: null };
  }

  const baseTz = resolveTimezone(stores[0].timezone);
  const range = resolveRange(baseTz, opts.from, opts.to);
  const now = new Date();

  const total = emptyMetrics();
  const prevTotal = emptyMetrics();

  const perStore = await Promise.all(
    stores.map(async (store) => {
      const tz = resolveTimezone(store.timezone);
      const rows = await loadRows(store.id);

      const current = accumulate(rows, range.start, range.end);
      const previous = accumulate(rows, range.prevStart, range.prevEnd);

      const todayStart = startOfDayIn(tz, now);
      const today = accumulate(rows, todayStart, new Date(todayStart.getTime() + 86400000));

      // Sparkline 30 hari terakhir, dikelompokkan per hari zona toko.
      const sparkFrom = new Date(todayStart.getTime() - 29 * 86400000);
      const buckets = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        buckets.set(dayKeyIn(tz, new Date(sparkFrom.getTime() + i * 86400000)), 0);
      }
      for (const t of rows.transactions) {
        if (t.date < sparkFrom) continue;
        const key = dayKeyIn(tz, t.date);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + t.total);
      }

      const lastSync = await prisma.syncRecord.findFirst({
        where: { storeId: store.id },
        orderBy: { syncedAt: 'desc' },
        select: { syncedAt: true },
      });
      const lastSyncedAt = lastSync?.syncedAt ?? null;
      const stale =
        !lastSyncedAt || now.getTime() - lastSyncedAt.getTime() > MAX_SYNC_AGE_MS;

      for (const k of ['revenue', 'grossProfit', 'expenses', 'discount', 'transactions'] as const) {
        total[k] += current[k];
        prevTotal[k] += previous[k];
      }

      return {
        id: store.id,
        name: store.name,
        timezone: tz,
        logoUrl: store.logoUrl,
        lastSyncedAt,
        stale,
        today,
        sparkline: Array.from(buckets.entries()).map(([date, value]) => ({ date, value })),
        ...withDelta(current, previous),
      };
    }),
  );

  return {
    range: { from: range.start, to: range.end },
    totals: withDelta(finalize(total), finalize(prevTotal)),
    stores: perStore,
  };
}

/** 1.2 Perbandingan cabang — diurutkan dari omzet terbesar, plus kontribusi %. */
export async function getComparison(
  userId: string,
  opts: { from?: string; to?: string } = {},
) {
  const overview = await getOverview(userId, opts);
  const grandRevenue = overview.totals.current.revenue;

  const rows = overview.stores
    .map((s) => ({
      id: s.id,
      name: s.name,
      revenue: s.current.revenue,
      transactions: s.current.transactions,
      avgTicket: s.current.avgTicket,
      netProfit: s.current.netProfit,
      margin: s.current.margin,
      deltaRevenue: s.delta.revenue,
      contribution: grandRevenue > 0 ? (s.current.revenue / grandRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return { range: overview.range, rows, totals: overview.totals };
}

/**
 * 1.3 Tren jangka panjang — N bulan terakhir plus periode yang sama tahun lalu.
 * Inilah bagian yang tidak bisa disediakan aplikasi lokal: riwayat panjang.
 */
export async function getTrend(
  userId: string,
  opts: { months?: number; storeId?: string } = {},
) {
  const months = Math.min(Math.max(opts.months ?? 12, 1), 36);
  const stores = await loadStores(userId, opts.storeId ? [opts.storeId] : undefined);
  if (!stores.length) return { months: [], previousYear: [] };

  const tz = resolveTimezone(stores[0].timezone);
  const now = new Date();

  // Kunci bulan yang diminta, dari terlama ke terbaru.
  const keys: string[] = [];
  const cursor = new Date(startOfDayIn(tz, now));
  cursor.setUTCDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setUTCMonth(d.getUTCMonth() - i);
    keys.push(d.toISOString().slice(0, 7));
  }
  const prevKeys = keys.map((k) => {
    const [y, m] = k.split('-');
    return `${Number(y) - 1}-${m}`;
  });

  const acc = new Map<string, Metrics>();
  for (const k of [...keys, ...prevKeys]) acc.set(k, emptyMetrics());

  for (const store of stores) {
    const rows = await loadRows(store.id);
    const stz = resolveTimezone(store.timezone);
    for (const t of rows.transactions) {
      const m = acc.get(monthKeyIn(stz, t.date));
      if (!m) continue;
      m.revenue += t.total;
      m.grossProfit += t.profit;
      m.transactions += 1;
    }
    for (const e of rows.expenses) {
      const m = acc.get(monthKeyIn(stz, e.date));
      if (!m) continue;
      m.expenses += e.amount;
    }
  }

  const shape = (k: string) => {
    const m = finalize(acc.get(k) ?? emptyMetrics());
    return {
      month: k,
      revenue: m.revenue,
      netProfit: m.netProfit,
      transactions: m.transactions,
    };
  };

  return {
    months: keys.map(shape),
    previousYear: prevKeys.map(shape),
  };
}

/** 1.5 Status data & langganan. */
export async function getHealth(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Pengguna tidak ditemukan', 404);

  // `User.planId` adalah kolom skalar — skema tidak punya relasi tunggal ke Plan.
  const plan = user.planId
    ? await prisma.plan.findUnique({ where: { id: user.planId } })
    : null;

  const stores = await prisma.store.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  const now = new Date();

  const storeStatus = await Promise.all(
    stores.map(async (s) => {
      const last = await prisma.syncRecord.findFirst({
        where: { storeId: s.id },
        orderBy: { syncedAt: 'desc' },
        select: { syncedAt: true },
      });
      const lastSyncedAt = last?.syncedAt ?? null;
      const ageMs = lastSyncedAt ? now.getTime() - lastSyncedAt.getTime() : null;
      return {
        id: s.id,
        name: s.name,
        lastSyncedAt,
        stale: ageMs === null || ageMs > MAX_SYNC_AGE_MS,
        neverSynced: lastSyncedAt === null,
      };
    }),
  );

  const backups = await prisma.backup.aggregate({
    where: { userId },
    _sum: { fileSize: true },
    _count: true,
  });
  const latestBackup = await prisma.backup.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, fileName: true },
  });

  const usedMb = (backups._sum.fileSize ?? 0) / (1024 * 1024);
  const limitMb = user.storageLimitMb ?? 0;

  const subscription = await prisma.subscription.findFirst({
    where: { userId, hasActiveSubscription: true },
    orderBy: { endDate: 'desc' },
  });
  const expiry = subscription?.endDate ?? user.syncExpiry ?? null;

  return {
    stores: storeStatus,
    staleCount: storeStatus.filter((s) => s.stale).length,
    storage: {
      usedMb: Math.round(usedMb * 10) / 10,
      limitMb,
      usedPercent: limitMb > 0 ? Math.min((usedMb / limitMb) * 100, 100) : 0,
      backupCount: backups._count,
      latestBackupAt: latestBackup?.createdAt ?? null,
    },
    plan: {
      name: plan?.name ?? null,
      price: plan?.price ?? null,
      maxStores: user.maxStores ?? plan?.maxStores ?? null,
      storeCount: stores.length,
      expiresAt: expiry,
      daysLeft: expiry
        ? Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
        : null,
    },
  };
}

/** 1.4 Ekspor — CSV rekap harian atau daftar transaksi. */
export async function exportCsv(
  userId: string,
  opts: { dataset: 'daily' | 'transactions'; from?: string; to?: string },
) {
  const stores = await loadStores(userId);
  if (!stores.length) return 'Tidak ada toko\n';

  const tz = resolveTimezone(stores[0].timezone);
  const range = resolveRange(tz, opts.from, opts.to);
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  if (opts.dataset === 'transactions') {
    const lines = ['toko,tanggal,no_nota,total,diskon,laba_kotor'];
    for (const store of stores) {
      const stz = resolveTimezone(store.timezone);
      const rows = await loadRows(store.id);
      const inRange = rows.transactions
        .filter((t) => t.date >= range.start && t.date < range.end)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      for (const t of inRange) {
        lines.push(
          [
            esc(store.name),
            t.date.toISOString(),
            esc(t.receiptNumber),
            Math.round(t.total),
            Math.round(t.discountAmount),
            Math.round(t.profit),
          ].join(','),
        );
      }
      void stz;
    }
    return lines.join('\n') + '\n';
  }

  const lines = ['toko,tanggal,omzet,laba_kotor,beban,laba_bersih,transaksi'];
  for (const store of stores) {
    const stz = resolveTimezone(store.timezone);
    const rows = await loadRows(store.id);
    const byDay = new Map<string, Metrics>();
    const bump = (key: string) => {
      if (!byDay.has(key)) byDay.set(key, emptyMetrics());
      return byDay.get(key)!;
    };
    for (const t of rows.transactions) {
      if (t.date < range.start || t.date >= range.end) continue;
      const m = bump(dayKeyIn(stz, t.date));
      m.revenue += t.total;
      m.grossProfit += t.profit;
      m.transactions += 1;
    }
    for (const e of rows.expenses) {
      if (e.date < range.start || e.date >= range.end) continue;
      bump(dayKeyIn(stz, e.date)).expenses += e.amount;
    }
    for (const key of Array.from(byDay.keys()).sort()) {
      const m = finalize(byDay.get(key)!);
      lines.push(
        [
          esc(store.name),
          key,
          Math.round(m.revenue),
          Math.round(m.grossProfit),
          Math.round(m.expenses),
          Math.round(m.netProfit),
          m.transactions,
        ].join(','),
      );
    }
  }
  return lines.join('\n') + '\n';
}
