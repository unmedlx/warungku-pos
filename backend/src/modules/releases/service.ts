import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { AppRelease, Prisma, ReleasePlatform } from '@prisma/client';
import { prisma } from '@/lib/db';
import { BadRequestError, NotFoundError } from '@/lib/error';
import { deleteObject, getObjectStream, uploadStream } from '@/lib/storage';

export const PLATFORM_FILE: Record<ReleasePlatform, { ext: string; contentType: string }> = {
  ANDROID: { ext: '.apk', contentType: 'application/vnd.android.package-archive' },
  WINDOWS: { ext: '.exe', contentType: 'application/vnd.microsoft.portable-executable' },
};

/** `android` dari URL → `ANDROID`. Selain dua platform ini dianggap 404. */
export function parsePlatform(raw: string): ReleasePlatform {
  const p = raw.toUpperCase();
  if (p === 'ANDROID' || p === 'WINDOWS') return p;
  throw new NotFoundError('Platform tidak dikenal');
}

function slug(platform: ReleasePlatform) {
  return platform.toLowerCase();
}

/** Bentuk untuk panel admin. */
export function bentukAdmin(r: AppRelease & { uploadedBy?: { name: string } | null }) {
  return {
    id: r.id,
    platform: r.platform,
    versionName: r.versionName,
    versionCode: r.versionCode,
    fileName: r.fileName,
    fileSize: r.fileSize,
    sha256: r.sha256,
    changelog: r.changelog,
    mandatory: r.mandatory,
    published: Boolean(r.publishedAt),
    publishedAt: r.publishedAt?.toISOString() ?? null,
    downloads: r.downloads,
    uploadedBy: r.uploadedBy?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Bentuk publik: tanpa kunci storage dan data pengunggah. */
function bentukPublik(r: AppRelease, baseUrl: string) {
  const platform = slug(r.platform);
  return {
    platform,
    versionName: r.versionName,
    versionCode: r.versionCode,
    fileName: r.fileName,
    fileSize: r.fileSize,
    sha256: r.sha256,
    changelog: r.changelog,
    mandatory: r.mandatory,
    publishedAt: r.publishedAt!.toISOString(),
    downloadUrl: `${baseUrl}/api/releases/download/${platform}/${r.versionCode}`,
  };
}

/* ── Admin ───────────────────────────────────────────────────── */

export async function listReleases() {
  const rows = await prisma.appRelease.findMany({
    include: { uploadedBy: { select: { name: true } } },
    orderBy: [{ platform: 'asc' }, { versionCode: 'desc' }],
  });
  return rows.map(bentukAdmin);
}

export interface ReleaseInput {
  platform: ReleasePlatform;
  versionName: string;
  versionCode: number;
  changelog: string;
  mandatory: boolean;
  publish: boolean;
}

function hashFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

export async function createRelease(
  input: ReleaseInput,
  file: { path: string; size: number; originalname: string },
  uploadedById: string,
) {
  const { ext, contentType } = PLATFORM_FILE[input.platform];
  if (!file.originalname.toLowerCase().endsWith(ext)) {
    throw new BadRequestError(`Installer ${slug(input.platform)} harus berekstensi ${ext}`);
  }

  // Versi yang lebih rendah dari rilis mana pun tidak akan pernah dianggap
  // update oleh aplikasi, jadi ditolak sejak diunggah.
  const tertinggi = await prisma.appRelease.findFirst({
    where: { platform: input.platform },
    orderBy: { versionCode: 'desc' },
  });
  if (tertinggi && input.versionCode <= tertinggi.versionCode) {
    throw new BadRequestError(
      `versionCode harus lebih besar dari ${tertinggi.versionCode} (versi ${tertinggi.versionName})`,
    );
  }

  const sha256 = await hashFile(file.path);
  const fileName = `kankitu-pos-${input.versionName}${ext}`;
  const fileKey = `releases/${slug(input.platform)}/${input.versionCode}-${sha256.slice(0, 12)}${ext}`;

  await uploadStream(fileKey, createReadStream(file.path), file.size, contentType);

  try {
    const row = await prisma.appRelease.create({
      data: {
        platform: input.platform,
        versionName: input.versionName,
        versionCode: input.versionCode,
        fileKey,
        fileName,
        fileSize: file.size,
        sha256,
        changelog: input.changelog,
        mandatory: input.mandatory,
        publishedAt: input.publish ? new Date() : null,
        uploadedById,
      },
      include: { uploadedBy: { select: { name: true } } },
    });
    return bentukAdmin(row);
  } catch (err) {
    // Baris gagal dibuat (mis. versionCode bentrok dari unggahan bersamaan):
    // file yang terlanjur masuk storage dibuang supaya tidak jadi yatim.
    await deleteObject(fileKey).catch(() => undefined);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new BadRequestError('versionCode ini sudah dipakai rilis lain');
    }
    throw err;
  }
}

export async function updateRelease(
  id: string,
  input: { changelog?: string; mandatory?: boolean; published?: boolean },
) {
  const before = await prisma.appRelease.findUnique({ where: { id } });
  if (!before) throw new NotFoundError('Rilis tidak ditemukan');

  const row = await prisma.appRelease.update({
    where: { id },
    data: {
      changelog: input.changelog,
      mandatory: input.mandatory,
      ...(input.published === undefined
        ? {}
        : { publishedAt: input.published ? (before.publishedAt ?? new Date()) : null }),
    },
    include: { uploadedBy: { select: { name: true } } },
  });
  return { before: bentukAdmin(before), after: bentukAdmin(row) };
}

export async function deleteRelease(id: string) {
  const row = await prisma.appRelease.findUnique({ where: { id } });
  if (!row) throw new NotFoundError('Rilis tidak ditemukan');
  await prisma.appRelease.delete({ where: { id } });
  await deleteObject(row.fileKey).catch((err) => {
    console.warn('[releases] File storage gagal dihapus:', row.fileKey, err);
  });
  return bentukAdmin(row);
}

/* ── Publik ──────────────────────────────────────────────────── */

async function findLatest(platform: ReleasePlatform) {
  return prisma.appRelease.findFirst({
    where: { platform, publishedAt: { not: null } },
    orderBy: { versionCode: 'desc' },
  });
}

/**
 * Versi terbaru per platform. Bila `currentCode` dikirim, `mandatory` dihitung
 * dari semua rilis di atas versi pemanggil — melompati satu rilis wajib tetap
 * berarti wajib update, walau rilis terbarunya sendiri tidak wajib.
 */
export async function getLatest(platform: ReleasePlatform, baseUrl: string, currentCode?: number) {
  const latest = await findLatest(platform);
  if (!latest) return null;

  const hasil = bentukPublik(latest, baseUrl);
  if (currentCode === undefined) return hasil;

  const wajib = await prisma.appRelease.count({
    where: {
      platform,
      publishedAt: { not: null },
      mandatory: true,
      versionCode: { gt: currentCode },
    },
  });
  return { ...hasil, updateAvailable: latest.versionCode > currentCode, mandatory: wajib > 0 };
}

/**
 * Rilis terbaru plus beberapa versi terbit sebelumnya, untuk halaman /download.
 * Versi lama tetap bisa diunduh — jalan pulang kalau versi baru bermasalah.
 */
export async function getPlatformSummary(platform: ReleasePlatform, baseUrl: string, previousCount = 2) {
  const rows = await prisma.appRelease.findMany({
    where: { platform, publishedAt: { not: null } },
    orderBy: { versionCode: 'desc' },
    take: previousCount + 1,
  });
  if (rows.length === 0) return null;
  const [latest, ...previous] = rows.map((r) => bentukPublik(r, baseUrl));
  return {
    ...latest,
    previous: previous.map((r) => ({
      versionName: r.versionName,
      versionCode: r.versionCode,
      fileSize: r.fileSize,
      publishedAt: r.publishedAt,
      downloadUrl: r.downloadUrl,
    })),
  };
}

export async function getDownload(platform: ReleasePlatform, versionCode: number | undefined, range?: string) {
  const row =
    versionCode === undefined
      ? await findLatest(platform)
      : await prisma.appRelease.findFirst({
          where: { platform, versionCode, publishedAt: { not: null } },
        });
  if (!row) throw new NotFoundError('Installer belum tersedia');

  const obj = await getObjectStream(row.fileKey, range);

  // Hanya permintaan yang mulai dari byte pertama dihitung, supaya unduhan
  // yang dilanjutkan tidak tercatat berkali-kali.
  if (!range || /^bytes=0-/.test(range)) {
    await prisma.appRelease.update({ where: { id: row.id }, data: { downloads: { increment: 1 } } });
  }

  return { row, obj, contentType: PLATFORM_FILE[platform].contentType };
}
