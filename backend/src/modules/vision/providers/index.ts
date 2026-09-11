import { visionConfig } from '@/config';
import { AppError } from '@/lib/error';
import type { VisionProvider } from '../types';
import { GeminiVisionProvider } from './gemini';

let cached: VisionProvider | null = null;

/**
 * Provider dibuat sekali lalu dipakai ulang — klien SDK menyimpan koneksi,
 * dan membuatnya per request membuang waktu di jalur yang sudah lambat.
 */
export function getVisionProvider(): VisionProvider {
  if (!visionConfig.enabled) {
    throw new AppError('Fitur scan foto belum aktif di server ini', 503, 'VISION_DISABLED');
  }
  if (cached) return cached;

  switch (visionConfig.provider) {
    case 'gemini':
      cached = new GeminiVisionProvider(visionConfig.apiKey);
      return cached;
    default:
      throw new AppError('Provider scan tidak dikenali', 500, 'VISION_PROVIDER_UNKNOWN');
  }
}
