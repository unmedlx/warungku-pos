import { StoreRole, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { AppError, BadRequestError, ForbiddenError } from '@/lib/error';
import { getOwnerEntitlements } from '@/lib/entitlements';

/** Masa berlaku undangan. Cukup lama untuk dikirim lewat WhatsApp, cukup
 *  pendek supaya kode yang bocor tidak berguna selamanya. */
const INVITE_TTL_DAYS = 7;

/** Tanpa huruf/angka yang mudah tertukar saat diketik ulang (0/O, 1/I). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  const bytes = randomBytes(8);
  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

function mapMember(m: any) {
  return {
    id: m.id,
    userId: m.userId,
    storeId: m.storeId,
    role: m.role,
    permissions: m.permissions ?? null,
    name: m.user?.name ?? null,
    email: m.user?.email ?? null,
    picture: m.user?.picture ?? null,
    joinedAt: m.createdAt.toISOString(),
  };
}

function mapInvite(i: any) {
  return {
    id: i.id,
    storeId: i.storeId,
    email: i.email,
    role: i.role,
    permissions: i.permissions ?? null,
    code: i.code,
    expiresAt: i.expiresAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
  };
}

export async function listMembers(storeId: string) {
  const [members, invites] = await Promise.all([
    prisma.storeMember.findMany({
      where: { storeId },
      include: { user: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.storeInvite.findMany({
      where: { storeId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    members: members.map(mapMember),
    invites: invites.map(mapInvite),
  };
}

/**
 * Membuat undangan. Batas anggota dihitung dari anggota yang sudah bergabung
 * **ditambah** undangan yang masih berlaku — kalau tidak, owner bisa menembus
 * batas paket dengan menyebar banyak undangan sekaligus lalu menunggu semuanya
 * diterima.
 */
export async function createInvite(
  storeId: string,
  ownerId: string,
  inviterId: string,
  input: { email: string; role: StoreRole; permissions?: unknown },
) {
  if (input.role === 'OWNER') {
    throw new BadRequestError('Peran OWNER tidak bisa diberikan lewat undangan');
  }

  const email = input.email.trim().toLowerCase();
  if (!email) throw new BadRequestError('Email wajib diisi');

  const entitlements = await getOwnerEntitlements(ownerId);
  if (!entitlements) throw new AppError('Pemilik toko tidak ditemukan', 404);

  if (!entitlements.syncActive) {
    throw new BadRequestError(
      'Multi-user butuh langganan Sync yang aktif. Perpanjang paket untuk mengundang karyawan.',
    );
  }

  const now = new Date();
  const [memberCount, pendingCount] = await Promise.all([
    prisma.storeMember.count({ where: { storeId } }),
    prisma.storeInvite.count({
      where: { storeId, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
    }),
  ]);

  if (entitlements.maxMembers !== null && memberCount + pendingCount >= entitlements.maxMembers) {
    throw new BadRequestError(
      `Paket Anda hanya mengizinkan ${entitlements.maxMembers} anggota per toko. Upgrade paket untuk menambah karyawan.`,
    );
  }

  // Sudah jadi anggota — undangan baru hanya akan membingungkan.
  const existing = await prisma.storeMember.findFirst({
    where: { storeId, user: { email } },
  });
  if (existing) throw new BadRequestError('Orang ini sudah menjadi anggota toko');

  // Satu email hanya boleh punya satu undangan berlaku per toko. Undangan lama
  // dicabut supaya kode yang beredar tidak menumpuk.
  await prisma.storeInvite.updateMany({
    where: { storeId, email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: now },
  });

  const invite = await prisma.storeInvite.create({
    data: {
      storeId,
      email,
      role: input.role,
      permissions: (input.permissions ?? undefined) as Prisma.InputJsonValue | undefined,
      code: generateCode(),
      invitedBy: inviterId,
      expiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return mapInvite(invite);
}

export async function revokeInvite(storeId: string, inviteId: string) {
  const invite = await prisma.storeInvite.findFirst({ where: { id: inviteId, storeId } });
  if (!invite) throw new AppError('Undangan tidak ditemukan', 404);
  if (invite.acceptedAt) throw new BadRequestError('Undangan sudah diterima');

  await prisma.storeInvite.update({
    where: { id: inviteId },
    data: { revokedAt: new Date() },
  });
}

/**
 * Menerima undangan. Kode dicocokkan bersama email akun yang login — kode
 * saja tidak cukup, supaya kode yang tersebar di grup chat tidak bisa dipakai
 * orang lain.
 */
export async function acceptInvite(userId: string, userEmail: string, code: string) {
  const invite = await prisma.storeInvite.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { store: true },
  });

  if (!invite || invite.revokedAt) throw new AppError('Kode undangan tidak ditemukan', 404);
  if (invite.acceptedAt) throw new BadRequestError('Undangan ini sudah pernah dipakai');
  if (invite.expiresAt <= new Date()) throw new BadRequestError('Undangan sudah kedaluwarsa');

  if (invite.email !== userEmail.trim().toLowerCase()) {
    throw new ForbiddenError('Undangan ini ditujukan untuk akun Google lain');
  }

  const sudahAnggota = await prisma.storeMember.findUnique({
    where: { storeId_userId: { storeId: invite.storeId, userId } },
  });
  if (sudahAnggota) {
    await prisma.storeInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    throw new BadRequestError('Anda sudah menjadi anggota toko ini');
  }

  // Batas anggota dicek ulang di sini: undangan bisa saja dibuat saat paket
  // masih longgar, lalu diterima setelah owner turun paket.
  const entitlements = await getOwnerEntitlements(invite.store.userId);
  if (!entitlements?.syncActive) {
    throw new BadRequestError('Langganan pemilik toko sedang tidak aktif. Hubungi pemilik toko.');
  }

  const memberCount = await prisma.storeMember.count({ where: { storeId: invite.storeId } });
  if (entitlements.maxMembers !== null && memberCount >= entitlements.maxMembers) {
    throw new BadRequestError('Kuota anggota toko ini sudah penuh. Hubungi pemilik toko.');
  }

  const member = await prisma.$transaction(async (tx) => {
    const created = await tx.storeMember.create({
      data: {
        storeId: invite.storeId,
        userId,
        role: invite.role,
        permissions: (invite.permissions ?? undefined) as Prisma.InputJsonValue | undefined,
        invitedBy: invite.invitedBy,
      },
      include: { user: true },
    });

    await tx.storeInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

    return created;
  });

  return {
    member: mapMember(member),
    store: { id: invite.store.id, name: invite.store.name },
  };
}

export async function updateMember(
  storeId: string,
  targetUserId: string,
  actorRole: StoreRole,
  input: { role?: StoreRole; permissions?: unknown },
) {
  const member = await prisma.storeMember.findUnique({
    where: { storeId_userId: { storeId, userId: targetUserId } },
  });
  if (!member) throw new AppError('Anggota tidak ditemukan', 404);

  // OWNER adalah penanggung langganan; memindahkannya berarti memindahkan
  // tagihan, dan itu di luar cakupan endpoint ini.
  if (member.role === 'OWNER') throw new BadRequestError('Peran pemilik toko tidak bisa diubah');
  if (input.role === 'OWNER') throw new BadRequestError('Peran OWNER tidak bisa diberikan di sini');

  // ADMIN tidak boleh mengangkat sesama ADMIN — hanya owner yang menentukan
  // siapa yang setara dengannya.
  if (actorRole !== 'OWNER' && (input.role === 'ADMIN' || member.role === 'ADMIN')) {
    throw new ForbiddenError('Hanya pemilik toko yang bisa mengatur admin');
  }

  const updated = await prisma.storeMember.update({
    where: { id: member.id },
    data: {
      role: input.role ?? undefined,
      permissions:
        input.permissions === undefined
          ? undefined
          : (input.permissions as Prisma.InputJsonValue),
    },
    include: { user: true },
  });

  return mapMember(updated);
}

export async function removeMember(storeId: string, targetUserId: string, actorId: string, actorRole: StoreRole) {
  const member = await prisma.storeMember.findUnique({
    where: { storeId_userId: { storeId, userId: targetUserId } },
  });
  if (!member) throw new AppError('Anggota tidak ditemukan', 404);
  if (member.role === 'OWNER') throw new BadRequestError('Pemilik toko tidak bisa dikeluarkan');
  if (actorRole !== 'OWNER' && member.role === 'ADMIN') {
    throw new ForbiddenError('Hanya pemilik toko yang bisa mengeluarkan admin');
  }
  if (member.userId === actorId) throw new BadRequestError('Gunakan menu keluar toko untuk diri sendiri');

  await prisma.storeMember.delete({ where: { id: member.id } });
}

/** Anggota keluar sendiri. Owner tidak boleh — dia harus menghapus tokonya. */
export async function leaveStore(storeId: string, userId: string) {
  const member = await prisma.storeMember.findUnique({
    where: { storeId_userId: { storeId, userId } },
  });
  if (!member) throw new AppError('Toko tidak ditemukan', 404);
  if (member.role === 'OWNER') {
    throw new BadRequestError('Pemilik tidak bisa keluar dari tokonya sendiri');
  }

  await prisma.storeMember.delete({ where: { id: member.id } });
}
