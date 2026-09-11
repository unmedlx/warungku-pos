import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3210').transform(Number),
  DATABASE_URL: z.string(),
  /// Boleh berisi beberapa client ID dipisah koma. Aplikasi kasir, dashboard,
  /// dan panel admin bisa memakai client OAuth yang berbeda — token dari
  /// masing-masing tetap harus diterima.
  GOOGLE_CLIENT_ID: z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .refine((ids) => ids.length > 0, 'GOOGLE_CLIENT_ID tidak boleh kosong'),
  STORAGE_TYPE: z
    .string()
    .default('s3')
    .transform((v) => v.toLowerCase())
    .pipe(z.enum(['s3', 'filesystem', 'minio', 'miniio'])),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_USE_SSL: z.string().default('false').transform((v) => v === 'true'),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET: z.string().default('kanpos'),
  PAYMENT_GATEWAY_URL: z.string().optional(),
  PAYMENT_GATEWAY_API_KEY: z.string().optional(),

  // Tripay
  TRIPAY_MODE: z.enum(['sandbox', 'production']).default('sandbox'),
  TRIPAY_MERCHANT_CODE: z.string().default(''),
  TRIPAY_API_KEY: z.string().default(''),
  TRIPAY_PRIVATE_KEY: z.string().default(''),
  TRIPAY_CALLBACK_URL: z.string().default(''),
  TRIPAY_RETURN_URL: z.string().default(''),

  // Vision (scan produk dari foto)
  /// Provider ekstraksi produk dari gambar. Sengaja dibuat pilihan supaya
  /// bisa ditukar tanpa menyentuh service — Gemini dipakai lebih dulu karena
  /// punya free tier untuk memvalidasi fitur sebelum keluar biaya.
  VISION_PROVIDER: z.enum(['gemini', 'disabled']).default('disabled'),
  GEMINI_API_KEY: z.string().default(''),
  /// Model bisa diganti tanpa deploy ulang kode. Nama model Gemini berganti
  /// cukup sering, jadi jangan dikunci di kode.
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  /// Batas foto per sekali proses. Menahan satu request menghabiskan kuota
  /// dan menahan payload tetap di bawah batas inline data provider.
  VISION_MAX_IMAGES: z.string().default('5').transform(Number),
  /// Batas tunggu panggilan ke provider, dalam detik. Tanpa ini satu panggilan
  /// yang menggantung menahan request HTTP selamanya dan aplikasi terkunci di
  /// layar memproses.
  VISION_TIMEOUT_SECONDS: z.string().default('90').transform(Number),
  /// Jatah scan bulanan untuk pengguna tanpa langganan aktif. Paket berbayar
  /// memakai `Plan.aiScanQuota`.
  VISION_FREE_QUOTA: z.string().default('5').transform(Number),
  /// Batas panjang rekaman suara, dalam detik. 60 detik cukup untuk sekitar
  /// delapan produk; lebih dari itu pemilik toko lupa apa saja yang sudah
  /// disebut dan hasilnya justru sulit ditinjau.
  SPEECH_MAX_SECONDS: z.string().default('60').transform(Number),

  JWT_SECRET: z.string().default('change-this-secret'),

  // Panel admin
  /// Email yang otomatis diangkat jadi SUPERADMIN saat login pertama.
  /// Dipakai untuk menyemai admin pertama — selebihnya diangkat dari panel.
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  /// Origin yang boleh memanggil /api/admin/*. Kosong = tolak semua (produksi
  /// tanpa origin terdaftar lebih baik gagal daripada terbuka).
  ADMIN_ORIGIN: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  ADMIN_SESSION_HOURS: z.string().default('8').transform(Number),

  // Sesi aplikasi kasir
  /// Umur access token sesi aplikasi. Dibuat pendek karena murah di-refresh.
  APP_SESSION_HOURS: z.string().default('12').transform(Number),
  /// Umur refresh token. Panjang dengan sengaja: kasir yang dipakai harian
  /// tidak boleh diminta login ulang di tengah jam ramai.
  APP_REFRESH_DAYS: z.string().default('90').transform(Number),
});

export const config = envSchema.parse(process.env);

export const tripayConfig = {
  mode: config.TRIPAY_MODE,
  merchantCode: config.TRIPAY_MERCHANT_CODE,
  apiKey: config.TRIPAY_API_KEY,
  privateKey: config.TRIPAY_PRIVATE_KEY,
  callbackUrl: config.TRIPAY_CALLBACK_URL,
  returnUrl: config.TRIPAY_RETURN_URL,
  baseUrl: config.TRIPAY_MODE === 'production' ? 'https://tripay.co.id/api' : 'https://tripay.co.id/api-sandbox',
};

export const visionConfig = {
  provider: config.VISION_PROVIDER,
  apiKey: config.GEMINI_API_KEY,
  model: config.GEMINI_MODEL,
  maxImages: config.VISION_MAX_IMAGES,
  timeoutMs: config.VISION_TIMEOUT_SECONDS * 1000,
  freeQuota: config.VISION_FREE_QUOTA,
  maxAudioSeconds: config.SPEECH_MAX_SECONDS,
  /// Provider dianggap siap hanya kalau kunci benar-benar ada. Tanpa ini,
  /// fitur menyala di UI lalu gagal di request pertama.
  get enabled() {
    return config.VISION_PROVIDER !== 'disabled' && config.GEMINI_API_KEY.length > 0;
  },
};

export const storageConfig = {
  type: config.STORAGE_TYPE,
  endpoint: config.STORAGE_ENDPOINT,
  useSSL: config.STORAGE_USE_SSL,
  accessKey: config.STORAGE_ACCESS_KEY,
  secretKey: config.STORAGE_SECRET_KEY,
  region: config.STORAGE_REGION,
  bucket: config.STORAGE_BUCKET,
};
