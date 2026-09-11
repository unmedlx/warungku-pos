import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/error';
import { buildPagination } from '@/lib/pagination';

export type UserFilter = 'all' | 'paid' | 'free' | 'expiring' | 'expired' | 'near_quota' | 'suspended';

const MB = 1024 * 1024;

function daysAhead(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Daftar pengguna lintas akun. Kolom "aktivitas terakhir" diambil dari
 * `SyncRecord`, bukan waktu login: pelanggan berhenti menyinkron jauh sebelum
 * langganannya habis, jadi itu sinyal churn paling awal yang tersedia.
 */
export async function listUsers(opts: {
  q?: string;
  filter?: UserFilter;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const now = new Date();

  const where: Prisma.UserWhereInput = {};
  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q, mode: 'insensitive' } },
      { email: { contains: opts.q, mode: 'insensitive' } },
      { stores: { some: { name: { contains: opts.q, mode: 'insensitive' } } } },
    ];
  }

  switch (opts.filter) {
    case 'paid':
      where.planId = { not: null };
      where.deletedAt = null;
      break;
    case 'free':
      where.planId = null;
      where.deletedAt = null;
      break;
    case 'expiring':
      where.deletedAt = null;
      where.subscriptions = {
        some: { status: 'ACTIVE', endDate: { gt: now, lte: daysAhead(30) } },
      };
      break;
    case 'expired':
      where.deletedAt = null;
      where.subscriptions = { some: { endDate: { lte: now } } };
      break;
    case 'suspended':
      where.deletedAt = { not: null };
      break;
    default:
      where.deletedAt = null;
  }

  const [totalItems, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { stores: true } },
        subscriptions: { orderBy: { endDate: 'desc' }, take: 1 },
      },
    }),
  ]);

  const ids = users.map((u) => u.id);
  const [storage, lastSync, plans] = await Promise.all([
    storageUsedFor(ids),
    lastActivityFor(ids),
    plansByIdFor(users.map((u) => u.planId)),
  ]);

  let rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    picture: u.picture,
    role: u.role,
    suspended: Boolean(u.deletedAt),
    plan: pickPlan(plans, u.planId),
    subscription: u.subscriptions[0]
      ? {
          status: u.subscriptions[0].status,
          endDate: u.subscriptions[0].endDate.toISOString(),
          daysLeft: Math.ceil((u.subscriptions[0].endDate.getTime() - now.getTime()) / 86_400_000),
        }
      : null,
    stores: u._count.stores,
    storage: {
      usedMb: Math.round(((storage.get(u.id) ?? 0) / MB) * 10) / 10,
      limitMb: u.storageLimitMb,
      ratio: u.storageLimitMb > 0 ? (storage.get(u.id) ?? 0) / (u.storageLimitMb * MB) : 0,
    },
    lastActivityAt: lastSync.get(u.id)?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  // Kuota hanya bisa dinilai setelah pemakaian terkumpul, jadi filter ini
  // dijalankan setelah query — konsekuensinya paginasinya perkiraan.
  if (opts.filter === 'near_quota') {
    rows = rows.filter((r) => r.storage.ratio >= 0.85);
  }

  return { users: rows, pagination: buildPagination(page, limit, totalItems) };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      stores: { orderBy: { createdAt: 'asc' } },
      subscriptions: { include: { plan: true }, orderBy: { endDate: 'desc' } },
      paymentTransactions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 20 },
      backups: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!user) throw new NotFoundError('Pengguna tidak ditemukan');

  const [usedBytes, storeSync, totalBackups, plans] = await Promise.all([
    prisma.backup.aggregate({ where: { userId }, _sum: { fileSize: true } }),
    lastSyncPerStore(user.stores.map((s) => s.id)),
    prisma.backup.count({ where: { userId } }),
    plansByIdFor([user.planId]),
  ]);

  const used = usedBytes._sum.fileSize ?? 0;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture,
    role: user.role,
    suspended: Boolean(user.deletedAt),
    suspendedAt: user.deletedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    plan: pickPlan(plans, user.planId),
    maxStores: user.maxStores,
    syncExpiry: user.syncExpiry?.toISOString() ?? null,
    storage: {
      usedMb: Math.round((used / MB) * 10) / 10,
      limitMb: user.storageLimitMb,
      remainingMb: Math.max(0, user.storageLimitMb - used / MB),
      files: totalBackups,
    },
    // Sengaja hanya jumlah transaksi, bukan isinya: admin perlu tahu volume
    // pemakaian, bukan data penjualan pelanggan.
    stores: user.stores.map((s) => ({
      id: s.id,
      name: s.name,
      isPublic: s.isPublic,
      identifier: s.identifier,
      timezone: s.timezone,
      lastSyncAt: storeSync.get(s.id)?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
    subscriptions: user.subscriptions.map((s) => ({
      id: s.id,
      plan: s.plan.name,
      status: s.status,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
    })),
    transactions: user.paymentTransactions.map((t) => ({
      id: t.id,
      plan: t.plan.name,
      amount: t.amount,
      status: t.status,
      reference: t.paymentGatewayRef,
      createdAt: t.createdAt.toISOString(),
    })),
    backups: user.backups.map((b) => ({
      id: b.id,
      fileName: b.fileName,
      fileSize: b.fileSize,
      storeId: b.storeId,
      createdAt: b.createdAt.toISOString(),
    })),
  };
}

/**
 * `User.planId` menyimpan id paket tapi **tidak punya relasi Prisma** — yang
 * ada di skema justru many-to-many `User.plans ↔ Plan.users` yang tidak dipakai
 * modul mana pun. Selama itu belum dibereskan, paket harus diambil terpisah.
 */
async function plansByIdFor(planIds: (string | null)[]) {
  const ids = [...new Set(planIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return new Map<string, { id: string; name: string; category: string }>();
  const plans = await prisma.plan.findMany({ where: { id: { in: ids } } });
  return new Map(plans.map((p) => [p.id, { id: p.id, name: p.name, category: p.category }]));
}

function pickPlan(
  plans: Map<string, { id: string; name: string; category: string }>,
  planId: string | null,
) {
  return planId ? (plans.get(planId) ?? null) : null;
}

async function storageUsedFor(userIds: string[]) {
  if (!userIds.length) return new Map<string, number>();
  const rows = await prisma.backup.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds } },
    _sum: { fileSize: true },
  });
  return new Map(rows.map((r) => [r.userId, r._sum.fileSize ?? 0]));
}

async function lastActivityFor(userIds: string[]) {
  if (!userIds.length) return new Map<string, Date>();
  const rows = await prisma.syncRecord.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds } },
    _max: { syncedAt: true },
  });
  return new Map(rows.flatMap((r) => (r._max.syncedAt ? [[r.userId, r._max.syncedAt] as const] : [])));
}

async function lastSyncPerStore(storeIds: string[]) {
  if (!storeIds.length) return new Map<string, Date>();
  const rows = await prisma.syncRecord.groupBy({
    by: ['storeId'],
    where: { storeId: { in: storeIds } },
    _max: { syncedAt: true },
  });
  return new Map(rows.flatMap((r) => (r._max.syncedAt ? [[r.storeId, r._max.syncedAt] as const] : [])));
}

/**
 * Suspend, bukan hapus. Relasi di skema memakai `onDelete: Cascade` — menghapus
 * satu pengguna ikut menghapus toko, backup, sync, dan transaksinya tanpa jalan
 * pulang, jadi panel admin sengaja tidak menyediakan hapus permanen.
 */
export async function setSuspended(userId: string, suspended: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: suspended ? new Date() : null },
  });

  return {
    before: { suspended: Boolean(user.deletedAt) },
    after: { suspended: Boolean(updated.deletedAt) },
  };
}
