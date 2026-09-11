import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { buildPagination } from '@/lib/pagination';
import { authenticateAdmin, requireAdmin } from '@/middleware/auth';
import { recordAudit } from './audit';
import { loginWithGoogle } from './auth.service';
import { getGrowth, getOverview, getPlanBreakdown } from './metrics.service';
import { getUserDetail, listUsers, setSuspended, UserFilter } from './users.service';
import { listTransactions, PaymentFilter, reconcile } from './payments.service';
import { grantManual } from './subscriptions.service';
import { createPlan, listPlans, setArchived, updatePlan } from './plans.service';

export const adminRoutes = Router();

/** Gerbang login lebih ketat: ini satu-satunya endpoint admin tanpa sesi. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan masuk. Coba lagi nanti.', code: 'RATE_LIMITED' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan.', code: 'RATE_LIMITED' },
});

adminRoutes.post(
  '/auth/google',
  loginLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = z.object({ idToken: z.string().min(1) }).parse(req.body);
      res.json(await loginWithGoogle(idToken));
    } catch (err) {
      next(err);
    }
  },
);

// Semua di bawah ini butuh sesi admin yang sah.
adminRoutes.use(apiLimiter, authenticateAdmin, requireAdmin);

adminRoutes.get('/me', (req: Request, res: Response) => {
  res.json({
    id: req.user!.id,
    name: req.user!.name,
    email: req.user!.email,
    picture: req.user!.picture,
    role: req.user!.role,
  });
});

/* ── Metrik platform ─────────────────────────────────────────── */

adminRoutes.get('/metrics/overview', async (_req, res: Response, next) => {
  try {
    res.json(await getOverview());
  } catch (err) {
    next(err);
  }
});

adminRoutes.get('/metrics/plans', async (_req, res: Response, next) => {
  try {
    res.json(await getPlanBreakdown());
  } catch (err) {
    next(err);
  }
});

adminRoutes.get('/metrics/growth', async (req, res: Response, next) => {
  try {
    const { months } = z
      .object({ months: z.coerce.number().int().min(1).max(36).default(12) })
      .parse(req.query);
    res.json(await getGrowth(months));
  } catch (err) {
    next(err);
  }
});

/* ── Pengguna ────────────────────────────────────────────────── */

const listQuery = z.object({
  q: z.string().optional(),
  filter: z
    .enum(['all', 'paid', 'free', 'expiring', 'expired', 'near_quota', 'suspended'])
    .default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

adminRoutes.get('/users', async (req, res: Response, next) => {
  try {
    const q = listQuery.parse(req.query);
    res.json(await listUsers({ ...q, filter: q.filter as UserFilter }));
  } catch (err) {
    next(err);
  }
});

adminRoutes.get('/users/:id', async (req, res: Response, next) => {
  try {
    res.json(await getUserDetail(req.params.id));
  } catch (err) {
    next(err);
  }
});

adminRoutes.post('/users/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suspended, reason } = z
      .object({ suspended: z.boolean(), reason: z.string().min(3) })
      .parse(req.body);

    const { before, after } = await setSuspended(req.params.id, suspended);
    await recordAudit(req, {
      action: suspended ? 'user.suspend' : 'user.unsuspend',
      targetType: 'User',
      targetId: req.params.id,
      reason,
      before,
      after,
    });

    res.json({ message: suspended ? 'Akun dinonaktifkan' : 'Akun diaktifkan kembali', ...after });
  } catch (err) {
    next(err);
  }
});

/* ── Paket & harga ───────────────────────────────────────────── */

const planBody = z.object({
  id: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/, 'Id hanya boleh huruf, angka, garis bawah, dan strip')
    .max(64)
    .optional(),
  name: z.string().min(1).max(120),
  category: z.enum(['STORAGE', 'SYNC']),
  price: z.coerce.number().int().min(0),
  durationDays: z.coerce.number().int().min(1).max(3650),
  storageLimitMb: z.coerce.number().int().min(0),
  maxStores: z.coerce.number().int().min(1).nullable().optional(),
  /** null = tak terbatas, untuk paket lama sebelum multi-user cloud ada. */
  maxMembers: z.coerce.number().int().min(1).nullable().optional(),
});

adminRoutes.get('/plans', async (req, res: Response, next) => {
  try {
    const { includeArchived } = z
      .object({ includeArchived: z.coerce.boolean().default(false) })
      .parse(req.query);
    res.json(await listPlans({ includeArchived }));
  } catch (err) {
    next(err);
  }
});

adminRoutes.post('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = planBody.parse(req.body);
    const { after } = await createPlan(input);
    await recordAudit(req, {
      action: 'plan.create',
      targetType: 'Plan',
      targetId: after.id,
      after,
    });
    res.status(201).json({ message: 'Paket dibuat', plan: after });
  } catch (err) {
    next(err);
  }
});

adminRoutes.patch('/plans/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = planBody.partial().omit({ id: true }).parse(req.body);
    const { before, after } = await updatePlan(req.params.id, input);
    await recordAudit(req, {
      action: 'plan.update',
      targetType: 'Plan',
      targetId: req.params.id,
      before,
      after,
    });
    res.json({ message: 'Paket diperbarui', plan: after });
  } catch (err) {
    next(err);
  }
});

adminRoutes.post('/plans/:id/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { archived, reason } = z
      .object({ archived: z.boolean(), reason: z.string().min(3) })
      .parse(req.body);

    const hasil = await setArchived(req.params.id, archived);
    await recordAudit(req, {
      action: archived ? 'plan.archive' : 'plan.unarchive',
      targetType: 'Plan',
      targetId: req.params.id,
      reason,
      before: hasil.before,
      after: hasil.after,
    });

    res.json({
      message: archived ? 'Paket diarsipkan' : 'Paket diaktifkan kembali',
      ...hasil,
    });
  } catch (err) {
    next(err);
  }
});

adminRoutes.post(
  '/users/:id/subscription',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planId, days, reason } = z
        .object({
          planId: z.string().min(1),
          // Dibiarkan kosong = pakai durasi bawaan paket.
          days: z.coerce.number().int().min(1).max(3650).optional(),
          reason: z.string().min(3),
        })
        .parse(req.body);

      const hasil = await grantManual(req.params.id, planId, days);
      await recordAudit(req, {
        action: 'subscription.grant',
        targetType: 'User',
        targetId: req.params.id,
        reason,
        before: hasil.before,
        after: hasil.after,
      });

      res.json({ message: 'Langganan diberikan', ...hasil });
    } catch (err) {
      next(err);
    }
  },
);

/* ── Transaksi ───────────────────────────────────────────────── */

adminRoutes.get('/payments', async (req, res: Response, next) => {
  try {
    const q = z
      .object({
        filter: z.enum(['attention', 'all', 'completed', 'pending', 'failed']).default('attention'),
        q: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(req.query);
    res.json(await listTransactions({ ...q, filter: q.filter as PaymentFilter }));
  } catch (err) {
    next(err);
  }
});

adminRoutes.post(
  '/payments/:id/reconcile',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await reconcile(req.params.id);
      await recordAudit(req, {
        action: 'payment.reconcile',
        targetType: 'PaymentTransaction',
        targetId: req.params.id,
        before: result.before,
        after: result.after,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/* ── Audit log ───────────────────────────────────────────────── */

adminRoutes.get('/audit', async (req, res: Response, next) => {
  try {
    const { page, limit } = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(req.query);

    const [totalItems, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({ logs, pagination: buildPagination(page, limit, totalItems) });
  } catch (err) {
    next(err);
  }
});
