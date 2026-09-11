/**
 * Membuat baris StoreMember(role=OWNER) untuk setiap toko yang sudah ada.
 *
 * Latar: otorisasi lama memakai pola `findFirst({ where: { id, userId } })` di
 * tiap service, sehingga hanya pemilik yang bisa menyentuh toko. Setelah
 * multi-user cloud, seluruh akses lewat tabel `store_members`. Toko lama belum
 * punya baris apa pun di sana — tanpa skrip ini pemiliknya sendiri akan
 * kehilangan akses begitu kode baru dideploy.
 *
 * Idempoten: `@@unique([storeId, userId])` membuat pengulangan tidak berefek.
 *
 * Jalankan:
 *   npx tsx prisma/backfill-store-members.ts            # dry-run
 *   npx tsx prisma/backfill-store-members.ts --apply    # tulis perubahan
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const apply = process.argv.includes('--apply');

async function main() {
  const stores = await prisma.store.findMany({
    select: {
      id: true,
      name: true,
      userId: true,
      user: { select: { email: true } },
      members: { where: { role: 'OWNER' }, select: { id: true, userId: true } },
    },
  });

  const perluDibuat = stores.filter((s) => s.members.length === 0);

  // Toko yang punya baris OWNER tapi bukan atas nama `Store.userId` — bisa
  // terjadi kalau kepemilikan pernah dipindah tangan lewat panel admin.
  const tidakSinkron = stores.filter(
    (s) => s.members.length > 0 && !s.members.some((m) => m.userId === s.userId),
  );

  if (perluDibuat.length === 0 && tidakSinkron.length === 0) {
    console.log('Semua toko sudah punya anggota OWNER yang benar.');
    return;
  }

  if (perluDibuat.length > 0) {
    console.log(`${perluDibuat.length} toko akan diberi anggota OWNER:`);
    for (const s of perluDibuat) {
      console.log(`  ${s.name} (${s.id}) -> ${s.user.email}`);
    }
  }

  if (tidakSinkron.length > 0) {
    console.log(`\n${tidakSinkron.length} toko punya OWNER yang berbeda dari Store.userId:`);
    for (const s of tidakSinkron) {
      console.log(`  ${s.name} (${s.id}) — periksa manual, tidak disentuh skrip ini.`);
    }
  }

  if (!apply) {
    console.log('\nDry-run. Jalankan ulang dengan --apply untuk menulis perubahan.');
    return;
  }

  for (const s of perluDibuat) {
    await prisma.storeMember.upsert({
      where: { storeId_userId: { storeId: s.id, userId: s.userId } },
      create: { storeId: s.id, userId: s.userId, role: 'OWNER' },
      update: { role: 'OWNER' },
    });
  }

  console.log(`\n${perluDibuat.length} toko diperbarui.`);
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
