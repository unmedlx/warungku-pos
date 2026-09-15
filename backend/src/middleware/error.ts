import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/lib/error';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

/**
 * Kegagalan unggahan punya sebab yang bisa diperbaiki sendiri oleh pengguna
 * (foto kebesaran, terlalu banyak foto). Membiarkannya jatuh ke 500 membuat
 * pemilik toko melihat "kesalahan server" untuk masalah yang ada di tangannya.
 */
function multerMessage(err: MulterError): string {
  if (err.field === 'installer') {
    return err.code === 'LIMIT_FILE_SIZE'
      ? 'File installer melebihi batas ukuran unggahan (RELEASE_MAX_MB).'
      : 'File installer gagal diunggah.';
  }
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return 'Ukuran foto terlalu besar. Maksimal 6 MB per foto.';
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_UNEXPECTED_FILE':
      return 'Jumlah foto melebihi batas sekali proses.';
    default:
      return 'Foto gagal diunggah. Coba lagi dengan foto lain.';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  if (err instanceof MulterError) {
    res.status(400).json({ error: multerMessage(err), code: err.code });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({ error: `Validasi gagal: ${message}`, code: 'VALIDATION_ERROR' });
    return;
  }

  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Terjadi kesalahan server', code: 'INTERNAL_ERROR' });
}
