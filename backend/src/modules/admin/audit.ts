import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Panel admin bisa mengubah data uang dan membuka data seluruh pelanggan,
 * jadi tidak ada mutasi admin yang boleh terjadi tanpa catatan. Pencatatan
 * sengaja tidak dibungkus try/catch: kalau audit log gagal ditulis, aksinya
 * ikut gagal.
 */
export async function recordAudit(
  req: Request,
  entry: {
    action: string;
    targetType: string;
    targetId?: string;
    reason?: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
) {
  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      reason: entry.reason,
      before: entry.before,
      after: entry.after,
      ip: req.ip,
    },
  });
}
