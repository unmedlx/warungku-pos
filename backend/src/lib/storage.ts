import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storageConfig } from '@/config';
import { AppError } from './error';

/**
 * URL endpoint storage: nilai STORAGE_ENDPOINT dipakai apa adanya.
 *
 * Satu-satunya normalisasi adalah membuang spasi dan garis miring di ujung.
 * Port, path, dan skema semuanya ditentukan oleh isi env — kode tidak lagi
 * menempelkan STORAGE_PORT sendiri, karena penggabungan otomatis itu yang
 * dulu menghasilkan endpoint tak terduga seperti `host:9000` padahal
 * layanannya ada di port default.
 *
 * Kalau skema belum ditulis, STORAGE_USE_SSL yang menentukan http/https —
 * ini semata supaya nilai lama tanpa skema tetap jalan; sebaiknya tulis URL
 * lengkap di env, mis. `https://storage.contoh.com` atau
 * `https://storage.contoh.com:9000`.
 */
function buildEndpoint(): string {
  const raw = (storageConfig.endpoint ?? '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${storageConfig.useSSL ? 'https' : 'http'}://${raw}`;
}

function buildS3Client(): S3Client {
  return new S3Client({
    region: storageConfig.region,
    endpoint: buildEndpoint(),
    credentials: {
      accessKeyId: storageConfig.accessKey ?? '',
      secretAccessKey: storageConfig.secretKey ?? '',
    },
    forcePathStyle: true,
  });
}

const s3Client = ['s3', 'minio', 'miniio'].includes(storageConfig.type) ? buildS3Client() : null;

/**
 * Ringkasan error S3 untuk log dan pesan. Tanpa ini penyebab aslinya (DNS
 * salah, kredensial ditolak, koneksi ditolak) hilang dan yang sampai ke user
 * cuma "Terjadi kesalahan server".
 */
function describeS3Error(err: unknown): string {
  const anyErr = err as any;
  const code = anyErr?.Code || anyErr?.code || anyErr?.name;
  const status = anyErr?.$metadata?.httpStatusCode;
  const message = anyErr?.message ?? String(err);
  return [code, status && `HTTP ${status}`, message].filter(Boolean).join(' — ');
}

function isBucketMissingError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const anyErr = err as any;
  const code = anyErr.Code || anyErr.code || anyErr.name;
  const status = anyErr.$metadata?.httpStatusCode;
  // 403 sengaja TIDAK dianggap "bucket hilang": itu kredensial/policy ditolak,
  // dan mencoba CreateBucket cuma menutupi penyebab sebenarnya.
  return code === 'NoSuchBucket' || code === 'NotFound' || status === 404;
}

function isAuthError(err: unknown): boolean {
  const anyErr = err as any;
  const code = anyErr?.Code || anyErr?.code || anyErr?.name;
  const status = anyErr?.$metadata?.httpStatusCode;
  return (
    status === 401 ||
    status === 403 ||
    code === 'InvalidAccessKeyId' ||
    code === 'SignatureDoesNotMatch' ||
    code === 'AccessDenied'
  );
}

/**
 * Cek keberadaan bucket lewat ListObjectsV2, bukan HeadBucket.
 *
 * Reverse proxy di depan MinIO ada yang tidak meneruskan metode HEAD dan
 * membalas 403 untuk semua permintaan HEAD — terbaca seolah kredensial
 * ditolak, padahal kunci yang sama sukses untuk GET. ListObjectsV2 dengan
 * MaxKeys 1 memakai GET biasa, murah, dan tetap membedakan bucket yang
 * hilang (NoSuchBucket/404) dari akses yang ditolak (403).
 */
export async function ensureBucket() {
  if (!s3Client) return;
  try {
    await s3Client.send(new ListObjectsV2Command({ Bucket: storageConfig.bucket, MaxKeys: 1 }));
  } catch (err) {
    if (!isBucketMissingError(err)) {
      console.error('[storage] Cek bucket gagal:', { bucket: storageConfig.bucket, endpoint: buildEndpoint() }, err);
      if (isAuthError(err)) {
        throw new AppError(
          `Akses ke bucket ${storageConfig.bucket} ditolak — periksa STORAGE_ACCESS_KEY/STORAGE_SECRET_KEY (${describeS3Error(err)})`,
          403,
          'STORAGE_AUTH_ERROR',
        );
      }
      throw new AppError(
        `Bucket ${storageConfig.bucket} tidak bisa diakses di ${buildEndpoint()} (${describeS3Error(err)})`,
        500,
        'STORAGE_UNAVAILABLE',
      );
    }

    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: storageConfig.bucket }));
    } catch (createErr) {
      const anyErr = createErr as any;
      const code = anyErr?.Code || anyErr?.name;
      if (code === 'BucketAlreadyExists' || code === 'BucketAlreadyOwnedByYou') {
        return;
      }
      console.error('[storage] CreateBucket gagal:', { bucket: storageConfig.bucket, endpoint: buildEndpoint() }, createErr);
      if (isAuthError(createErr)) {
        throw new AppError(
          `Akses storage ditolak — periksa STORAGE_ACCESS_KEY dan STORAGE_SECRET_KEY (${describeS3Error(createErr)})`,
          403,
          'STORAGE_AUTH_ERROR',
        );
      }
      throw new AppError(`Gagal membuat bucket ${storageConfig.bucket} (${describeS3Error(createErr)})`, 500, 'STORAGE_UNAVAILABLE');
    }
  }
}

export function getPublicObjectUrl(key: string): string {
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${buildEndpoint()}/${storageConfig.bucket}/${encodedKey}`;
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string) {
  if (!s3Client) throw new AppError('Storage S3 tidak dikonfigurasi', 500);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: storageConfig.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  } catch (err) {
    // Error mentah dari SDK bukan AppError, jadi tanpa pembungkus ini user
    // cuma melihat 500 "Terjadi kesalahan server" tanpa petunjuk apa pun.
    console.error('[storage] PutObject gagal:', { key, bucket: storageConfig.bucket, endpoint: buildEndpoint() }, err);
    throw new AppError(`Gagal menyimpan file ke storage (${describeS3Error(err)})`, 502, 'STORAGE_UNAVAILABLE');
  }

  return key;
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  if (!s3Client) throw new AppError('Storage S3 tidak dikonfigurasi', 500);
  const res = await s3Client.send(
    new GetObjectCommand({ Bucket: storageConfig.bucket, Key: key }),
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new AppError('File tidak ditemukan', 404);
  return Buffer.from(bytes);
}

export async function deleteObject(key: string) {
  if (!s3Client) throw new AppError('Storage S3 tidak dikonfigurasi', 500);
  await s3Client.send(new DeleteObjectCommand({ Bucket: storageConfig.bucket, Key: key }));
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  if (!s3Client) throw new AppError('Storage S3 tidak dikonfigurasi', 500);
  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: storageConfig.bucket, Key: key }),
    { expiresIn },
  );
  return url;
}
