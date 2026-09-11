import { Router, Response, Request, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth';
import { BadRequestError } from '@/lib/error';
import * as service from './service';

const ALLOWED_BACKUP_TYPES = ['application/json', 'application/octet-stream'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const isJson = file.mimetype === 'application/json' || file.originalname.toLowerCase().endsWith('.json');
    if (!isJson) {
      return cb(new BadRequestError('File backup harus berformat JSON (.json)'));
    }
    cb(null, true);
  },
});

export const backupRoutes = Router();

backupRoutes.use(authenticate);

backupRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await service.listBackups(req.user!.id, page, limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

backupRoutes.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new Error('File tidak ditemukan');

    if (!ALLOWED_BACKUP_TYPES.includes(req.file.mimetype) && !req.file.originalname.toLowerCase().endsWith('.json')) {
      throw new BadRequestError('File backup harus berformat JSON (.json)');
    }

    const jsonString = req.file.buffer.toString('utf-8');
    const fileName = req.file.originalname;
    const storeId = req.body.storeId;

    const backup = await service.uploadBackup(req.user!.id, fileName, jsonString, storeId);
    res.status(201).json({ backup });
  } catch (err) {
    next(err);
  }
});

backupRoutes.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.downloadBackup(req.user!.id, req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

backupRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteBackup(req.user!.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
