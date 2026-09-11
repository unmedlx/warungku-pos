import { prisma } from '@/lib/db';
import { uploadBuffer, getObjectBuffer, deleteObject } from '@/lib/storage';
import { buildPagination } from '@/lib/pagination';
import { AppError, BadRequestError } from '@/lib/error';

export async function listBackups(userId: string, page = 1, limit = 20) {
  const total = await prisma.backup.count({ where: { userId } });
  const backups = await prisma.backup.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    backups: backups.map((b) => ({
      id: b.id,
      fileName: b.fileName,
      fileSize: b.fileSize,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
    pagination: buildPagination(page, limit, total),
  };
}

/**
 * Backup berisi seluruh isi toko termasuk modal dan margin, jadi hanya pemilik
 * yang boleh membuat, mengunduh, dan menghapusnya — lihat `requireStoreOwner`
 * di routes. Karyawan menerima data lewat sync, bukan lewat file backup.
 */
export async function uploadBackup(userId: string, fileName: string, jsonString: string, storeId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { backups: true },
  });

  if (!user) throw new AppError('User tidak ditemukan', 404);

  const usedBytes = user.backups.reduce((sum, b) => sum + (b.fileSize || 0), 0);
  const usedMb = usedBytes / 1024 / 1024;

  if (usedMb >= user.storageLimitMb) {
    throw new BadRequestError('Kuota cloud penuh. Hapus backup lama atau upgrade paket.');
  }

  const buffer = Buffer.from(jsonString, 'utf-8');
  const fileSize = buffer.length;

  const newUsedMb = (usedBytes + fileSize) / 1024 / 1024;
  if (newUsedMb > user.storageLimitMb) {
    throw new BadRequestError('File backup melebihi kuota tersisa');
  }

  // Kalau backup ditujukan ke sebuah toko, pastikan penggunggahnya memang
  // pemilik toko itu — `userId` saja tidak membuktikan apa-apa sejak sebuah
  // toko bisa dilihat banyak orang.
  if (storeId) {
    const store = await prisma.store.findFirst({ where: { id: storeId, userId } });
    if (!store) throw new AppError('Toko tidak ditemukan', 404);
  }

  const key = `backups/${userId}/${Date.now()}-${fileName}`;
  await uploadBuffer(key, buffer, 'application/json');

  const backup = await prisma.backup.create({
    data: {
      userId,
      storeId,
      fileName,
      fileKey: key,
      fileSize,
    },
  });

  return {
    id: backup.id,
    fileName: backup.fileName,
    fileSize: backup.fileSize,
    createdAt: backup.createdAt.toISOString(),
    updatedAt: backup.updatedAt.toISOString(),
  };
}

export async function downloadBackup(userId: string, backupId: string) {
  const backup = await prisma.backup.findFirst({ where: { id: backupId, userId } });
  if (!backup) throw new AppError('Backup tidak ditemukan', 404);

  const buffer = await getObjectBuffer(backup.fileKey);
  return JSON.parse(buffer.toString('utf-8'));
}

export async function deleteBackup(userId: string, backupId: string) {
  const backup = await prisma.backup.findFirst({ where: { id: backupId, userId } });
  if (!backup) throw new AppError('Backup tidak ditemukan', 404);

  await deleteObject(backup.fileKey);
  await prisma.backup.delete({ where: { id: backupId } });
}
