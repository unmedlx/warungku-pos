import { prisma } from '@/lib/db';
import { AppError, BadRequestError } from '@/lib/error';

export async function getPublicStore(identifier: string) {
  if (!identifier) throw new BadRequestError('Identifier toko diperlukan');

  const store = await prisma.store.findUnique({
    where: { identifier },
  });

  if (!store) throw new AppError('Toko tidak ditemukan', 404);
  if (!store.isPublic) throw new AppError('Toko tidak dipublikasikan', 403);

  const user = await prisma.user.findUnique({
    where: { id: store.userId },
    select: { name: true, email: true },
  });

  const productRecords = await prisma.syncRecord.findMany({
    where: { storeId: store.id, tableName: 'products' },
    orderBy: { syncedAt: 'desc' },
  });

  return {
    store: {
      id: store.id,
      name: store.name,
      identifier: store.identifier,
      isPublic: store.isPublic,
      address1: store.address1,
      address2: store.address2,
      provinceName: store.provinceName,
      cityName: store.cityName,
      districtName: store.districtName,
      latitude: store.latitude,
      longitude: store.longitude,
      phone: store.phone,
      timezone: store.timezone,
      operationalHours: store.operationalHours,
      logoUrl: store.logoUrl,
      ownerName: user?.name ?? '',
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    },
    products: productRecords.map((r) => {
      const p = r.payload as any;
      return {
        id: p.id ?? r.localId,
        name: p.name ?? p.productName ?? 'Produk',
        price: p.price ?? 0,
        stock: p.stock ?? p.quantity ?? 0,
        image: p.image ?? null,
      };
    }),
  };
}
