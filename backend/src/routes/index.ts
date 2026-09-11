import { Router } from 'express';
import { authRoutes } from '@/modules/auth/routes';
import { bootstrapRoutes } from '@/modules/bootstrap/routes';
import { userRoutes } from '@/modules/users/routes';
import { planRoutes } from '@/modules/plans/routes';
import { storeRoutes } from '@/modules/stores/routes';
import { publicRoutes } from '@/modules/public/routes';
import { backupRoutes } from '@/modules/backups/routes';
import { paymentRoutes } from '@/modules/payments/routes';
import { syncRoutes } from '@/modules/sync/routes';
import { memberRoutes, inviteRoutes } from '@/modules/members/routes';
import { destinationRoutes } from '@/modules/destinations/routes';
import { storageRoutes } from '@/modules/storage/routes';
import { analyticsRoutes } from '@/modules/analytics/routes';
import { adminRoutes } from '@/modules/admin/routes';
import { visionRoutes } from '@/modules/vision/routes';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/bootstrap', bootstrapRoutes);
routes.use('/user', userRoutes);
routes.use('/plans', planRoutes);
routes.use('/stores', storeRoutes);
routes.use('/public', publicRoutes);
routes.use('/backups', backupRoutes);
routes.use('/payments', paymentRoutes);
routes.use('/destinations', destinationRoutes);
routes.use('/storage', storageRoutes);
routes.use('/analytics', analyticsRoutes);
routes.use('/admin', adminRoutes);
routes.use('/vision', visionRoutes);
routes.use('/invites', inviteRoutes);
routes.use('/', memberRoutes); // /api/stores/:storeId/members, /invites, /leave
routes.use('/', syncRoutes); // /api/stores/:storeId/sync
