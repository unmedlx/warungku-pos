import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth';
import { requireStoreManager, requireStoreMember } from '@/middleware/store-access';
import * as service from './service';

/** Dipasang di /api/stores/:storeId/... */
export const memberRoutes = Router();

memberRoutes.use(authenticate);

const roleSchema = z.enum(['ADMIN', 'STAFF']);
const permissionsSchema = z.array(z.string()).nullable().optional();

memberRoutes.get(
  '/stores/:storeId/members',
  requireStoreMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await service.listMembers(req.params.storeId);
      // Kode undangan hanya untuk yang berhak mengundang.
      if (req.membership!.role === 'STAFF') {
        data.invites = [];
      }
      res.json({ ...data, myRole: req.membership!.role });
    } catch (err) {
      next(err);
    }
  },
);

memberRoutes.post(
  '/stores/:storeId/invites',
  requireStoreManager,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        email: z.string().email('Format email tidak valid'),
        role: roleSchema.default('STAFF'),
        permissions: permissionsSchema,
      });
      const input = schema.parse(req.body);

      const invite = await service.createInvite(
        req.params.storeId,
        req.storeOwner!.id,
        req.user!.id,
        input,
      );
      res.status(201).json({ invite });
    } catch (err) {
      next(err);
    }
  },
);

memberRoutes.delete(
  '/stores/:storeId/invites/:inviteId',
  requireStoreManager,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.revokeInvite(req.params.storeId, req.params.inviteId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

memberRoutes.patch(
  '/stores/:storeId/members/:userId',
  requireStoreManager,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        role: roleSchema.optional(),
        permissions: permissionsSchema,
      });
      const input = schema.parse(req.body);

      const member = await service.updateMember(
        req.params.storeId,
        req.params.userId,
        req.membership!.role,
        input,
      );
      res.json({ member });
    } catch (err) {
      next(err);
    }
  },
);

memberRoutes.delete(
  '/stores/:storeId/members/:userId',
  requireStoreManager,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.removeMember(
        req.params.storeId,
        req.params.userId,
        req.user!.id,
        req.membership!.role,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

memberRoutes.post(
  '/stores/:storeId/leave',
  requireStoreMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.leaveStore(req.params.storeId, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

/** Dipasang di /api/invites — tidak butuh keanggotaan, justru untuk membuatnya. */
export const inviteRoutes = Router();

inviteRoutes.use(authenticate);

inviteRoutes.post('/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = z.object({ code: z.string().min(4) }).parse(req.body);
    const result = await service.acceptInvite(req.user!.id, req.user!.email, code);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
