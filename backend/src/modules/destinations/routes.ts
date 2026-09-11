import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '@/middleware/auth';
import * as service from './service';

export const destinationRoutes = Router();

destinationRoutes.use(authenticate);

destinationRoutes.get('/provinces', (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ data: service.listProvinces() });
  } catch (err) {
    next(err);
  }
});

destinationRoutes.get('/cities/:provinceId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = service.listCities(Number(req.params.provinceId));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

destinationRoutes.get('/districts/:cityId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = service.listDistricts(Number(req.params.cityId));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
