import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Clock, Info } from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/jokoui/page-header';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { useTranslation } from 'react-i18next';

type Interval = 'off' | 'hourly' | 'daily' | 'weekly';
const DEFAULT_HOURS = 6;

export default function CloudAutoBackupSettings() {
  const { can } = useAuth();
  const { isLoggedIn, isSyncSubscribed } = useCloudAuth();
  const { t } = useTranslation('settings');
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  if (!can('manage_backup')) {
    return <LockedPage title={t('cloudAutoBackup.locked.title')} permissionLabel={t('cloudAutoBackup.locked.permissionLabel')} />;
  }

  const interval: Interval = (storeSettings?.cloudAutoBackupInterval as Interval) ?? 'off';
  const hours = storeSettings?.cloudAutoBackupHours ?? DEFAULT_HOURS;

  const setInterval = async (value: Interval) => {
    if (!storeSettings?.id) return;
    const patch: { cloudAutoBackupInterval: Interval; cloudAutoBackupHours?: number } = { cloudAutoBackupInterval: value };
    if (value === 'hourly' && !storeSettings.cloudAutoBackupHours) patch.cloudAutoBackupHours = DEFAULT_HOURS;
    await db.storeSettings.update(storeSettings.id, patch);
    const resolvedHours = patch.cloudAutoBackupHours ?? hours;
    toast.success(
      value === 'off'
        ? t('cloudAutoBackup.toast.off')
        : value === 'hourly'
          ? t('cloudAutoBackup.toast.hourly', { hours: resolvedHours })
          : value === 'daily'
            ? t('cloudAutoBackup.toast.daily')
            : t('cloudAutoBackup.toast.weekly')
    );
  };

  const saveHours = async (raw: string) => {
    if (!storeSettings?.id) return;
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error(t('cloudAutoBackup.hourMinError'));
      return;
    }
    await db.storeSettings.update(storeSettings.id, { cloudAutoBackupHours: parsed });
  };

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={Clock} title={t('cloudAutoBackup.title')} backTo="/settings/cloud-backup" />

      {!isLoggedIn || !isSyncSubscribed ? (
        <Alert variant="info">
          <Info />
          <AlertTitle>{t('cloudAutoBackup.title')}</AlertTitle>
          <AlertDescription>{t('cloudAutoBackup.requiresSubscription')}</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('cloudAutoBackup.scheduleLabel')}</Label>
              <Select value={interval} onValueChange={(v) => setInterval(v as Interval)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">{t('cloudAutoBackup.interval.off')}</SelectItem>
                  <SelectItem value="hourly">{t('cloudAutoBackup.interval.hourly')}</SelectItem>
                  <SelectItem value="daily">{t('cloudAutoBackup.interval.daily')}</SelectItem>
                  <SelectItem value="weekly">{t('cloudAutoBackup.interval.weekly')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('cloudAutoBackup.scheduleNote')}</p>
            </div>
            {interval === 'hourly' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('cloudAutoBackup.everyHours.prefix')}</span>
                <Input
                  key={hours}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  defaultValue={hours}
                  onBlur={(e) => saveHours(e.target.value)}
                  className="w-20 text-center tabular-nums"
                />
                <span className="text-sm text-muted-foreground">{t('cloudAutoBackup.everyHours.suffix')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
