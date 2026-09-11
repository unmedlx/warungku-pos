import { prisma } from '@/lib/db';
import { AppError } from '@/lib/error';

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { hasActiveSubscription: true },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      },
      stores: true,
      backups: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!user) throw new AppError('User tidak ditemukan', 404);

  const usedBytes = user.backups.reduce((sum, b) => sum + (b.fileSize || 0), 0);
  const usedMb = Math.round(usedBytes / 1024 / 1024 * 100) / 100;

  const subscription = user.subscriptions.find((s) => s.plan.category === 'STORAGE') || null;
  const syncSubscription = user.subscriptions.find((s) => s.plan.category === 'SYNC') || null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      planId: user.planId,
      storageLimitMb: user.storageLimitMb,
      syncExpiry: user.syncExpiry?.toISOString() ?? null,
      maxStores: user.maxStores,
      createdAt: user.createdAt.toISOString(),
    },
    subscription: subscription
      ? {
          id: subscription.id,
          planId: subscription.planId,
          plan: mapPlan(subscription.plan),
          startDate: subscription.startDate.toISOString(),
          endDate: subscription.endDate.toISOString(),
          status: subscription.status,
          hasActiveSubscription: subscription.hasActiveSubscription,
        }
      : null,
  syncSubscription: syncSubscription
      ? {
          id: syncSubscription.id,
          planId: syncSubscription.planId,
          plan: mapPlan(syncSubscription.plan),
          startDate: syncSubscription.startDate.toISOString(),
          endDate: syncSubscription.endDate.toISOString(),
          status: syncSubscription.status,
          hasActiveSubscription: syncSubscription.hasActiveSubscription,
        }
      : null,
    storageUsage: {
      usedBytes,
      usedMb,
      limitMb: user.storageLimitMb,
      remainingMb: Math.max(0, user.storageLimitMb - usedMb),
    },
    backups: user.backups.map((b) => ({
      id: b.id,
      fileName: b.fileName,
      fileSize: b.fileSize,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
  };
}

function mapPlan(plan: { id: string; name: string; category: 'STORAGE' | 'SYNC'; storageLimitMb: number; price: number; maxStores: number | null }) {
  return {
    id: plan.id,
    name: plan.name,
    storageLimitMb: plan.storageLimitMb,
    price: plan.price,
    category: plan.category,
    maxStores: plan.maxStores,
  };
}
