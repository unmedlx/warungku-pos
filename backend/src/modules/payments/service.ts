import { prisma } from '@/lib/db';
import { AppError, BadRequestError } from '@/lib/error';
import { tripayConfig } from '@/config';
import {
  generateSignature,
  createTransaction as createTripayTransaction,
  getTransactionDetail,
  validateCallbackSignature,
} from '@/lib/tripay';

export async function checkoutPlan(
  userId: string,
  planId: string,
  method?: string,
  customerName?: string,
  customerEmail?: string,
  customerPhone?: string,
  returnUrl?: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const plan = await prisma.plan.findUnique({ where: { id: planId } });

  if (!plan) throw new AppError('Paket tidak ditemukan', 404);

  const transaction = await prisma.paymentTransaction.create({
    data: {
      userId,
      planId,
      amount: plan.price,
      status: 'PENDING',
    },
  });

  const merchantRef = `KP-${transaction.id}`;

  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: { paymentGatewayRef: merchantRef },
  });

  const paymentMethod = method || process.env.DEFAULT_TRIPAY_METHOD || 'QRIS';

  const signature = generateSignature(merchantRef, plan.price);

  const result = await createTripayTransaction({
    method: paymentMethod,
    merchant_ref: merchantRef,
    amount: plan.price,
    customer_name: customerName || user?.name || 'KanPOS User',
    customer_email: customerEmail || user?.email || '',
    customer_phone: customerPhone || '',
    order_items: [
      {
        name: plan.name,
        price: plan.price,
        quantity: 1,
      },
    ],
    callback_url: tripayConfig.callbackUrl,
    return_url: returnUrl || tripayConfig.returnUrl,
    expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    signature,
  });

  if (!result.success || !result.data) {
    throw new BadRequestError(result.message || 'Gagal membuat transaksi Tripay');
  }

  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: { paymentGatewayRef: result.data.reference },
  });

  return {
    message: 'Checkout berhasil',
    paymentLink: result.data.checkout_url,
    transaction: {
      id: transaction.id,
      status: transaction.status,
      planId: transaction.planId,
      amount: transaction.amount,
      reference: result.data.reference,
      merchantRef,
      payCode: result.data.pay_code,
      paymentName: result.data.payment_name,
      expiredTime: result.data.expired_time,
    },
  };
}

/**
 * @param expectedUserId Wajib diisi saat dipanggil dari rute pelanggan — tanpa
 * itu, siapa pun yang login bisa memicu verifikasi transaksi milik orang lain
 * hanya dengan mengetahui id-nya. Panel admin sengaja memanggil tanpa argumen
 * ini karena cakupannya memang lintas akun.
 */
export async function verifyPayment(transactionId: string, expectedUserId?: string) {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
    include: { plan: true },
  });

  if (!transaction) throw new AppError('Transaksi tidak ditemukan', 404);

  // Sengaja 404, bukan 403: jangan bocorkan bahwa transaksi itu ada tapi
  // milik orang lain.
  if (expectedUserId && transaction.userId !== expectedUserId) {
    throw new AppError('Transaksi tidak ditemukan', 404);
  }

  const reference = transaction.paymentGatewayRef;
  if (!reference) throw new BadRequestError('Transaksi belum memiliki reference Tripay');

  const detail = await getTransactionDetail(reference);
  if (!detail.success || !detail.data) {
    throw new BadRequestError(detail.message || 'Gagal mengambil detail transaksi');
  }

  const newStatus = await applyGatewayStatus(
    transaction.id,
    transaction.userId,
    transaction.planId,
    detail.data.status,
  );

  return {
    message: 'Pembayaran berhasil diverifikasi',
    transaction: {
      id: transaction.id,
      status: newStatus,
      reference,
    },
  };
}

/** Status Tripay → status internal `PaymentTransaction`. */
function mapGatewayStatus(gatewayStatus: string) {
  switch (gatewayStatus.toUpperCase()) {
    case 'PAID':
      return 'COMPLETED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'FAILED':
      return 'FAILED';
    case 'REFUND':
      return 'REFUNDED';
    default:
      // UNPAID dan status lain yang belum final: transaksi masih menunggu
      // pembayaran, jangan ditandai gagal.
      return 'PENDING';
  }
}

/**
 * Terapkan status dari gateway ke transaksi, dan beri/cabut langganan tepat
 * satu kali.
 *
 * Callback Tripay dan polling `verifyPayment` dari aplikasi berjalan bersamaan,
 * dan Tripay me-retry callback-nya. Tanpa pengaman, keduanya sama-sama melihat
 * status PAID lalu sama-sama memanggil `grantSubscription` — satu pembayaran
 * jadi dua kali masa aktif. `updateMany` berkondisi di bawah adalah satu
 * statement UPDATE, jadi hanya pemanggil pertama yang mendapat `count === 1`
 * dan berhak mengubah langganan.
 */
async function applyGatewayStatus(
  transactionId: string,
  userId: string,
  planId: string,
  gatewayStatus: string,
) {
  const newStatus = mapGatewayStatus(gatewayStatus);

  // PENDING bukan status final — tidak perlu menulis apa pun.
  if (newStatus === 'PENDING') return newStatus;

  const { count } = await prisma.paymentTransaction.updateMany({
    where: { id: transactionId, status: { not: newStatus } },
    data: { status: newStatus },
  });

  if (count === 0) return newStatus;

  if (newStatus === 'COMPLETED') {
    await grantSubscription(userId, planId);
  } else if (newStatus === 'REFUNDED') {
    await revokeSubscription(userId, planId);
  }

  return newStatus;
}

export async function handleTripayCallback(jsonBody: string, signature: string, event: string) {
  if (event !== 'payment_status') {
    throw new BadRequestError('Invalid callback event');
  }

  const valid = validateCallbackSignature(jsonBody, signature);
  if (!valid) {
    throw new BadRequestError('Invalid callback signature');
  }

  const data = JSON.parse(jsonBody);
  const { status, reference } = data;

  const transaction = await prisma.paymentTransaction.findFirst({
    where: { paymentGatewayRef: reference },
    include: { plan: true },
  });

  if (!transaction) throw new AppError('Transaksi tidak ditemukan', 404);

  await applyGatewayStatus(transaction.id, transaction.userId, transaction.planId, status);

  return { success: true, message: 'Callback diproses' };
}

export async function paymentHistory(userId: string, page = 1, limit = 20) {
  const total = await prisma.paymentTransaction.count({ where: { userId } });
  const history = await prisma.paymentTransaction.findMany({
    where: { userId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    history: history.map((h) => ({
      id: h.id,
      planId: h.planId,
      amount: h.amount,
      status: h.status,
      paymentGatewayRef: h.paymentGatewayRef,
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
      plan: h.plan,
    })),
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    },
  };
}

/**
 * Memberi atau memperpanjang langganan.
 *
 * Sebelumnya fungsi ini bernama "extend" tapi tidak pernah memperpanjang: masa
 * aktif selalu dihitung 30 hari dari **sekarang**, sehingga pelanggan yang
 * memperpanjang saat masih punya sisa 20 hari justru kehilangan sisa itu. Dan
 * karena 30 hari di-hardcode, paket dengan masa aktif lain pun hanya dapat 30
 * hari. Sekarang durasinya diambil dari `Plan.durationDays` dan dihitung dari
 * masa berlaku yang masih tersisa.
 *
 * @param days Menimpa durasi paket — dipakai panel admin untuk kompensasi.
 */
export async function grantSubscription(
  userId: string,
  planId: string,
  days?: number,
) {
  const now = new Date();

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new BadRequestError('Paket tidak ditemukan');

  const durasi = days ?? plan.durationDays;

  // Sisa masa aktif tidak boleh hangus saat diperpanjang.
  const berjalan = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', endDate: { gt: now } },
    orderBy: { endDate: 'desc' },
  });

  const mulaiDari = berjalan && berjalan.endDate > now ? berjalan.endDate : now;
  const endDate = new Date(mulaiDari.getTime() + durasi * 24 * 60 * 60 * 1000);

  const subscription =
    berjalan && berjalan.planId === planId
      ? // Paket yang sama: perpanjang barisnya, jangan menumpuk baris baru.
        await prisma.subscription.update({ where: { id: berjalan.id }, data: { endDate } })
      : await prisma.subscription.create({
          data: {
            userId,
            planId,
            startDate: now,
            endDate,
            status: 'ACTIVE',
            hasActiveSubscription: true,
          },
        });

  // Pindah paket: langganan lama ditutup agar tidak ada dua yang aktif sekaligus.
  if (berjalan && berjalan.planId !== planId) {
    await prisma.subscription.update({
      where: { id: berjalan.id },
      data: { status: 'REPLACED', hasActiveSubscription: false },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      // Paket SYNC juga membawa kuota penyimpanan (lihat prisma/seed.ts), jadi
      // kuotanya ikut diberikan — kalau tidak, storageLimitMb tetap 0 dan setiap
      // backup ditolak "Kuota cloud penuh" walau langganan aktif.
      storageLimitMb: plan.storageLimitMb > 0 ? plan.storageLimitMb : undefined,
      syncExpiry: plan.category === 'SYNC' ? endDate : undefined,
      maxStores: plan.maxStores,
      planId,
    },
  });

  return {
    subscription,
    diperpanjangDari: mulaiDari > now ? mulaiDari.toISOString() : null,
    endDate: endDate.toISOString(),
    days: durasi,
  };
}

/**
 * Kebalikan `grantSubscription`: menarik kembali masa aktif yang diberikan satu
 * pembayaran. Dipakai saat gateway melaporkan REFUND — sebelumnya transaksi
 * hanya ditandai gagal sementara langganannya tetap aktif sampai habis.
 *
 * Masa aktif dipotong sebesar durasi paket, bukan dihanguskan, supaya perpanjangan
 * lain yang sudah dibayar tidak ikut hilang.
 */
export async function revokeSubscription(userId: string, planId: string) {
  const now = new Date();

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return null;

  const berjalan = await prisma.subscription.findFirst({
    where: { userId, planId, status: 'ACTIVE' },
    orderBy: { endDate: 'desc' },
  });
  if (!berjalan) return null;

  const endDate = new Date(berjalan.endDate.getTime() - plan.durationDays * 24 * 60 * 60 * 1000);
  const habis = endDate <= now;

  const subscription = await prisma.subscription.update({
    where: { id: berjalan.id },
    data: {
      endDate,
      status: habis ? 'REFUNDED' : 'ACTIVE',
      hasActiveSubscription: !habis,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      storageLimitMb: habis ? 0 : undefined,
      syncExpiry: plan.category === 'SYNC' ? endDate : undefined,
      maxStores: habis ? null : undefined,
      planId: habis ? null : undefined,
    },
  });

  return { subscription, endDate: endDate.toISOString(), habis };
}
