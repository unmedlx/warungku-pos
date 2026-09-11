/**
 * Mengubah peran akun yang **sudah ada** di database.
 *
 *   npm run admin -- list
 *   npm run admin -- promote budi@gmail.com
 *   npm run admin -- promote budi@gmail.com ADMIN
 *   npm run admin -- demote budi@gmail.com
 *
 * Untuk admin *pertama* di database kosong, perintah ini tidak bisa dipakai:
 * baris `users` butuh `googleSub` yang hanya ada di dalam token Google asli.
 * Pakai `ADMIN_EMAILS` di `.env` lalu login sekali di panel — backend membuat
 * barisnya sendiri.
 */
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function daftar() {
  const admins = await prisma.user.findMany({
    where: { role: { not: 'USER' } },
    select: { email: true, name: true, role: true, deletedAt: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!admins.length) {
    console.log('Belum ada admin. Semai yang pertama lewat ADMIN_EMAILS di .env.');
    return;
  }

  console.log(`${admins.length} admin terdaftar:\n`);
  for (const a of admins) {
    console.log(
      `  ${a.role.padEnd(11)} ${a.email.padEnd(32)} ${a.name}${a.deletedAt ? '  (disuspend)' : ''}`,
    );
  }
}

async function ubahPeran(email: string, peran: UserRole) {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

  if (!user) {
    console.error(`Akun "${email}" tidak ada di database.`);
    console.error('Akun harus sudah pernah login lewat aplikasi kasir atau panel admin.');
    process.exit(1);
  }

  if (user.role === peran) {
    console.log(`${user.email} sudah berperan ${peran}. Tidak ada yang diubah.`);
    return;
  }

  const sebelum = user.role;
  await prisma.user.update({ where: { id: user.id }, data: { role: peran } });

  // Perubahan peran lewat CLI tetap masuk audit log — kalau tidak, ada jalur
  // mengubah hak akses yang tidak meninggalkan jejak sama sekali.
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: peran === 'USER' ? 'admin.demote' : 'admin.promote',
      targetType: 'User',
      targetId: user.id,
      reason: 'Diubah lewat CLI (npm run admin)',
      before: { role: sebelum },
      after: { role: peran },
    },
  });

  console.log(`${user.email}: ${sebelum} → ${peran}`);
  if (peran === 'USER') {
    console.log('Sesi admin yang sedang berjalan langsung tidak berlaku — role dibaca dari database tiap request.');
  }
}

async function main() {
  const [perintah, email, peranArg] = process.argv.slice(2);

  switch (perintah) {
    case 'list':
      await daftar();
      break;

    case 'promote': {
      if (!email) throw new Error('Email wajib diisi: npm run admin -- promote <email> [ADMIN|SUPERADMIN]');
      const peran = (peranArg ?? 'ADMIN').toUpperCase();
      if (peran !== 'ADMIN' && peran !== 'SUPERADMIN') {
        throw new Error(`Peran "${peranArg}" tidak dikenal. Pilih ADMIN atau SUPERADMIN.`);
      }
      await ubahPeran(email, peran as UserRole);
      break;
    }

    case 'demote':
      if (!email) throw new Error('Email wajib diisi: npm run admin -- demote <email>');
      await ubahPeran(email, 'USER');
      break;

    default:
      console.log('Perintah:');
      console.log('  npm run admin -- list');
      console.log('  npm run admin -- promote <email> [ADMIN|SUPERADMIN]   (default ADMIN)');
      console.log('  npm run admin -- demote <email>');
      process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
