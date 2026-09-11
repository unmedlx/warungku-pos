import { Router, Response } from 'express';
import { listPlans } from './service';

export const planRoutes = Router();

planRoutes.get('/', async (_req, res: Response, next) => {
  try {
    const plans = await listPlans();
    res.json({ plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      storageLimitMb: p.storageLimitMb,
      price: p.price,
      maxStores: p.maxStores,
    })) });
  } catch (err) {
    next(err);
  }
});
