import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { BadRequestError, NotFoundError } from '@/lib/error';

export interface PlanInput {
  id?: string;
  name: string;
  category: 'STORAGE' | 'SYNC';
  price: number;
  durationDays: number;
  storageLimitMb: number;
  maxStores?: number | null;
  maxMembers?: number | null;
}

function bentuk(p: {
  id: string;
  name: string;
  category: 'STORAGE' | 'SYNC';
  price: number;
  durationDays: number;
  storageLimitMb: number;
  maxStores: number | null;
  maxMembers: number | null;
  archivedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    durationDays: p.durationDays,
    storageLimitMb: p.storageLimitMb,
    maxStores: p.maxStores,
    maxMembers: p.maxMembers,
    archived: Boolean(p.archivedAt),
    archivedAt: p.archivedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

/**
 * Daftar paket untuk panel. Menyertakan jumlah pemakainya, karena itu yang
 * menentukan apakah sebuah paket aman diarsipkan.
 */
export async function listPlans(opts: { includeArchived?: boolean } = {}) {
  const plans = await prisma.plan.findMany({
    where: opts.includeArchived ? {} : { archivedAt: null },
    orderBy: [{ archivedAt: 'asc' }, { price: 'asc' }],
  });

  const ids = plans.map((p) => p.id);
  const [pengguna, aktif] = await Promise.all([
    prisma.user.groupBy({
      by: ['planId'],
      where: { planId: { in: ids }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.subscription.groupBy({
      by: ['planId'],
      where: { planId: { in: ids }, status: 'ACTIVE', endDate: { gt: new Date() } },
      _count: { _all: true },
    }),
  ]);

  return {
    plans: plans.map((p) => ({
      ...bentuk(p),
      users: pengguna.find((c) => c.planId === p.id)?._count._all ?? 0,
      activeSubscriptions: aktif.find((c) => c.planId === p.id)?._count._all ?? 0,
    })),
  };
}

export async function createPlan(input: PlanInput) {
  if (input.id) {
    const ada = await prisma.plan.findUnique({ where: { id: input.id } });
    if (ada) throw new BadRequestError(`Paket dengan id "${input.id}" sudah ada`);
  }

  const plan = await prisma.plan.create({
    data: {
      // Id boleh ditentukan sendiri agar paket bikinan panel tetap terbaca di
      // database dan log, mengikuti pola seed (STORAGE_1GB, SYNC_BASIC).
      ...(input.id ? { id: input.id } : {}),
      name: input.name,
      category: input.category,
      price: input.price,
      durationDays: input.durationDays,
      storageLimitMb: input.storageLimitMb,
      maxStores: input.maxStores ?? null,
      maxMembers: input.maxMembers ?? null,
    },
  });

  return { after: bentuk(plan) };
}

/**
 * Mengubah paket **tidak** menyentuh langganan yang sedang berjalan: masa aktif
 * tersimpan di baris `Subscription`, dan kuota sudah disalin ke `User` saat
 * langganan diberikan. Harga dan kuota baru mulai berlaku pada perpanjangan
 * berikutnya.
 */
export async function updatePlan(id: string, input: Partial<PlanInput>) {
  const sebelum = await prisma.plan.findUnique({ where: { id } });
  if (!sebelum) throw new NotFoundError('Paket tidak ditemukan');

  const data: Prisma.PlanUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.category !== undefined) data.category = input.category;
  if (input.price !== undefined) data.price = input.price;
  if (input.durationDays !== undefined) data.durationDays = input.durationDays;
  if (input.storageLimitMb !== undefined) data.storageLimitMb = input.storageLimitMb;
  if (input.maxStores !== undefined) data.maxStores = input.maxStores;
  if (input.maxMembers !== undefined) data.maxMembers = input.maxMembers;

  if (Object.keys(data).length === 0) {
    throw new BadRequestError('Tidak ada perubahan yang dikirim');
  }

  const sesudah = await prisma.plan.update({ where: { id }, data });

  return { before: bentuk(sebelum), after: bentuk(sesudah) };
}

/**
 * Arsip, bukan hapus. `Plan` punya relasi `onDelete: Cascade` ke `Subscription`
 * dan `PaymentTransaction`, jadi menghapus satu paket ikut menghapus riwayat
 * pembayarannya — catatan uang yang sudah masuk. Panel sengaja tidak
 * menyediakan jalan itu.
 */
export async function setArchived(id: string, archived: boolean) {
  const sebelum = await prisma.plan.findUnique({ where: { id } });
  if (!sebelum) throw new NotFoundError('Paket tidak ditemukan');

  const sesudah = await prisma.plan.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });

  // Bukan penghalang — pelanggan yang sedang berlangganan tetap dilayani sampai
  // masa aktifnya habis; yang hilang cuma pilihan untuk membeli baru.
  const masihDipakai = archived
    ? await prisma.subscription.count({
        where: { planId: id, status: 'ACTIVE', endDate: { gt: new Date() } },
      })
    : 0;

  return {
    before: { archived: Boolean(sebelum.archivedAt) },
    after: { archived: Boolean(sesudah.archivedAt) },
    activeSubscriptions: masihDipakai,
  };
}
