import { prisma } from '@/lib/db';

/**
 * Semua angka di sini agregat lintas seluruh pengguna, jadi sengaja dikerjakan
 * dengan raw SQL — bukan pola `analytics/service.ts` yang menarik baris ke
 * memori lalu menghitung di Node. Pola itu memadai untuk satu pemilik toko,
 * tapi akan menggantung kalau dipakai untuk seluruh platform.
 */

const ACTIVE_WINDOW_DAYS = 30;
const EXPIRING_WINDOW_DAYS = 30;
/** Ambang "nyangkut": sudah lewat sehari tapi belum lunas. */
const STUCK_PAYMENT_HOURS = 24;
/** Ambang kuota "hampir penuh", dipakai sebagai sinyal upsell. */
const STORAGE_WARN_RATIO = 0.85;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysAhead(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function startOfMonth(offsetMonths = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
}

export async function getOverview() {
  const activeSince = daysAgo(ACTIVE_WINDOW_DAYS);
  const thisMonth = startOfMonth();
  const lastMonth = startOfMonth(-1);

  const [
    totalUsers,
    newUsers,
    activeUsers,
    totalStores,
    activeSubs,
    expiringSubs,
    revenueRows,
    stuckPayments,
    nearQuota,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: activeSince } } }),
    countActiveUsers(activeSince),
    prisma.store.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE', endDate: { gt: new Date() } } }),
    prisma.subscription.count({
      where: { status: 'ACTIVE', endDate: { gt: new Date(), lte: daysAhead(EXPIRING_WINDOW_DAYS) } },
    }),
    revenueByMonth(lastMonth),
    countStuckPayments(),
    countNearQuota(),
  ]);

  const revenueThisMonth = revenueRows.find((r) => r.month.getTime() === thisMonth.getTime())?.total ?? 0;
  const revenueLastMonth = revenueRows.find((r) => r.month.getTime() === lastMonth.getTime())?.total ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    users: {
      total: totalUsers,
      new: newUsers,
      active: activeUsers,
      activeWindowDays: ACTIVE_WINDOW_DAYS,
    },
    stores: { total: totalStores },
    subscriptions: { active: activeSubs, expiringSoon: expiringSubs },
    revenue: {
      thisMonth: revenueThisMonth,
      lastMonth: revenueLastMonth,
      currency: 'IDR',
    },
    /** Antrean kerja — tiga hal yang biasanya perlu ditindak hari itu juga. */
    queue: {
      stuckPayments,
      expiringSubscriptions: expiringSubs,
      nearQuota,
    },
  };
}

/**
 * "Aktif" dihitung dari jejak sync atau backup, bukan dari login — backend
 * tidak menyimpan sesi untuk pengguna biasa, jadi waktu login tidak tercatat
 * di mana pun.
 */
async function countActiveUsers(since: Date) {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT user_id FROM sync_records WHERE synced_at >= ${since}
      UNION
      SELECT user_id FROM backups WHERE created_at >= ${since}
    ) AS aktif
  `;
  return Number(rows[0]?.count ?? 0);
}

async function revenueByMonth(since: Date) {
  const rows = await prisma.$queryRaw<{ month: Date; total: bigint }[]>`
    SELECT date_trunc('month', created_at) AS month, SUM(amount)::bigint AS total
    FROM payment_transactions
    WHERE status = 'COMPLETED' AND created_at >= ${since}
    GROUP BY 1
  `;
  return rows.map((r) => ({ month: r.month, total: Number(r.total) }));
}

async function countStuckPayments() {
  return prisma.paymentTransaction.count({
    where: {
      OR: [
        { status: 'PENDING', createdAt: { lt: daysAgo(STUCK_PAYMENT_HOURS / 24) } },
        { status: 'FAILED', createdAt: { gte: daysAgo(EXPIRING_WINDOW_DAYS) } },
      ],
    },
  });
}

async function countNearQuota() {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT u.id
      FROM users u
      JOIN backups b ON b.user_id = u.id
      WHERE u.storage_limit_mb > 0 AND u.deleted_at IS NULL
      GROUP BY u.id, u.storage_limit_mb
      HAVING SUM(b.file_size)::float / (u.storage_limit_mb * 1024.0 * 1024.0) >= ${STORAGE_WARN_RATIO}
    ) AS hampir_penuh
  `;
  return Number(rows[0]?.count ?? 0);
}

/** Sebaran pengguna dan pendapatan per paket. */
export async function getPlanBreakdown() {
  const thisMonth = startOfMonth();

  const [plans, userCounts, activeCounts, revenue] = await Promise.all([
    prisma.plan.findMany({ orderBy: { price: 'asc' } }),
    prisma.user.groupBy({ by: ['planId'], _count: { _all: true }, where: { deletedAt: null } }),
    prisma.subscription.groupBy({
      by: ['planId'],
      _count: { _all: true },
      where: { status: 'ACTIVE', endDate: { gt: new Date() } },
    }),
    prisma.paymentTransaction.groupBy({
      by: ['planId'],
      _sum: { amount: true },
      where: { status: 'COMPLETED', createdAt: { gte: thisMonth } },
    }),
  ]);

  const freeUsers = userCounts.find((c) => c.planId === null)?._count._all ?? 0;

  return {
    free: { users: freeUsers },
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      users: userCounts.find((c) => c.planId === p.id)?._count._all ?? 0,
      activeSubscriptions: activeCounts.find((c) => c.planId === p.id)?._count._all ?? 0,
      revenueThisMonth: revenue.find((r) => r.planId === p.id)?._sum.amount ?? 0,
    })),
  };
}

/** Pendaftar dan pendapatan per bulan — untuk grafik pertumbuhan. */
export async function getGrowth(months = 12) {
  const since = startOfMonth(-(months - 1));

  const [signups, revenue] = await Promise.all([
    prisma.$queryRaw<{ month: Date; count: bigint }[]>`
      SELECT date_trunc('month', created_at) AS month, COUNT(*)::bigint AS count
      FROM users WHERE created_at >= ${since} GROUP BY 1 ORDER BY 1
    `,
    prisma.$queryRaw<{ month: Date; total: bigint }[]>`
      SELECT date_trunc('month', created_at) AS month, SUM(amount)::bigint AS total
      FROM payment_transactions
      WHERE status = 'COMPLETED' AND created_at >= ${since}
      GROUP BY 1 ORDER BY 1
    `,
  ]);

  const byMonth = new Map<string, { month: string; signups: number; revenue: number }>();
  for (const r of signups) {
    const key = r.month.toISOString().slice(0, 7);
    byMonth.set(key, { month: key, signups: Number(r.count), revenue: 0 });
  }
  for (const r of revenue) {
    const key = r.month.toISOString().slice(0, 7);
    const row = byMonth.get(key) ?? { month: key, signups: 0, revenue: 0 };
    row.revenue = Number(r.total);
    byMonth.set(key, row);
  }

  return { months: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)) };
}
