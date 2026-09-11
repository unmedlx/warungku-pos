import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DownloadCloud, Info, Loader2, Trash2 } from '@/components/icons';
import { Card } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/jokoui/item';
import { PageHeader } from '@/components/jokoui/page-header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, type Locale } from 'date-fns';
import { id as idLocale, enUS, ms } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { listBackups, downloadBackup, deleteBackup, type CloudBackup } from '@/lib/cloud-api';
import { restoreFromBackupData } from '@/lib/backup';

const PAGE_SIZE = 10;
const LOCALES: Record<string, Locale> = { id: idLocale, en: enUS, ms };

const fmtSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

/**
 * Pulihkan data dari cadangan yang tersimpan di cloud.
 *
 * Sebelumnya halaman Cadangan Cloud hanya bisa mengunggah; padahal alasan orang
 * mencadangkan adalah supaya bisa dipulihkan. Halaman ini menutup celah itu.
 */
export default function CloudRestoreSettings() {
  const { can } = useAuth();
  const { isLoggedIn, refreshProfile } = useCloudAuth();
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? idLocale;

  const [items, setItems] = useState<CloudBackup[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<CloudBackup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CloudBackup | null>(null);

  const load = useCallback(async (p: number, append: boolean) => {
    setLoading(true);
    try {
      const { items: rows, pagination } = await listBackups({ page: p, limit: PAGE_SIZE });
      setItems((prev) => (append ? [...prev, ...rows] : rows));
      setPage(pagination.page);
      setHasMore(pagination.hasMore);
    } catch {
      /* diabaikan — daftar kosong ditampilkan sebagai empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) load(1, false);
  }, [isLoggedIn, load]);

  if (!can('manage_backup')) {
    return <LockedPage title={t('cloudRestore.locked.title')} permissionLabel={t('cloudRestore.locked.permissionLabel')} />;
  }

  const label = (b: CloudBackup) => format(new Date(b.createdAt), 'dd MMM yyyy, HH:mm', { locale: dateLocale });

  const handleRestore = async (backup: CloudBackup) => {
    setBusy(`restore:${backup.id}`);
    try {
      const data = await downloadBackup(backup.id);
      await restoreFromBackupData(data);
      setConfirmRestore(null);
      toast.success(t('cloudRestore.toast.restored'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudRestore.toast.restoreFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (backup: CloudBackup) => {
    setBusy(`delete:${backup.id}`);
    try {
      await deleteBackup(backup.id);
      setConfirmDelete(null);
      await load(1, false);
      await refreshProfile();
      toast.success(t('cloudRestore.toast.deleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudRestore.toast.deleteFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page-container space-y-3">
      <PageHeader icon={DownloadCloud} title={t('cloudRestore.title')} backTo="/settings/cloud-backup" />

      {!isLoggedIn ? (
        <Alert variant="info">
          <Info />
          <AlertTitle>{t('cloudRestore.title')}</AlertTitle>
          <AlertDescription>{t('cloudRestore.requiresLogin')}</AlertDescription>
        </Alert>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{t('cloudRestore.description')}</p>

          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <Card>
              <EmptyState icon={DownloadCloud} title={t('cloudRestore.empty')} />
            </Card>
          ) : (
            <Card className="divide-y divide-border overflow-hidden">
              {items.map((b) => (
                <Item key={b.id} variant="flat">
                  <ItemMedia tone="success"><DownloadCloud /></ItemMedia>
                  <ItemContent>
                    <ItemTitle>{label(b)}</ItemTitle>
                    <ItemDescription>{fmtSize(b.fileSize)} · {b.fileName}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button size="sm" variant="outline" onClick={() => setConfirmRestore(b)}>
                      {t('cloudRestore.restore')}
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="text-muted-foreground" onClick={() => setConfirmDelete(b)} aria-label={t('cloudRestore.deleteAction')}>
                      <Trash2 />
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </Card>
          )}

          {hasMore && (
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => load(page + 1, true)}>
              {loading ? <Loader2 className="animate-spin" /> : t('cloudRestore.loadMore')}
            </Button>
          )}
        </>
      )}

      <Dialog open={!!confirmRestore} onOpenChange={(o) => !o && setConfirmRestore(null)}>
        <DialogContent className="max-w-[88vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('cloudRestore.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('cloudRestore.confirmDesc', { time: confirmRestore ? label(confirmRestore) : '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button size="lg" className="w-full" disabled={!!busy} onClick={() => confirmRestore && handleRestore(confirmRestore)}>
              {busy?.startsWith('restore') ? <Loader2 className="animate-spin" /> : <DownloadCloud />}
              {t('cloudRestore.confirmAction')}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setConfirmRestore(null)}>
              {t('cloudRestore.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-[88vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('cloudRestore.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('cloudRestore.deleteConfirmDesc', { time: confirmDelete ? label(confirmDelete) : '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button variant="destructive" size="lg" className="w-full" disabled={!!busy} onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              {busy?.startsWith('delete') ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {t('cloudRestore.deleteAction')}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setConfirmDelete(null)}>
              {t('cloudRestore.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
