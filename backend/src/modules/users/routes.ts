import { Router, Response } from 'express';
import { authenticate } from '@/middleware/auth';
import { getUserProfile } from './service';

export const userRoutes = Router();

userRoutes.get('/profile', authenticate, async (req, res: Response, next) => {
  try {
    const profile = await getUserProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});
