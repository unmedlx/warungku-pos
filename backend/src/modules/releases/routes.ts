import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '@/config';
import * as service from './service';

export const releaseRoutes = Router();

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan unduhan.', code: 'RATE_LIMITED' },
});

/** Alamat publik API untuk menyusun link unduhan absolut. */
function baseUrl(req: Request) {
  if (config.PUBLIC_API_URL) return config.PUBLIC_API_URL;
  const proto = (req.get('x-forwarded-proto') ?? req.protocol).split(',')[0].trim();
  return `${proto}://${req.get('x-forwarded-host') ?? req.get('host')}`;
}

/**
 * GET /api/releases/latest?platform=android&currentCode=75
 * Dipakai halaman /download (tanpa currentCode) dan cek update di aplikasi.
 */
releaseRoutes.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z
      .object({
        platform: z.string(),
        currentCode: z.coerce.number().int().nonnegative().optional(),
      })
      .parse(req.query);
    const hasil = await service.getLatest(service.parsePlatform(q.platform), baseUrl(req), q.currentCode);
    if (!hasil) {
      res.status(404).json({ error: 'Belum ada rilis untuk platform ini', code: 'NOT_FOUND' });
      return;
    }
    res.set('Cache-Control', 'public, max-age=60');
    res.json(hasil);
  } catch (err) {
    next(err);
  }
});

/** Versi terbaru semua platform sekaligus, untuk halaman /download. */
releaseRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [android, windows] = await Promise.all([
      service.getPlatformSummary('ANDROID', baseUrl(req)),
      service.getPlatformSummary('WINDOWS', baseUrl(req)),
    ]);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ android, windows });
  } catch (err) {
    next(err);
  }
});

async function kirimFile(req: Request, res: Response, next: NextFunction) {
  try {
    const platform = service.parsePlatform(req.params.platform);
    const versionCode = req.params.versionCode
      ? z.coerce.number().int().positive().parse(req.params.versionCode)
      : undefined;
    const range = req.get('range');
    const { row, obj, contentType } = await service.getDownload(platform, versionCode, range);

    res.status(obj.partial ? 206 : 200);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${row.fileName}"`,
      'Accept-Ranges': 'bytes',
      'X-Checksum-SHA256': row.sha256,
      // Link /download/android selalu menunjuk versi terbaru, jadi jangan
      // di-cache lama; link berversi isinya tidak pernah berubah.
      'Cache-Control': versionCode ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (obj.contentLength !== undefined) res.set('Content-Length', String(obj.contentLength));
    if (obj.contentRange) res.set('Content-Range', obj.contentRange);

    obj.body.on('error', (err) => {
      console.error('[releases] Stream unduhan terputus:', err);
      res.destroy(err);
    });
    req.on('close', () => obj.body.destroy());
    obj.body.pipe(res);
  } catch (err) {
    next(err);
  }
}

// Link tetap untuk dibagikan / QR code: selalu versi terbaru.
releaseRoutes.get('/download/:platform', downloadLimiter, kirimFile);
releaseRoutes.get('/download/:platform/:versionCode', downloadLimiter, kirimFile);
