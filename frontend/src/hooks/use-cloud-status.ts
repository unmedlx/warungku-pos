import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { useTranslation } from 'react-i18next';
import type { StatusTone } from '@/components/settings/StatusStrip';

export interface CloudStatus {
  tone: StatusTone;
  badge: string;
  /** Kalimat panjang untuk halaman Cloud. */
  description: string;
  /** Satu kalimat untuk strip status di hub — agar strip tetap ringkas. */
  shortDescription: string;
  meta?: string;
  /** True selama masih ada langkah yang harus diselesaikan pemilik. */
  needsAttention: boolean;
}

/**
 * Status KanPOS Cloud dalam satu bentuk, dipakai strip di hub Pengaturan dan
 * sub-halaman Data & Backup — supaya keduanya tidak pernah bercerita beda.
 */
export function useCloudStatus(): CloudStatus {
  const { t } = useTranslation('settings');
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const { isLoggedIn, isSyncSubscribed } = useCloudAuth();

  const autoOn = (storeSettings?.cloudAutoBackupInterval ?? 'off') !== 'off';
  const storeLinked = !!storeSettings?.cloudStoreId;

  if (!(isLoggedIn && isSyncSubscribed)) {
    return {
      tone: 'danger',
      badge: t('cloudSync.status.inactive'),
      description: t('cloudSync.desc.inactive'),
      shortDescription: t('cloudSync.short.inactive'),
      needsAttention: true,
    };
  }
  if (!storeLinked) {
    return {
      tone: 'warn',
      badge: t('cloudSync.status.selectStore'),
      description: t('cloudSync.desc.selectStore'),
      shortDescription: t('cloudSync.short.selectStore'),
      needsAttention: true,
    };
  }
  if (!autoOn) {
    return {
      tone: 'warn',
      badge: t('cloudSync.status.needsSetup'),
      description: t('cloudSync.desc.needsSetup'),
      shortDescription: t('cloudSync.short.needsSetup'),
      needsAttention: true,
    };
  }
  return {
    tone: 'ok',
    badge: t('cloudSync.status.active'),
    description: t('cloudSync.desc.active'),
    shortDescription: t('cloudSync.short.active'),
    meta: storeSettings?.lastCloudBackupAt
      ? t('cloudSync.lastSync', { time: new Date(storeSettings.lastCloudBackupAt).toLocaleString('id-ID') })
      : t('cloudSync.neverSynced'),
    needsAttention: false,
  };
}
