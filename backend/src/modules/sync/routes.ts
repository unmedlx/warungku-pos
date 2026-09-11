import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '@/middleware/auth';
import * as service from './service';

export const syncRoutes = Router();

syncRoutes.use(authenticate);

syncRoutes.post('/stores/:storeId/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;
    const result = await service.syncStoreData(storeId, req.user!.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * Arah sebaliknya: perangkat menarik master data toko. Dipakai perangkat
 * karyawan, yang tidak boleh mendorong katalog dan karena itu tidak akan pernah
 * punya produk tanpa endpoint ini.
 */
syncRoutes.get('/stores/:storeId/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;
    const result = await service.getStoreChanges(storeId, req.user!.id, {
      since: typeof req.query.since === 'string' ? req.query.since : undefined,
      deviceId: typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
