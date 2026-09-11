import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth';
import { BadRequestError } from '@/lib/error';
import { storageConfig } from '@/config';
import { ensureBucket } from '@/lib/storage';
import * as service from './service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const storageRoutes = Router();

storageRoutes.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureBucket();
    res.json({ status: 'ok', bucket: storageConfig.bucket });
  } catch (err) {
    next(err);
  }
});

storageRoutes.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new BadRequestError('File tidak ditemukan');

      const prefix = z.string().max(64).default('uploads').parse(req.body.prefix || 'uploads');
      const result = await service.uploadFile(req.user!.id, req.file, prefix);

      res.status(201).json({ file: result });
    } catch (err) {
      next(err);
    }
  },
);

storageRoutes.get('/url', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = z.string().min(1).parse(req.query.key);
    const expiresIn = Math.min(Number(req.query.expiresIn) || 3600, 604800);
    const result = await service.getSignedFileUrl(key, req.user!.id, expiresIn);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

storageRoutes.delete('/:key(*)', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params[0];
    if (!key) throw new BadRequestError('Key file diperlukan');
    await service.removeFile(key, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
