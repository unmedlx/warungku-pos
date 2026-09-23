import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, Info, RefreshCw } from '@/components/icons';
import { SettingsItem } from '@/components/jokoui/settings-group';
import { Badge } from '@/components/jokoui/badge';
import { Button } from '@/components/jokoui/button';
import { TONE_CLASS } from '@/components/settings/SettingsTile';
import { APP_VERSION } from '@/lib/app-version';
import { checkForUpdate, installUpdate, openUpdateSheet, useUpdateState } from '@/lib/app-updater/store';
import { formatMb } from './AppUpdateHost';

function Ikon({ icon: Icon, tone }: { icon: typeof Info; tone: 'gray' | 'primary' | 'success' }) {
  const kelas =
    tone === 'primary' ? 'bg-primary/10 text-primary' : tone === 'success' ? 'bg-success/10 text-success-text' : TONE_CLASS.gray;
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kelas}`}>
      <Icon className="size-4.5" />
    </div>
  );
}

function sejak(ts: number, lang: string) {
  const menit = Math.round((Date.now() - ts) / 60000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (menit < 60) return rtf.format(-menit, 'minute');
  if (menit < 60 * 24) return rtf.format(-Math.round(menit / 60), 'hour');
  return rtf.format(-Math.round(menit / 1440), 'day');
}

/**
 * Baris "Versi aplikasi" + aksi update di Pengaturan › Aplikasi (layar 5
 * mockup). Tidak tampil di web/PWA dan pemasangan Play Store.
 */
export default function AppUpdateRows() {
  const { t, i18n } = useTranslation('settings');
  const s = useUpdateState();
  if (s.status === 'unsupported' || !s.platform) return null;

  const r = s.release;
  const adaUpdate = r && ['available', 'downloading', 'downloaded'].includes(s.status);
  const persen = s.progress?.total ? Math.round((s.progress.downloaded / s.progress.total) * 100) : 0;

  return (
    <>
      <SettingsItem
        icon={<Ikon icon={Info} tone="gray" />}
        label={t('appUpdate.rowTitle')}
        description={
          s.lastChecked && !adaUpdate
            ? `${APP_VERSION} · ${t('appUpdate.checkedAgo', { time: sejak(s.lastChecked, i18n.language) })}`
            : APP_VERSION
        }
        trailing={
          s.status === 'downloaded' ? (
            <Badge variant="success">{t('appUpdate.rowReady')}</Badge>
          ) : adaUpdate ? (
            <Badge variant="primary">{t('appUpdate.rowAvailable')}</Badge>
          ) : s.status === 'uptodate' ? (
            <Badge variant="success">{t('appUpdate.rowUpToDate')}</Badge>
          ) : undefined
        }
      />

      {adaUpdate && r ? (
        s.status === 'downloaded' ? (
          <SettingsItem
            icon={<Ikon icon={CheckCircle2} tone="success" />}
            label={t('appUpdate.rowReadyTitle')}
            description={t('appUpdate.versionOnly', { version: r.versionName })}
            trailing={
              <Button size="sm" onClick={() => void installUpdate()}>
                {s.platform === 'windows' ? t('appUpdate.restartNow') : t('appUpdate.install')}
              </Button>
            }
          />
        ) : (
          <SettingsItem
            icon={<Ikon icon={Download} tone="primary" />}
            label={t('appUpdate.rowAvailableTitle', { version: r.versionName })}
            description={
              s.status === 'downloading'
                ? t('appUpdate.rowDownloading', { percent: persen })
                : formatMb(r.fileSize)
            }
            trailing={
              <Button size="sm" onClick={openUpdateSheet}>
                {t('appUpdate.update')}
              </Button>
            }
          />
        )
      ) : (
        <SettingsItem
          icon={<Ikon icon={RefreshCw} tone="gray" />}
          label={t('appUpdate.checkTitle')}
          description={
            s.error
              ? t(`appUpdate.errors.${s.error}`)
              : s.lastChecked
                ? t('appUpdate.checkedAgo', { time: sejak(s.lastChecked, i18n.language) })
                : t('appUpdate.neverChecked')
          }
          trailing={
            <Button
              variant="outline"
              size="sm"
              disabled={s.status === 'checking'}
              onClick={() => void checkForUpdate({ manual: true })}
            >
              {s.status === 'checking' ? t('appUpdate.checking') : t('appUpdate.check')}
            </Button>
          }
        />
      )}
    </>
  );
}
