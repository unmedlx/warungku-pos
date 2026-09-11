/**
 * Backfill kuota penyimpanan untuk user yang langganannya aktif tapi
 * `storage_limit_mb`-nya masih 0.
 *
 * Latar: `grantSubscription` dulu hanya menyalin `storageLimitMb` untuk paket
 * kategori STORAGE, padahal paket SYNC juga membawa kuota. Akibatnya pembeli
 * paket SYNC punya limit 0 dan setiap backup ditolak "Kuota cloud penuh".
 * Bug-nya sudah diperbaiki di src/modules/payments/service.ts, tapi user yang
 * terlanjur membeli baru ikut terkoreksi saat perpanjangan berikutnya —
 * skrip ini yang memperbaiki mereka sekarang.
 *
 * Jalankan:
 *   npx tsx prisma/backfill-storage-quota.ts            # dry-run, hanya melapor
 *   npx tsx prisma/backfill-storage-quota.ts --apply    # tulis perubahan
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const apply = process.argv.includes('--apply');

async function main() {
  const now = new Date();

  // Satu user bisa punya beberapa langganan aktif (mis. STORAGE + SYNC);
  // yang dipakai adalah kuota terbesar di antaranya.
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      hasActiveSubscription: true,
      endDate: { gt: now },
      user: { deletedAt: null },
    },
    include: {
      plan: { select: { id: true, name: true, storageLimitMb: true } },
      user: { select: { id: true, email: true, storageLimitMb: true } },
    },
  });

  const target = new Map<string, { email: string; current: number; limit: number; plan: string }>();

  for (const sub of subscriptions) {
    if (sub.plan.storageLimitMb <= 0) continue;
    const prev = target.get(sub.userId);
    if (prev && prev.limit >= sub.plan.storageLimitMb) continue;
    target.set(sub.userId, {
      email: sub.user.email,
      current: sub.user.storageLimitMb,
      limit: sub.plan.storageLimitMb,
      plan: sub.plan.name,
    });
  }

  // Hanya naikkan. Kalau limit sekarang sudah >= hak paket, biarkan —
  // bisa jadi hasil penyesuaian manual lewat panel admin.
  const perluDiperbaiki = [...target.entries()].filter(([, t]) => t.current < t.limit);

  if (perluDiperbaiki.length === 0) {
    console.log('Tidak ada user yang perlu diperbaiki.');
    return;
  }

  console.log(`${perluDiperbaiki.length} user perlu diperbaiki:`);
  for (const [userId, t] of perluDiperbaiki) {
    console.log(`  ${t.email} (${userId}) — ${t.current} MB -> ${t.limit} MB [${t.plan}]`);
  }

  if (!apply) {
    console.log('\nDry-run. Jalankan ulang dengan --apply untuk menulis perubahan.');
    return;
  }

  for (const [userId, t] of perluDiperbaiki) {
    await prisma.user.update({ where: { id: userId }, data: { storageLimitMb: t.limit } });
  }

  console.log(`\n${perluDiperbaiki.length} user diperbarui.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
