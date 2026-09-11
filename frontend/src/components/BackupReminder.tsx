import { X, Download } from '@/components/icons';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { Button } from '@/components/jokoui/button';
import { db } from '@/lib/db';
import { buildBackupJsonString, backupFileName } from '@/lib/backup';
import { formatDistanceToNow } from 'date-fns';
import { id, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';

const LOCALES: Record<string, Locale> = {
  id,
  en: enUS,
  ms,
};

interface BackupReminderProps {
  lastBackupAt: Date | string | null;
  onDismiss: () => void;
  onBackup: () => void;
}

export default function BackupReminder({ lastBackupAt, onDismiss, onBackup }: BackupReminderProps) {
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? id;

  const timeAgo = lastBackupAt
    ? formatDistanceToNow(lastBackupAt instanceof Date ? lastBackupAt : new Date(lastBackupAt), { addSuffix: true, locale: dateLocale })
    : null;

  return (
    <Alert variant="warning">
      <Download />
      <AlertTitle>{t('backupReminder.title')}</AlertTitle>
      <AlertDescription>
        {lastBackupAt
          ? t('backupReminder.lastBackup', { time: timeAgo })
          : t('backupReminder.neverBackedUp')}
        <div className="mt-2">
          <Button size="sm" variant="outline" onClick={onBackup}>
            <Download />
            {t('backupReminder.backupNow')}
          </Button>
        </div>
      </AlertDescription>
      <AlertAction className="self-start">
        <Button size="icon-sm" variant="ghost" onClick={onDismiss} className="-mr-1.5 -mt-1 h-7 w-7 text-muted-foreground" aria-label="Tutup">
          <X className="h-3.5 w-3.5" />
        </Button>
      </AlertAction>
    </Alert>
  );
}

// Utility to check if backup reminder should show
export function shouldShowBackupReminder(lastBackupAt: Date | string | null): boolean {
  if (!lastBackupAt) return true;
  const date = lastBackupAt instanceof Date ? lastBackupAt : new Date(lastBackupAt);
  const hoursSince = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  return hoursSince >= 24;
}

// Export all data as JSON and trigger download
export async function exportBackupData() {
  const fileName = backupFileName();
  const jsonString = await buildBackupJsonString();

  if (Capacitor.isNativePlatform()) {
    try {
      // Save JSON file in cache directory so we can share it
      const result = await Filesystem.writeFile({
        path: fileName,
        data: jsonString,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      // Share the written file using Android system share dialog
      await Share.share({
        title: 'Backup KanPOS',
        text: 'File backup data KanPOS (JSON)',
        url: result.uri,
        dialogTitle: 'Simpan / Bagikan Backup',
      });

      toast.success('Backup berhasil dibuat!');
    } catch {
      toast.error('Gagal membuat / membagikan file backup');
    }
  } else {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup berhasil diunduh');
  }

  // Update last backup time
  const settings = await db.storeSettings.toCollection().first();
  if (settings?.id) {
    await db.storeSettings.update(settings.id, { lastBackupAt: new Date() });
  }
}
