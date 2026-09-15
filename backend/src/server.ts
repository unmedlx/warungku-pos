import '@/lib/net';

import { createApp } from '@/app';
import { config } from '@/config';
import { prisma } from '@/lib/db';
import { ensureBucket } from '@/lib/storage';

async function main() {
  const app = createApp();

  // Pastikan bucket storage siap (otomatis membuat jika belum ada)
  try {
    await ensureBucket();
  } catch (err) {
    console.warn('[WARNING] Storage/MinIO belum tersedia:', (err as Error).message);
  }

  if (config.NODE_ENV === 'production' && !config.PUBLIC_API_URL) {
    console.warn(
      '[WARNING] PUBLIC_API_URL kosong — link unduhan installer disusun dari header Host, ' +
        'yang di belakang reverse proxy bisa menjadi http://localhost/...',
    );
  }

  app.listen(config.PORT, () => {
    console.log(`KanPOS Cloud API berjalan di http://localhost:${config.PORT}`);
  });
}

main().catch(async (err) => {
  console.error('[FATAL]', err);
  await prisma.$disconnect();
  process.exit(1);
});
