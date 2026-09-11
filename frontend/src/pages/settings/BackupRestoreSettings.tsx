import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Download, Upload } from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { PageHeader } from '@/components/jokoui/page-header';
import { toast } from 'sonner';
import { exportBackupData } from '@/components/BackupReminder';
import { restoreFromBackupData } from '@/lib/backup';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';

const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

export default function BackupRestoreSettings() {
  const { t, i18n } = useTranslation('settings');
  const { can } = useAuth();
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';

  if (!can('manage_backup')) {
    return <LockedPage title={t('backupRestore.locked.title')} permissionLabel={t('backupRestore.locked.permissionLabel')} />;
  }

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        if (!text.trim()) { toast.error(t('backupRestore.emptyFile')); return; }
        const data = JSON.parse(text);
        await restoreFromBackupData(data);
        toast.success(t('backupRestore.restoreSuccess'));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('backupRestore.readError'));
      }
    };
    input.click();
  };

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={Download} title={t('backupRestore.title')} backTo="/settings" />

      <Card>
        <CardContent className="space-y-2">
          <Button size="lg" className="w-full" onClick={exportBackupData}>
            <Download /> {t('backupRestore.exportButton')}
          </Button>
          <Button size="lg" variant="outline" className="w-full" onClick={handleImport}>
            <Upload /> {t('backupRestore.importButton')}
          </Button>
          {storeSettings?.lastBackupAt && (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              {t('backupRestore.lastBackup', { time: new Date(storeSettings.lastBackupAt).toLocaleString(numberLocale) })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
