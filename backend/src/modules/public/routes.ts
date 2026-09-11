import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as service from './service';

export const publicRoutes = Router();

publicRoutes.get('/stores/:identifier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identifier = z.string().min(1).parse(req.params.identifier);
    const result = await service.getPublicStore(identifier);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
