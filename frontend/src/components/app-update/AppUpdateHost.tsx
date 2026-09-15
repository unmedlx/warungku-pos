import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CheckCircle2, Download, RefreshCw, ShieldCheck } from '@/components/icons';
import { Modal, ModalFooter } from '@/components/jokoui/modal';
import { Button } from '@/components/jokoui/button';
import { Badge } from '@/components/jokoui/badge';
import { Progress } from '@/components/jokoui/progress';
import { APP_VERSION } from '@/lib/app-version';
import {
  cancelDownload,
  closeUpdateSheet,
  dismissUpdate,
  downloadUpdate,
  installUpdate,
  openInstallPermission,
  openUpdateSheetWhenIdle,
  setDownloadedHandler,
  startUpdateChecks,
  useUpdateState,
} from '@/lib/app-updater/store';
import type { LatestRelease } from '@/lib/app-updater/platform';

/** Nomor WhatsApp bantuan — sama dengan tombol WhatsApp di landing. */
const WA_BANTUAN = 'https://s.id/wafreekasir';

export function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
}

function barisChangelog(release: LatestRelease) {
  return release.changelog
    .split('\n')
    .map((b) => b.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);
}

function Changelog({ release, className }: { release: LatestRelease; className?: string }) {
  const { t } = useTranslation('settings');
  const baris = barisChangelog(release);
  return (
    <div className={`rounded-xl border border-border bg-background px-3.5 py-3 text-left ${className ?? ''}`}>
      <div className="text-[13px] font-semibold">{t('appUpdate.whatsNew')}</div>
      {baris.length > 0 ? (
        <ul className="mt-1.5 grid list-disc gap-0.5 pl-[18px] text-[13px] text-muted-foreground">
          {baris.slice(0, 6).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[13px] text-muted-foreground">{t('appUpdate.noChangelog')}</p>
      )}
    </div>
  );
}

function IkonJudul({ tone, children }: { tone: 'primary' | 'success' | 'warning'; children: React.ReactNode }) {
  const kelas = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success-text',
    warning: 'bg-warning/10 text-warning-text',
  }[tone];
  return <span className={`grid h-12 w-12 flex-none place-items-center rounded-xl ${kelas}`}>{children}</span>;
}

/** Dialog update opsional (layar 1–3 mockup). */
function UpdateSheet() {
  const { t } = useTranslation('settings');
  const s = useUpdateState();
  const release = s.release;
  if (!release || s.mandatory) return null;

  const persen = s.progress?.total ? Math.round((s.progress.downloaded / s.progress.total) * 100) : 0;
  const galat = s.error && <p className="mt-3 text-[13px] text-destructive-text">{t(`appUpdate.errors.${s.error}`)}</p>;

  let isi: React.ReactNode;
  if (s.needsPermission) {
    isi = (
      <>
        <div className="flex items-center gap-3">
          <IkonJudul tone="warning">
            <ShieldCheck className="h-6 w-6" />
          </IkonJudul>
          <h3 className="text-[17px] font-semibold">{t('appUpdate.permissionTitle')}</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t('appUpdate.permissionBody')}</p>
        <ModalFooter className="grid grid-cols-[1fr_1.4fr] gap-2 sm:flex">
          <Button variant="outline" size="lg" onClick={closeUpdateSheet}>
            {t('appUpdate.notNow')}
          </Button>
          <Button size="lg" onClick={() => void openInstallPermission()}>
            {t('appUpdate.openSettings')}
          </Button>
        </ModalFooter>
      </>
    );
  } else if (s.status === 'downloading') {
    isi = (
      <>
        <div className="flex items-center gap-3">
          <IkonJudul tone="primary">
            <Download className="h-6 w-6" />
          </IkonJudul>
          <div>
            <h3 className="text-[17px] font-semibold">{t('appUpdate.downloadingTitle')}</h3>
            <p className="text-[13px] tabular-nums text-muted-foreground">
              {t('appUpdate.versionOnly', { version: release.versionName })}
            </p>
          </div>
        </div>
        <Progress value={persen} className="mt-4 h-2" />
        <div className="mt-2 flex justify-between text-[13px] tabular-nums">
          <span>
            {t('appUpdate.progress', {
              done: formatMb(s.progress?.downloaded ?? 0),
              total: formatMb(s.progress?.total || release.fileSize),
            })}
          </span>
          <span className="text-muted-foreground">{persen}%</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t('appUpdate.downloadingHint')}</p>
        <ModalFooter className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" size="lg" onClick={() => void cancelDownload()}>
            {t('appUpdate.cancel')}
          </Button>
          <Button variant="outline" size="lg" onClick={closeUpdateSheet}>
            {t('appUpdate.keepSelling')}
          </Button>
        </ModalFooter>
      </>
    );
  } else if (s.status === 'downloaded') {
    isi = (
      <>
        <div className="flex items-center gap-3">
          <IkonJudul tone="success">
            <CheckCircle2 className="h-6 w-6" />
          </IkonJudul>
          <div>
            <h3 className="text-[17px] font-semibold">{t('appUpdate.readyTitle')}</h3>
            <p className="text-[13px] tabular-nums text-muted-foreground">
              {t('appUpdate.versionOnly', { version: release.versionName })}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-xl border border-border bg-background px-3.5 py-3 text-[13px] text-muted-foreground">
          {s.platform === 'windows' ? t('appUpdate.installHintWindows') : t('appUpdate.installHintAndroid')}
        </p>
        {galat}
        <ModalFooter className="grid grid-cols-[1fr_1.4fr] gap-2 sm:flex">
          <Button variant="outline" size="lg" onClick={closeUpdateSheet}>
            {t('appUpdate.notNow')}
          </Button>
          <Button size="lg" onClick={() => void installUpdate()}>
            {s.platform === 'windows' ? t('appUpdate.restartNow') : t('appUpdate.install')}
          </Button>
        </ModalFooter>
      </>
    );
  } else {
    isi = (
      <>
        <div className="flex items-center gap-3">
          <IkonJudul tone="primary">
            <Download className="h-6 w-6" />
          </IkonJudul>
          <div>
            <h3 className="text-[17px] font-semibold">{t('appUpdate.availableTitle')}</h3>
            <p className="text-[13px] tabular-nums text-muted-foreground">
              {t('appUpdate.versionSize', { version: release.versionName, size: formatMb(release.fileSize) })}
            </p>
          </div>
        </div>
        <Changelog release={release} className="mt-3.5" />
        <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-px h-3.5 w-3.5 flex-none" />
          {t('appUpdate.dataSafe', { version: APP_VERSION })}
        </p>
        {galat}
        <ModalFooter className="grid grid-cols-[1fr_1.4fr] gap-2 sm:flex">
          <Button variant="outline" size="lg" onClick={dismissUpdate}>
            {t('appUpdate.later')}
          </Button>
          <Button size="lg" onClick={() => void downloadUpdate()}>
            {t('appUpdate.updateNow')}
          </Button>
        </ModalFooter>
      </>
    );
  }

  return (
    <Modal open={s.sheetOpen} onClose={s.status === 'downloading' ? closeUpdateSheet : dismissUpdate}>
      {isi}
    </Modal>
  );
}

/** Layar penuh update wajib (layar 4 mockup). Tanpa tombol tutup. */
function MandatoryUpdateScreen() {
  const { t } = useTranslation('settings');
  const s = useUpdateState();
  const release = s.release;
  if (!release || !s.mandatory || s.status === 'uptodate') return null;

  const persen = s.progress?.total ? Math.round((s.progress.downloaded / s.progress.total) * 100) : 0;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="judul-update-wajib"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-card px-6 py-8"
      style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
    >
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-warning/10 text-warning-text">
          <RefreshCw className="h-8 w-8" />
        </span>
        <h2 id="judul-update-wajib" className="text-[21px] font-semibold tracking-tight">
          {t('appUpdate.mandatoryTitle')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('appUpdate.mandatoryBody')}</p>

        <div className="mt-4 rounded-xl border border-border bg-background px-3.5 py-3 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold tabular-nums">
              {t('appUpdate.versionOnly', { version: release.versionName })}
            </span>
            <Badge variant="warning">{t('appUpdate.mandatoryBadge')}</Badge>
          </div>
          <ul className="mt-1.5 grid list-disc gap-0.5 pl-[18px] text-[13px] text-muted-foreground">
            {(barisChangelog(release).length ? barisChangelog(release) : [t('appUpdate.noChangelog')])
              .slice(0, 5)
              .map((b) => (
                <li key={b}>{b}</li>
              ))}
          </ul>
        </div>

        {s.needsPermission ? (
          <>
            <p className="mt-4 text-left text-[13px] text-muted-foreground">{t('appUpdate.permissionBody')}</p>
            <Button size="xl" className="mt-3 w-full" onClick={() => void openInstallPermission()}>
              {t('appUpdate.openSettings')}
            </Button>
          </>
        ) : s.status === 'downloading' ? (
          <div className="mt-5 text-left">
            <Progress value={persen} className="h-2" />
            <div className="mt-2 flex justify-between text-[13px] tabular-nums">
              <span>
                {t('appUpdate.progress', {
                  done: formatMb(s.progress?.downloaded ?? 0),
                  total: formatMb(s.progress?.total || release.fileSize),
                })}
              </span>
              <span className="text-muted-foreground">{persen}%</span>
            </div>
          </div>
        ) : s.status === 'downloaded' ? (
          <Button size="xl" className="mt-5 w-full" onClick={() => void installUpdate()}>
            {s.platform === 'windows' ? t('appUpdate.restartNow') : t('appUpdate.install')}
          </Button>
        ) : (
          <Button size="xl" className="mt-5 w-full" onClick={() => void downloadUpdate()}>
            {t('appUpdate.mandatoryButton', { size: formatMb(release.fileSize) })}
          </Button>
        )}

        {s.error && <p className="mt-3 text-[13px] text-destructive-text">{t(`appUpdate.errors.${s.error}`)}</p>}

        <Button
          variant="outline"
          size="lg"
          className="mt-2 w-full text-success-text"
          onClick={() => window.open(WA_BANTUAN, '_blank', 'noopener')}
        >
          {t('appUpdate.needHelp')}
        </Button>
        <p className="mt-3.5 text-xs tabular-nums text-muted-foreground">
          {t('appUpdate.installedVersion', { version: APP_VERSION })}
        </p>
      </div>
    </div>
  );
}

/**
 * Dipasang sekali di App. Memulai pengecekan update dan merender dialog/layar
 * wajibnya. Tidak merender apa pun di web/PWA atau pemasangan dari Play Store.
 */
export default function AppUpdateHost() {
  const { t } = useTranslation('settings');

  useEffect(() => {
    void startUpdateChecks();
    setDownloadedHandler(() => {
      if (window.kanposUpdater) {
        toast.success(t('appUpdate.toastReadyTitle'), {
          description: t('appUpdate.toastReadyBody'),
          duration: Infinity,
          action: { label: t('appUpdate.restartNow'), onClick: () => void installUpdate() },
        });
      } else {
        openUpdateSheetWhenIdle();
      }
    });
    return () => setDownloadedHandler(null);
  }, [t]);

  return (
    <>
      <UpdateSheet />
      <MandatoryUpdateScreen />
    </>
  );
}
