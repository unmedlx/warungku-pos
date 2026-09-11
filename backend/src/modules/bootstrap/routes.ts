import { Router, Response } from 'express';
import { authenticate } from '@/middleware/auth';
import { getBootstrap } from './service';

export const bootstrapRoutes = Router();

bootstrapRoutes.get('/', authenticate, async (req, res: Response, next) => {
  try {
    res.json(await getBootstrap(req.user!.id));
  } catch (err) {
    next(err);
  }
});
