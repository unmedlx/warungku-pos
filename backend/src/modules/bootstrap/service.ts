import { prisma } from '@/lib/db';
import { AppError } from '@/lib/error';
import { getUserProfile } from '@/modules/users/service';
import { listStores } from '@/modules/stores/service';

/**
 * Satu panggilan yang menjawab "apa yang harus ditampilkan setelah login?".
 *
 * Sebelumnya frontend perlu `/user/profile` **dan** `/stores` untuk memutuskan
 * satu percabangan, dan `profile.stores` hanya berisi toko milik sendiri —
 * tidak cukup untuk menjawab apakah user terhubung ke toko orang lain.
 */
export async function getBootstrap(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User tidak ditemukan', 404);

  const [profile, stores, invites] = await Promise.all([
    getUserProfile(userId),
    listStores(userId),
    prisma.storeInvite.findMany({
      where: {
        email: user.email.toLowerCase(),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { store: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const ownedCount = stores.filter((s) => s.userId === userId).length;

  return {
    user: profile.user,
    subscription: profile.subscription,
    syncSubscription: profile.syncSubscription,
    storageUsage: profile.storageUsage,
    stores,
    /**
     * Undangan yang belum diterima, supaya karyawan yang baru install tidak
     * perlu mengetik kode kalau undangannya memang ditujukan ke emailnya.
     * `code` sengaja tidak dikirim — penerimaan tetap lewat `/invites/accept`
     * dengan kode dari pemilik.
     */
    pendingInvites: invites.map((i) => ({
      id: i.id,
      storeId: i.storeId,
      storeName: i.store?.name ?? null,
      storeLogoUrl: i.store?.logoUrl ?? null,
      role: i.role,
      expiresAt: i.expiresAt.toISOString(),
    })),
    /** Sisa kuota toko; dipakai layar "Buat toko baru" agar tidak error mentah. */
    canCreateStore: ownedCount < (user.maxStores ?? 1),
    maxStores: user.maxStores ?? 1,
    ownedStoreCount: ownedCount,
  };
}
