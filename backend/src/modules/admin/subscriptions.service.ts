import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/error';
import { grantSubscription } from '@/modules/payments/service';

/**
 * Memberi langganan tanpa pembayaran — untuk kompensasi, trial, dan pelanggan
 * awal. Memakai `grantSubscription` yang sama dengan alur pembayaran, jadi
 * perhitungan masa aktifnya tidak bercabang: kalau logika perpanjangan berubah,
 * jalur admin ikut berubah dengan sendirinya.
 */
export async function grantManual(userId: string, planId: string, days?: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan');

  const sebelum = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', endDate: { gt: new Date() } },
    orderBy: { endDate: 'desc' },
  });

  const hasil = await grantSubscription(userId, planId, days);

  return {
    before: {
      planId: user.planId,
      endDate: sebelum?.endDate.toISOString() ?? null,
    },
    after: {
      planId,
      endDate: hasil.endDate,
      days: hasil.days,
    },
    /** Terisi kalau masa aktif lama masih tersisa dan ikut dihitung. */
    diperpanjangDari: hasil.diperpanjangDari,
  };
}
