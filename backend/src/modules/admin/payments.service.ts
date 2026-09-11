import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { buildPagination } from '@/lib/pagination';
import { verifyPayment } from '@/modules/payments/service';

export type PaymentFilter = 'attention' | 'all' | 'completed' | 'pending' | 'failed';

const STUCK_AFTER_HOURS = 24;

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

export async function listTransactions(opts: {
  filter?: PaymentFilter;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));

  const where: Prisma.PaymentTransactionWhereInput = {};

  switch (opts.filter) {
    // Bukan status tersendiri, melainkan antrean kerja: pembayaran yang
    // menggantung terlalu lama, plus yang gagal dan mungkin perlu ditinjau.
    case 'attention':
      where.OR = [
        { status: 'PENDING', createdAt: { lt: hoursAgo(STUCK_AFTER_HOURS) } },
        { status: 'FAILED' },
      ];
      break;
    case 'completed':
      where.status = 'COMPLETED';
      break;
    case 'pending':
      where.status = 'PENDING';
      break;
    case 'failed':
      where.status = 'FAILED';
      break;
  }

  if (opts.q) {
    where.AND = [
      {
        OR: [
          { paymentGatewayRef: { contains: opts.q, mode: 'insensitive' } },
          { user: { email: { contains: opts.q, mode: 'insensitive' } } },
          { user: { name: { contains: opts.q, mode: 'insensitive' } } },
        ],
      },
    ];
  }

  const [totalItems, rows] = await Promise.all([
    prisma.paymentTransaction.count({ where }),
    prisma.paymentTransaction.findMany({
      where,
      include: { user: true, plan: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    transactions: rows.map((t) => ({
      id: t.id,
      user: { id: t.user.id, name: t.user.name, email: t.user.email },
      plan: { id: t.plan.id, name: t.plan.name },
      amount: t.amount,
      status: t.status,
      reference: t.paymentGatewayRef,
      createdAt: t.createdAt.toISOString(),
      ageHours: Math.floor((Date.now() - t.createdAt.getTime()) / 3_600_000),
    })),
    pagination: buildPagination(page, limit, totalItems),
  };
}

/**
 * Menanyakan ulang status ke Tripay dan menyelaraskan status lokal.
 * Memakai `verifyPayment()` yang sudah dipakai pengguna sendiri — di sini
 * cakupannya lintas akun, itulah bedanya. Ini yang menyelesaikan kasus
 * "sudah bayar tapi paket belum aktif" tanpa membuka database.
 */
export async function reconcile(transactionId: string) {
  const before = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
    select: { status: true, userId: true },
  });

  const result = await verifyPayment(transactionId);

  return {
    ...result,
    before: { status: before?.status ?? null },
    after: { status: result.transaction.status },
    changed: before?.status !== result.transaction.status,
  };
}
