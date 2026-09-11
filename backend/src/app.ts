import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from '@/middleware/error';
import { routes } from '@/routes';
import { config } from '@/config';
import { ForbiddenError } from '@/lib/error';

/**
 * Daftar origin panel admin. Sengaja menolak kalau kosong: di produksi, gagal
 * lebih baik daripada terbuka untuk semua origin.
 */
function adminOrigin(
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
) {
  // Permintaan tanpa Origin (curl, health check, server-to-server) dibiarkan —
  // yang menjaganya adalah sesi admin, bukan CORS.
  if (!origin) return cb(null, true);
  if (config.ADMIN_ORIGIN.includes(origin)) return cb(null, true);
  cb(new ForbiddenError(`Origin ${origin} tidak diizinkan mengakses panel admin`));
}

export function createApp(): Application {
  const app = express();

  app.use(helmet());

  // Aplikasi kasir berjalan dari Capacitor/Electron dengan origin yang tidak
  // tetap, jadi API pelanggan tetap terbuka seperti sebelumnya. Panel admin
  // berbeda: ia membuka data seluruh pelanggan, jadi hanya boleh dipanggil
  // dari origin yang terdaftar di ADMIN_ORIGIN.
  app.use('/api/admin', cors({ origin: adminOrigin, credentials: true }));
  app.use(cors({ origin: true, credentials: true }));
  // Signature callback Tripay dihitung dari body mentah. Menandatangani ulang
  // hasil `JSON.stringify(req.body)` hanya kebetulan cocok — begitu Tripay
  // mengirim angka desimal atau escape unicode, serialisasi ulang menghasilkan
  // string berbeda dan verifikasi gagal. Jadi raw body disimpan apa adanya.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(morgan('dev'));

  app.use('/api', routes);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint tidak ditemukan', code: 'NOT_FOUND' });
  });

  app.use(errorHandler);

  return app;
}
