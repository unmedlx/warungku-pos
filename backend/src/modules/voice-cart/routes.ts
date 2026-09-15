import { Router, Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth';
import * as service from './service';

function serialize(q: service.VoiceCartQuota) {
  return {
    limit: q.limit,
    used: q.used,
    remaining: q.remaining,
    unlimited: q.unlimited,
    resetsAt: q.periodEnd.toISOString(),
  };
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
  message: { error: 'Terlalu banyak permintaan. Tunggu sebentar.', code: 'RATE_LIMITED' },
});

const sessionSchema = z.object({
  id: z.string().min(8).max(64),
  startedAt: z.coerce.date(),
  storeId: z.string().min(1).max(64).optional(),
});

export const voiceCartRoutes = Router();

voiceCartRoutes.get('/quota', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ quota: serialize(await service.getQuota(req.user!.id)) });
  } catch (err) {
    next(err);
  }
});

/** Dipanggil saat mikrofon kasir menyala dalam keadaan online. */
voiceCartRoutes.post('/sessions', authenticate, limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sessionSchema.parse(req.body);
    res.json({ quota: serialize(await service.startSession(req.user!.id, body)) });
  } catch (err) {
    next(err);
  }
});

/** Sesi yang terjadi saat offline, dikirim begitu perangkat online lagi. */
voiceCartRoutes.post('/sessions/sync', authenticate, limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = z.object({ sessions: z.array(sessionSchema).max(200) }).parse(req.body);
    res.json({ quota: serialize(await service.syncSessions(req.user!.id, body.sessions)) });
  } catch (err) {
    next(err);
  }
});
