import { prisma } from '@/lib/db';

/**
 * Hak yang berlaku untuk sebuah toko, selalu dihitung dari **pemilik** toko.
 *
 * `maxStores` dan `storageLimitMb` disalin ke tabel `users` saat pembayaran
 * (lihat `grantSubscription`), tapi `maxMembers` sengaja tidak — batas anggota
 * hanya relevan saat mengundang, jadi lebih aman dibaca langsung dari paket
 * yang sedang aktif daripada disimpan ganda dan berisiko basi setelah refund.
 */
export async function getOwnerEntitlements(ownerId: string) {
  const now = new Date();

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    include: {
      subscriptions: {
        where: { hasActiveSubscription: true, endDate: { gt: now } },
        include: { plan: true },
      },
    },
  });

  if (!owner) return null;

  // Satu owner bisa punya beberapa langganan aktif (STORAGE + SYNC); yang
  // dipakai adalah yang paling longgar. null pada `maxMembers` berarti tak
  // terbatas — itu nilai paket lama yang dibuat sebelum fitur ini ada.
  let maxMembers: number | null = 1;
  for (const sub of owner.subscriptions) {
    if (sub.plan.maxMembers === null) {
      maxMembers = null;
      break;
    }
    if (maxMembers !== null && sub.plan.maxMembers > maxMembers) {
      maxMembers = sub.plan.maxMembers;
    }
  }

  const syncActive = !!owner.syncExpiry && owner.syncExpiry > now;

  return {
    owner,
    maxMembers,
    syncActive,
    storageLimitMb: owner.storageLimitMb,
    maxStores: owner.maxStores,
  };
}
