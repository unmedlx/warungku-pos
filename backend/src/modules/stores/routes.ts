import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth';
import { requireStoreManager, requireStoreMember, requireStoreOwner } from '@/middleware/store-access';
import { BadRequestError } from '@/lib/error';
import * as service from './service';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new BadRequestError('Logo toko harus berupa gambar (PNG, JPG, JPEG, WEBP)'));
    }
    cb(null, true);
  },
});

export const storeRoutes = Router();

storeRoutes.use(authenticate);

const createSchema = z.object({ name: z.string().min(1) });
const updateSchema = z.object({
  name: z.string().min(1),
  address1: z.string().nullable().optional(),
  address2: z.string().nullable().optional(),
  provinceId: z.number().nullable().optional(),
  provinceName: z.string().nullable().optional(),
  cityId: z.number().nullable().optional(),
  cityName: z.string().nullable().optional(),
  districtId: z.number().nullable().optional(),
  districtName: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  phone: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  operationalHours: z.any().optional(),
});

storeRoutes.get('/', async (req, res: Response, next) => {
  try {
    const stores = await service.listStores(req.user!.id);
    res.json({ stores });
  } catch (err) {
    next(err);
  }
});

storeRoutes.post('/', async (req, res: Response, next) => {
  try {
    const { name } = createSchema.parse(req.body);
    const store = await service.createStore(req.user!.id, name);
    res.status(201).json({ store });
  } catch (err) {
    next(err);
  }
});

storeRoutes.get('/:id', requireStoreMember, async (req, res: Response, next) => {
  try {
    const store = await service.getStore(req.user!.id, req.params.id);
    res.json({ store });
  } catch (err) {
    next(err);
  }
});

storeRoutes.put('/:id', requireStoreManager, async (req, res: Response, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const store = await service.updateStore(req.params.id, data);
    res.json({ store });
  } catch (err) {
    next(err);
  }
});

// Menghapus toko ikut menghapus data seluruh anggotanya, jadi hanya pemilik.
storeRoutes.delete('/:id', requireStoreOwner, async (req, res: Response, next) => {
  try {
    await service.deleteStore(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

storeRoutes.patch('/:id/identifier', requireStoreManager, async (req, res: Response, next) => {
  try {
    const schema = z.object({ identifier: z.string().nullable() });
    const { identifier } = schema.parse(req.body);
    const store = await service.updateIdentifier(req.params.id, identifier);
    res.json({ store });
  } catch (err) {
    next(err);
  }
});

storeRoutes.patch('/:id/visibility', requireStoreManager, async (req, res: Response, next) => {
  try {
    const schema = z.object({ isPublic: z.boolean() });
    const { isPublic } = schema.parse(req.body);
    const store = await service.updateVisibility(req.params.id, isPublic);
    res.json({ store });
  } catch (err) {
    next(err);
  }
});

storeRoutes.get('/identifier/check', async (req, res: Response, next) => {
  try {
    const q = z.string().min(1).parse(req.query.q);
    const available = await service.checkIdentifierAvailability(q);
    res.json({ available });
  } catch (err) {
    next(err);
  }
});

storeRoutes.post('/:id/logo', requireStoreManager, upload.single('logo'), async (req, res: Response, next) => {
  try {
    if (!req.file) throw new BadRequestError('Logo tidak ditemukan');
    if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
      throw new BadRequestError('Logo toko harus berupa gambar (PNG, JPG, JPEG, WEBP)');
    }
    const store = await service.uploadLogo(req.params.id, req.file.buffer, req.file.mimetype);
    res.json({ store });
  } catch (err) {
    next(err);
  }
});

storeRoutes.delete('/:id/logo', requireStoreManager, async (req, res: Response, next) => {
  try {
    const store = await service.deleteLogo(req.params.id);
    res.json({ store });
  } catch (err) {
    next(err);
  }
});
