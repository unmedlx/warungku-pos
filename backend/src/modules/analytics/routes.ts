import { Router, Response } from 'express';
import { authenticate } from '@/middleware/auth';
import { z } from 'zod';
import {
  getOverview,
  getComparison,
  getTrend,
  getHealth,
  exportCsv,
} from './service';

export const analyticsRoutes = Router();

analyticsRoutes.use(authenticate);

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

const rangeQuery = z.object({
  from: dateStr.optional(),
  to: dateStr.optional(),
  storeIds: z.string().optional(),
});

function parseStoreIds(raw?: string) {
  if (!raw) return undefined;
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length ? ids : undefined;
}

analyticsRoutes.get('/overview', async (req, res: Response, next) => {
  try {
    const q = rangeQuery.parse(req.query);
    res.json(
      await getOverview(req.user!.id, {
        from: q.from,
        to: q.to,
        storeIds: parseStoreIds(q.storeIds),
      }),
    );
  } catch (err) {
    next(err);
  }
});

analyticsRoutes.get('/compare', async (req, res: Response, next) => {
  try {
    const q = rangeQuery.parse(req.query);
    res.json(await getComparison(req.user!.id, { from: q.from, to: q.to }));
  } catch (err) {
    next(err);
  }
});

analyticsRoutes.get('/trend', async (req, res: Response, next) => {
  try {
    const q = z
      .object({ months: z.coerce.number().int().optional(), storeId: z.string().optional() })
      .parse(req.query);
    res.json(await getTrend(req.user!.id, { months: q.months, storeId: q.storeId }));
  } catch (err) {
    next(err);
  }
});

analyticsRoutes.get('/health', async (req, res: Response, next) => {
  try {
    res.json(await getHealth(req.user!.id));
  } catch (err) {
    next(err);
  }
});

analyticsRoutes.get('/export', async (req, res: Response, next) => {
  try {
    const q = rangeQuery
      .extend({ dataset: z.enum(['daily', 'transactions']).default('daily') })
      .parse(req.query);
    const csv = await exportCsv(req.user!.id, {
      dataset: q.dataset,
      from: q.from,
      to: q.to,
    });
    const name = `kanpos-${q.dataset}-${q.from ?? 'awal'}-${q.to ?? 'kini'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    // BOM agar Excel membaca UTF-8 dengan benar.
    res.send('﻿' + csv);
  } catch (err) {
    next(err);
  }
});
