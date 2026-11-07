import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';

import { NewsCard } from '@/components/jokoui/news-card';
// OFFLINE MODE: SessionExpiredBanner disabled
// import { SessionExpiredBanner, useSessionExpiredVisible } from '@/components/SessionExpiredBanner';
import { SetupChecklist, useSetupChecklistVisible } from '@/components/SetupChecklist';
// OFFLINE MODE: LinkAccountCard disabled
// import { LinkAccountCard, useLinkAccountVisible } from '@/components/LinkAccountCard';
import { InstallBanner, useInstallBannerVisible } from '@/components/InstallBanner';
import { shouldShowBackupReminder, exportBackupData } from '@/components/BackupReminder';
import { pickInterrupt } from '@/lib/home-interrupts';

interface HomeInterruptProps {
  /** Waktu backup terakhir; `null`/undefined = belum pernah. */
  lastBackupAt?: Date | string | null;
  /** Izin `manage_backup` — tanpa ini pengingat backup tidak relevan. */
  canBackup: boolean;
  /** Menunggu storeSettings termuat; selama true pengingat backup ditahan. */
  settingsLoaded: boolean;
  dateLocale: Locale;
}

/**
 * Merender **paling banyak satu** ajakan di Beranda.
 *
 * Kelima kartu ini masing-masing punya alasan kuat untuk ada, tapi di hari
 * pertama sebuah toko kelimanya bisa benar sekaligus — dan angka penjualan
 * hari ini, alasan orang membuka aplikasi, terdorong jauh ke bawah lipatan.
 * Urutan prioritasnya ada di `lib/home-interrupts`; komponen ini cuma
 * menanyakan "siapa yang layak" lalu merender pemenangnya.
 *
 * Yang kalah tidak hilang, hanya menunggu giliran: begitu yang di atasnya
 * ditutup atau selesai, yang berikutnya muncul pada render itu juga (store
 * dismiss-nya reaktif).
 */
export function HomeInterrupt({ lastBackupAt, canBackup, settingsLoaded, dateLocale }: HomeInterruptProps) {
  const { t } = useTranslation('dashboard');
  // Pengingat backup sengaja tidak persisten: ditutup hari ini, boleh
  // menagih lagi besok. Backup yang tertunda berhari-hari itu justru
  // masalah yang perlu diulang-ulang.
  const [backupDismissed, setBackupDismissed] = useState(false);

  const visible = {
    // OFFLINE MODE: Session expired disabled
    // 'session-expired': useSessionExpiredVisible(),
    setup: useSetupChecklistVisible(),
    // OFFLINE MODE: Link account disabled
    // 'link-account': useLinkAccountVisible(),
    backup: settingsLoaded && canBackup && !backupDismissed && shouldShowBackupReminder(lastBackupAt ?? null),
    install: useInstallBannerVisible(),
  };

  switch (pickInterrupt(visible)) {
    // OFFLINE MODE: Session expired disabled
    // case 'session-expired':
    //   return <SessionExpiredBanner />;
    case 'setup':
      return <SetupChecklist />;
    // OFFLINE MODE: Link account disabled
    // case 'link-account':
    //   return <LinkAccountCard />;
    case 'backup':
      return (
        <NewsCard
          title={t('backupReminder.title', { ns: 'settings' })}
          description={
            lastBackupAt
              ? t('backupReminder.lastBackup', {
                  ns: 'settings',
                  time: formatDistanceToNow(new Date(lastBackupAt), { addSuffix: true, locale: dateLocale }),
                })
              : t('backupReminder.neverBackedUp', { ns: 'settings' })
          }
          ctaLabel={t('backupReminder.backupNow', { ns: 'settings' })}
          onCtaClick={() => {
            void exportBackupData();
          }}
          onDismiss={() => setBackupDismissed(true)}
        />
      );
    case 'install':
      return <InstallBanner />;
    default:
      return null;
  }
}
