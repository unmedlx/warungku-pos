import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as service from './service';

export const authRoutes = Router();

/** Sign in maupun sign up — keduanya jalur yang sama, lihat `resolveGoogleUser`. */
authRoutes.post('/session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = z.object({ idToken: z.string().min(1) }).parse(req.body);
    res.json(await service.createSession(idToken));
  } catch (err) {
    next(err);
  }
});

authRoutes.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    res.json(await service.refreshSession(refreshToken));
  } catch (err) {
    next(err);
  }
});
