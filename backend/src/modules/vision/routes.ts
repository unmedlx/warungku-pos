import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '@/middleware/auth';
import { BadRequestError } from '@/lib/error';
import { visionConfig } from '@/config';
import { MAX_TRANSCRIPT_CHARS } from './speech-schema';
import * as service from './service';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Codec rekaman berbeda-beda antar WebView Android dan Electron; yang tersedia
 * di satu perangkat belum tentu ada di perangkat lain. Karena itu daftarnya
 * longgar dan perekam di aplikasi memilih sendiri mana yang didukung.
 */
const ALLOWED_AUDIO_MIME = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/3gpp',
];

/**
 * Foto disimpan di memori dan tidak pernah menyentuh disk atau S3: nota
 * supplier memuat harga beli dan nama pemasok, yang tidak perlu disimpan
 * siapa pun untuk fitur ini bekerja.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: visionConfig.maxImages },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(new BadRequestError('Format foto harus JPG, PNG, atau WebP'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Rekaman jauh lebih kecil dari lima foto, tapi batasnya tetap dipasang: satu
 * berkas 20 MB yang lolos ke provider adalah biaya yang tidak pernah diminta
 * siapa pun.
 */
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Beberapa WebView menyertakan parameter codec, mis. `audio/webm;codecs=opus`.
    const base = file.mimetype.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_AUDIO_MIME.includes(base)) {
      cb(new BadRequestError('Format rekaman tidak didukung'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Batas per pengguna, terpisah dari kuota bulanan. Kuota menjaga biaya;
 * limiter ini menjaga antrean agar satu perangkat yang macet tidak menahan
 * yang lain.
 */
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  // Kunci utamanya id pengguna. `ipKeyGenerator` dipakai untuk jalur cadangan
  // karena alamat IPv6 harus dinormalkan per-subnet — memakai `req.ip` mentah
  // ditolak express-rate-limit v8.
  keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
  message: { error: 'Terlalu banyak permintaan scan. Tunggu sebentar.', code: 'RATE_LIMITED' },
});

export const visionRoutes = Router();

/** Dipanggil aplikasi sebelum menampilkan tombol scan. */
visionRoutes.get('/quota', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quota = await service.getQuota(req.user!.id);
    res.json({
      enabled: service.isEnabled(),
      speechEnabled: service.isSpeechEnabled(),
      transcriptEnabled: service.isTranscriptEnabled(),
      maxImages: visionConfig.maxImages,
      maxAudioSeconds: visionConfig.maxAudioSeconds,
      quota: {
        limit: quota.limit,
        used: quota.used,
        remaining: quota.remaining,
        source: quota.source,
        resetsAt: quota.periodEnd.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

visionRoutes.post(
  '/scan-products',
  authenticate,
  scanLimiter,
  upload.array('images', visionConfig.maxImages),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) throw new BadRequestError('Tidak ada foto yang dikirim');

      const storeId = z.string().min(1).max(64).optional().parse(req.body.storeId || undefined);

      const result = await service.scanProducts(
        req.user!.id,
        files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype })),
        storeId,
      );

      res.json({
        products: result.products,
        unreadableReason: result.unreadableReason,
        quota: {
          limit: result.quota.limit,
          used: result.quota.used,
          remaining: result.quota.remaining,
          source: result.quota.source,
          resetsAt: result.quota.periodEnd.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Katalog toko dikirim aplikasi, bukan diambil dari server.
 *
 * Produk hidup di IndexedDB perangkat dan hanya sebagian pengguna menyalakan
 * sinkron cloud — mengambilnya dari database server akan membuat pencocokan
 * nama bekerja untuk sebagian orang saja, tepat pada fitur yang paling
 * bergantung padanya.
 */
const catalogSchema = z.object({
  productNames: z.array(z.string().max(120)).max(300).default([]),
  units: z.array(z.string().max(40)).max(60).default([]),
  categories: z.array(z.string().max(60)).max(60).default([]),
  businessMode: z.enum(['retail', 'wholesale', 'resto']).default('retail'),
});

visionRoutes.post(
  '/scan-audio',
  authenticate,
  scanLimiter,
  uploadAudio.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) throw new BadRequestError('Tidak ada rekaman yang dikirim');

      const storeId = z.string().min(1).max(64).optional().parse(req.body.storeId || undefined);
      const durationSec = z.coerce
        .number()
        .positive()
        .max(visionConfig.maxAudioSeconds + 2)
        .parse(req.body.durationSec);

      // Katalog yang tidak bisa diurai bukan alasan menggagalkan permintaan —
      // hasilnya cuma jadi kurang pintar mencocokkan nama, dan itu jauh lebih
      // baik daripada pemilik toko kehilangan rekaman yang sudah diucapkan.
      let hints = catalogSchema.parse({});
      if (typeof req.body.catalog === 'string' && req.body.catalog.length > 0) {
        try {
          hints = catalogSchema.parse(JSON.parse(req.body.catalog));
        } catch {
          /* pakai default */
        }
      }

      const result = await service.scanProductsFromAudio(
        req.user!.id,
        { buffer: file.buffer, mimeType: file.mimetype, durationSec },
        hints,
        storeId,
      );

      res.json({
        products: result.products,
        transcript: result.transcript,
        unreadableReason: result.unreadableReason,
        quota: {
          limit: result.quota.limit,
          used: result.quota.used,
          remaining: result.quota.remaining,
          source: result.quota.source,
          resetsAt: result.quota.periodEnd.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Jalur transkrip: pengenalan suara sudah dikerjakan di perangkat.
 *
 * Bukan multipart seperti `/scan-audio` — yang dikirim hanya teks, jadi
 * permintaannya kecil dan bisa lewat body JSON biasa. `scanLimiter` tetap
 * dipasang: panggilan ini murah, tapi murah bukan berarti boleh tak terbatas.
 */
visionRoutes.post(
  '/parse-transcript',
  authenticate,
  scanLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = z
        .object({
          transcript: z.string().min(1).max(MAX_TRANSCRIPT_CHARS),
          storeId: z.string().min(1).max(64).optional(),
          catalog: catalogSchema.optional(),
        })
        .parse(req.body);

      const result = await service.parseProductsFromTranscript(
        req.user!.id,
        body.transcript,
        body.catalog ?? catalogSchema.parse({}),
        body.storeId,
      );

      res.json({
        products: result.products,
        transcript: result.transcript,
        unreadableReason: result.unreadableReason,
        quota: {
          limit: result.quota.limit,
          used: result.quota.used,
          remaining: result.quota.remaining,
          source: result.quota.source,
          resetsAt: result.quota.periodEnd.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
