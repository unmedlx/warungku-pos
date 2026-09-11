import { prisma } from '@/lib/db';
import { AppError, BadRequestError } from '@/lib/error';
import { uploadBuffer, deleteObject } from '@/lib/storage';

/**
 * Daftar toko yang bisa diakses user — miliknya sendiri maupun toko orang lain
 * tempat dia diundang. Sebelum multi-user ini hanya `where: { userId }`.
 */
export async function listStores(userId: string) {
  const memberships = await prisma.storeMember.findMany({
    where: { userId },
    include: { store: true },
    orderBy: { createdAt: 'desc' },
  });

  return memberships
    .filter((m) => m.store)
    .sort((a, b) => b.store.createdAt.getTime() - a.store.createdAt.getTime())
    .map((m) => mapStore(m.store, { includeCounts: true, role: m.role }));
}

export async function getStore(userId: string, storeId: string) {
  const membership = await prisma.storeMember.findUnique({
    where: { storeId_userId: { storeId, userId } },
    include: { store: true },
  });
  if (!membership) throw new AppError('Toko tidak ditemukan', 404);
  return mapStore(membership.store, { role: membership.role });
}

export async function createStore(userId: string, name: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const storeCount = await prisma.store.count({ where: { userId } });
  const maxStores = user?.maxStores ?? 1;

  if (storeCount >= maxStores) {
    throw new BadRequestError(`Anda hanya bisa memiliki maksimal ${maxStores} toko`);
  }

  // Toko dan baris OWNER-nya dibuat sekaligus: toko tanpa anggota tidak bisa
  // diakses siapa pun, termasuk pembuatnya, karena semua gerbang akses
  // sekarang membaca `store_members`.
  const store = await prisma.$transaction(async (tx) => {
    const created = await tx.store.create({ data: { userId, name } });
    await tx.storeMember.create({
      data: { storeId: created.id, userId, role: 'OWNER' },
    });
    return created;
  });

  return mapStore(store, { role: 'OWNER' });
}

/**
 * Semua mutasi di bawah menerima `storeId` yang sudah diverifikasi oleh
 * `requireStoreManager`/`requireStoreOwner` di lapisan route. Pemeriksaan
 * `userId` lama dihapus supaya admin toko (yang bukan pemilik) tetap bisa
 * bekerja — kalau dipertahankan, dia akan selalu kena 404.
 */
export async function updateStore(storeId: string, data: {
  name: string;
  address1?: string | null;
  address2?: string | null;
  provinceId?: number | null;
  provinceName?: string | null;
  cityId?: number | null;
  cityName?: string | null;
  districtId?: number | null;
  districtName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  timezone?: string | null;
  operationalHours?: any;
}) {
  const updated = await prisma.store.update({
    where: { id: storeId },
    data,
  });

  return mapStore(updated);
}

export async function deleteStore(storeId: string) {
  await prisma.store.delete({ where: { id: storeId } });
}

export async function updateIdentifier(storeId: string, identifier: string | null) {

  if (identifier && !/^[a-z0-9-]+$/.test(identifier)) {
    throw new BadRequestError('Identifier hanya boleh huruf kecil, angka, dan tanda hubung');
  }

  if (identifier) {
    const existing = await prisma.store.findUnique({ where: { identifier } });
    if (existing && existing.id !== storeId) {
      throw new BadRequestError('Identifier sudah digunakan');
    }
  }

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: { identifier },
  });

  return mapStore(updated);
}

export async function updateVisibility(storeId: string, isPublic: boolean) {
  const updated = await prisma.store.update({
    where: { id: storeId },
    data: { isPublic },
  });

  return mapStore(updated);
}

export async function checkIdentifierAvailability(q: string) {
  const existing = await prisma.store.findUnique({ where: { identifier: q } });
  return !existing;
}

export async function uploadLogo(storeId: string, file: Buffer, mimetype: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new AppError('Toko tidak ditemukan', 404);

  if (store.logoUrl) {
    try {
      await deleteObject(store.logoUrl);
    } catch {
      // ignore
    }
  }

  const ext = mimetype.split('/')[1] || 'png';
  const key = `logos/${storeId}/${Date.now()}.${ext}`;
  await uploadBuffer(key, file, mimetype);

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: { logoUrl: key },
  });

  return mapStore(updated);
}

export async function deleteLogo(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new AppError('Toko tidak ditemukan', 404);

  if (store.logoUrl) {
    await deleteObject(store.logoUrl);
  }

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: { logoUrl: null },
  });

  return mapStore(updated);
}

function mapStore(store: any, opts?: { includeCounts?: boolean; role?: string }) {
  const result = {
    id: store.id,
    userId: store.userId,
    name: store.name,
    identifier: store.identifier,
    isPublic: store.isPublic,
    address1: store.address1,
    address2: store.address2,
    provinceId: store.provinceId,
    provinceName: store.provinceName,
    cityId: store.cityId,
    cityName: store.cityName,
    districtId: store.districtId,
    districtName: store.districtName,
    latitude: store.latitude,
    longitude: store.longitude,
    phone: store.phone,
    timezone: store.timezone,
    operationalHours: store.operationalHours,
    logoUrl: store.logoUrl,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
    /** Peran user yang sedang login di toko ini; null kalau tidak relevan. */
    role: opts?.role ?? null,
    isOwner: opts?.role ? opts.role === 'OWNER' : null,
  };

  if (opts?.includeCounts) {
    (result as any)._count = {
      products: 0,
      storeTransactions: 0,
      backups: 0,
    };
  }

  return result;
}
