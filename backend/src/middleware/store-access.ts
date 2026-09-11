import { Request, Response, NextFunction } from 'express';
import { StoreRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError, ForbiddenError } from '@/lib/error';

/**
 * Gerbang akses toko untuk multi-user cloud.
 *
 * Menggantikan pola lama `findFirst({ where: { id: storeId, userId } })` yang
 * tersebar di tiap service dan mengunci semuanya ke pemilik. Sekarang akses
 * ditentukan oleh baris `StoreMember`, sedangkan hak yang dibeli — kuota
 * storage, masa aktif SYNC, batas toko — tetap dibaca dari **pemilik** toko
 * lewat `req.storeOwner`. Itu inti fiturnya: karyawan menumpang langganan
 * owner tanpa punya langganan sendiri.
 *
 * Toko yang tidak boleh diakses selalu dibalas 404, bukan 403, supaya
 * keberadaan sebuah toko tidak bisa diprobe oleh orang luar.
 */
export function requireStoreRole(...allowed: StoreRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const storeId = req.params.storeId ?? req.params.id;
      if (!storeId) throw new AppError('Toko tidak ditemukan', 404);

      const membership = await prisma.storeMember.findUnique({
        where: { storeId_userId: { storeId, userId: req.user!.id } },
        include: { store: { include: { user: true } } },
      });

      if (!membership || membership.store.user.deletedAt) {
        throw new AppError('Toko tidak ditemukan', 404);
      }

      if (allowed.length > 0 && !allowed.includes(membership.role)) {
        throw new ForbiddenError('Anda tidak punya akses untuk tindakan ini');
      }

      req.membership = membership;
      req.store = membership.store;
      req.storeOwner = membership.store.user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Semua anggota toko, apa pun perannya. */
export const requireStoreMember = requireStoreRole();

/** OWNER dan ADMIN — boleh mengubah pengaturan toko dan mengelola anggota. */
export const requireStoreManager = requireStoreRole('OWNER', 'ADMIN');

/** Hanya pemilik/penanggung langganan. */
export const requireStoreOwner = requireStoreRole('OWNER');

/**
 * Versi non-middleware untuk dipakai di dalam service yang tidak menerima
 * `req` (mis. saat storeId datang dari body, bukan dari path).
 */
export async function resolveMembership(userId: string, storeId: string, allowed?: StoreRole[]) {
  const membership = await prisma.storeMember.findUnique({
    where: { storeId_userId: { storeId, userId } },
    include: { store: { include: { user: true } } },
  });

  if (!membership || membership.store.user.deletedAt) {
    throw new AppError('Toko tidak ditemukan', 404);
  }

  if (allowed?.length && !allowed.includes(membership.role)) {
    throw new ForbiddenError('Anda tidak punya akses untuk tindakan ini');
  }

  return membership;
}
