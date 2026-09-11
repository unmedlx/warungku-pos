import { uploadBuffer, deleteObject, getSignedDownloadUrl } from '@/lib/storage';
import { AppError, BadRequestError, NotFoundError } from '@/lib/error';

export async function uploadFile(userId: string, file: Express.Multer.File, prefix = 'uploads') {
  const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const key = `${prefix}/${userId}/${Date.now()}-${safeName}`;

  await uploadBuffer(key, file.buffer, file.mimetype);

  const url = await getSignedDownloadUrl(key, 3600);

  return { key, url };
}

/**
 * Setiap key yang ditulis backend berbentuk `{prefix}/{userId}/{berkas}` —
 * lihat `uploadFile` di atas dan `uploadBackup` di modul backups. Tanpa
 * pemeriksaan ini, key adalah masukan mentah dari klien: siapa pun yang login
 * bisa menandatangani unduhan atau menghapus berkas milik akun lain hanya
 * dengan menyusun key-nya sendiri.
 */
function assertOwnsKey(key: string, userId: string) {
  if (!key) throw new BadRequestError('Key file diperlukan');
  const segments = key.split('/');
  if (segments.length < 3 || segments[1] !== userId) {
    // Sengaja 404, bukan 403: jangan bocorkan bahwa berkas itu ada.
    throw new NotFoundError('File tidak ditemukan');
  }
}

export async function getSignedFileUrl(key: string, userId: string, expiresIn = 3600) {
  assertOwnsKey(key, userId);
  const url = await getSignedDownloadUrl(key, expiresIn);
  return { key, url, expiresIn };
}

export async function removeFile(key: string, userId: string) {
  assertOwnsKey(key, userId);
  await deleteObject(key);
}
