import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      id: 'STORAGE_1GB',
      name: 'Cloud Storage 1 GB',
      category: 'STORAGE' as const,
      storageLimitMb: 1024,
      price: 29000,
      maxStores: null,
      // Paket storage murni tidak membuka multi-user: hanya pemiliknya.
      maxMembers: 1,
    },
    {
      id: 'STORAGE_10GB',
      name: 'Cloud Storage 10 GB',
      category: 'STORAGE' as const,
      storageLimitMb: 10240,
      price: 99000,
      maxStores: null,
      maxMembers: 1,
    },
    {
      id: 'SYNC_BASIC',
      name: 'Sync Basic',
      category: 'SYNC' as const,
      storageLimitMb: 1024,
      price: 49000,
      maxStores: 1,
      // Pemilik + 2 karyawan.
      maxMembers: 3,
    },
    {
      id: 'SYNC_BUSINESS',
      name: 'Sync Business',
      category: 'SYNC' as const,
      storageLimitMb: 5120,
      price: 149000,
      maxStores: 5,
      maxMembers: 15,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: plan,
    });
  }

  console.log('Seeded default plans.');
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
