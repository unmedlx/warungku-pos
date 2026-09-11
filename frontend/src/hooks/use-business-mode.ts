import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
  businessModeTraits,
  normalizeBusinessMode,
  type BusinessMode,
  type BusinessModeTraits,
} from '@/lib/business-mode';

/**
 * Jenis usaha aktif beserta afordans yang menyertainya.
 *
 * Selama pengaturan toko belum termuat, `loading` bernilai true dan mode
 * sementara memakai default `retail` — layar kasir tetap bisa dirender tanpa
 * berkedip antar layout.
 */
export function useBusinessMode(): {
  mode: BusinessMode;
  traits: BusinessModeTraits;
  loading: boolean;
} {
  const settings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const mode = normalizeBusinessMode(settings?.businessMode);
  return { mode, traits: businessModeTraits(mode), loading: settings === undefined };
}

/** Simpan pilihan jenis usaha ke pengaturan toko. */
export async function setBusinessMode(mode: BusinessMode): Promise<void> {
  const settings = await db.storeSettings.toCollection().first();
  if (!settings?.id) return;
  await db.storeSettings.update(settings.id, { businessMode: mode });
}
