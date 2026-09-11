import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Link } from 'react-router-dom';
import {
  Store,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Link2,
  Package,
  ShoppingCart,
  HardDrive,
  AlertTriangle,
  Info,
} from '@/components/icons';
import { Card, CardContent } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Badge } from '@/components/jokoui/badge';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/jokoui/alert';
import { EmptyState } from '@/components/jokoui/empty-state';
import { SectionTitle } from '@/components/jokoui/section-title';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/jokoui/item';
import { PageHeader } from '@/components/jokoui/page-header';
import { Input } from '@/components/jokoui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useCloudAuth } from '@/hooks/use-cloud-auth';
import { useTranslation } from 'react-i18next';
import {
  fetchStores,
  createStore,
  renameStore,
  deleteStore,
  type CloudStore,
} from '@/lib/cloud-api';

const LOCALES: Record<string, Locale> = { id: idLocale, en: enUS, ms };

export default function CloudStoreSettings() {
  const { can } = useAuth();
  const { isLoggedIn, isSyncSubscribed, profile } = useCloudAuth();
  const { t, i18n } = useTranslation('settings');
  const dateLocale = LOCALES[i18n.language] ?? idLocale;
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());

  // Batas jumlah toko sesuai paket sync aktif.
  const maxStores = profile?.user?.maxStores ?? profile?.syncSubscription?.plan?.maxStores ?? null;
  const isUnlimited = maxStores != null && maxStores >= 999999;

  const [stores, setStores] = useState<CloudStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeStoreId = storeSettings?.cloudStoreId ?? null;

  // Toko milik sendiri vs toko tempat kita hanya diundang. Batas paket hanya
  // menghitung yang pertama — kuota adalah milik pemilik masing-masing toko.
  const tokoSendiri = stores.filter((s) => s.role == null || s.role === 'OWNER');
  const tokoGabungan = stores.filter((s) => s.role != null && s.role !== 'OWNER');
  const atLimit = maxStores != null && !isUnlimited && tokoSendiri.length >= maxStores;

  /**
   * Karyawan tidak punya langganan sendiri, jadi gerbang `isSyncSubscribed`
   * akan mengunci mereka keluar dari halaman ini. Selama mereka anggota
   * setidaknya satu toko, halaman tetap dibuka — hak sync-nya sudah ditanggung
   * pemilik toko dan diverifikasi ulang di server.
   */
  const bolehPakai = isSyncSubscribed || tokoGabungan.length > 0;

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      setStores(await fetchStores());
    } catch {
      /* diabaikan */
    } finally {
      setLoading(false);
    }
  }, []);

  // Dimuat begitu login, tanpa menunggu status langganan: daftar ini juga
  // memuat toko orang lain tempat user diundang.
  useEffect(() => {
    if (isLoggedIn) loadStores();
  }, [isLoggedIn, loadStores]);

  // Auto-show create form jika belum ada toko (dan masih dalam batas paket)
  useEffect(() => {
    if (!loading && stores.length === 0 && isSyncSubscribed && !atLimit) {
      setShowCreate(true);
      setNewName(storeSettings?.storeName ?? '');
    }
  }, [loading, stores.length, isSyncSubscribed, atLimit, storeSettings?.storeName]);

  if (!can('manage_backup')) {
    return <LockedPage title={t('cloudStore.locked.title')} permissionLabel={t('cloudStore.locked.permissionLabel')} />;
  }

  const handleBind = async (storeId: string) => {
    if (!storeSettings?.id) return;
    await db.storeSettings.update(storeSettings.id, { cloudStoreId: storeId });
    toast.success(t('cloudStore.toast.bind'));
  };

  const handleUnbind = async () => {
    if (!storeSettings?.id) return;
    await db.storeSettings.update(storeSettings.id, { cloudStoreId: null });
    toast.success(t('cloudStore.toast.unbind'));
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    if (atLimit) {
      toast.error(t('cloudStore.toast.atLimit'));
      return;
    }
    setBusy('create');
    try {
      const store = await createStore(name);
      setStores((prev) => [...prev, store]);
      setShowCreate(false);
      setNewName('');
      // Auto-bind jika ini toko pertama
      if (stores.length === 0 && storeSettings?.id) {
        await db.storeSettings.update(storeSettings.id, { cloudStoreId: store.id });
        toast.success(t('cloudStore.toast.createBound'));
      } else {
        toast.success(t('cloudStore.toast.create'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudStore.toast.createFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setBusy(`rename:${id}`);
    try {
      const updated = await renameStore(id, name);
      setStores((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
      setEditName('');
      toast.success(t('cloudStore.toast.rename'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudStore.toast.renameFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(`delete:${id}`);
    try {
      await deleteStore(id);
      setStores((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
      // Unbind jika toko yang dihapus adalah toko aktif
      if (activeStoreId === id && storeSettings?.id) {
        await db.storeSettings.update(storeSettings.id, { cloudStoreId: null });
      }
      toast.success(t('cloudStore.toast.delete'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cloudStore.toast.deleteFailed'));
    } finally {
      setBusy(null);
    }
  };

  const activeStoreName = stores.find((s) => s.id === activeStoreId)?.name ?? t('cloudStore.loading');

  return (
    <div className="page-container space-y-4">
      <PageHeader icon={Store} title={t('cloudStore.title')} backTo="/settings/cloud-backup">
        {isLoggedIn && bolehPakai && !atLimit && isSyncSubscribed && (
          <Button size="default" onClick={() => { setShowCreate(true); setNewName(''); }}>
            <Plus /> {t('cloudStore.addButton')}
          </Button>
        )}
      </PageHeader>

      {!isLoggedIn || !bolehPakai ? (
        <Alert variant="info">
          <Info />
          <AlertTitle>{t('cloudStore.title')}</AlertTitle>
          <AlertDescription>{t('cloudStore.requiresSubscription')}</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Toko yang terhubung ke perangkat ini */}
          {activeStoreId && (
            <Alert variant="success">
              <Link2 />
              <AlertTitle>{activeStoreName}</AlertTitle>
              <AlertDescription>
                {t('cloudStore.activeDevice')} · {t('cloudStore.syncActive')}
              </AlertDescription>
              <AlertAction>
                <Button variant="outline" size="sm" onClick={handleUnbind}>
                  {t('cloudStore.disconnect')}
                </Button>
              </AlertAction>
            </Alert>
          )}

          {atLimit && (
            <Alert variant="warning">
              <AlertTriangle />
              <AlertTitle>{t('cloudStore.atLimit.title')}</AlertTitle>
              <AlertDescription>{t('cloudStore.atLimit.description', { max: maxStores })}</AlertDescription>
              <AlertAction>
                <Button asChild size="sm" variant="outline">
                  <Link to="/settings/cloud-backup">{t('cloudStore.atLimit.upgrade')}</Link>
                </Button>
              </AlertAction>
            </Alert>
          )}

          <section>
            <SectionTitle
              title={t('cloudStore.storeList')}
              description={
                maxStores != null
                  ? t('cloudStore.used', {
                      used: tokoSendiri.length,
                      max: isUnlimited ? t('cloudStore.unlimited') : `${maxStores} ${t('cloudStore.stats.stores')}`,
                    })
                  : undefined
              }
            />

            {loading && stores.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : stores.length === 0 && !showCreate ? (
              <Card>
                <EmptyState icon={Store} title={t('cloudStore.noStore')} />
              </Card>
            ) : (
              <ItemGroup>
                {stores.map((store) => {
                  const isBound = store.id === activeStoreId;
                  const isEditing = editingId === store.id;
                  const isDeleting = confirmDeleteId === store.id;
                  const counts = store._count;

                  return (
                    <Card key={store.id} className={cn('space-y-3 p-3', isBound && 'border-primary/40 bg-primary/5')}>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename(store.id)}
                            autoFocus
                          />
                          <Button
                            disabled={!editName.trim() || busy === `rename:${store.id}`}
                            onClick={() => handleRename(store.id)}
                          >
                            {busy === `rename:${store.id}` ? <Loader2 className="animate-spin" /> : t('cloudStore.save')}
                          </Button>
                          <Button variant="outline" onClick={() => setEditingId(null)}>
                            {t('cloudStore.cancel')}
                          </Button>
                        </div>
                      ) : isDeleting ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-destructive-text">
                            {t('cloudStore.deleteConfirm', { name: store.name })}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busy === `delete:${store.id}`}
                              onClick={() => handleDelete(store.id)}
                            >
                              {busy === `delete:${store.id}` ? <Loader2 className="animate-spin" /> : t('cloudStore.yesDelete')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmDeleteId(null)}>
                              {t('cloudStore.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Item variant="flat" className="p-0">
                            <ItemMedia tone={isBound ? 'primary' : 'muted'}><Store /></ItemMedia>
                            <ItemContent>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <ItemTitle>{store.name}</ItemTitle>
                                {isBound && <Badge size="sm" variant="success">{t('cloudStore.syncActive')}</Badge>}
                                {store.role != null && store.role !== 'OWNER' && (
                                  <Badge size="sm" variant="secondary">{t(`cloudMembers.role.${store.role}`)}</Badge>
                                )}
                              </div>
                              <ItemDescription>
                                {t('cloudStore.created', { date: format(new Date(store.createdAt), 'dd MMM yyyy', { locale: dateLocale }) })}
                              </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                              {!isBound && (
                                <Button variant="outline" size="sm" onClick={() => handleBind(store.id)}>
                                  <Link2 /> {t('cloudStore.connect')}
                                </Button>
                              )}
                              {/* Ubah nama & hapus hanya untuk toko sendiri —
                                  server juga menolaknya untuk anggota biasa. */}
                              {store.role !== 'STAFF' && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => { setEditingId(store.id); setEditName(store.name); }}
                                  aria-label={t('cloudStore.save')}
                                >
                                  <Pencil />
                                </Button>
                              )}
                              {(store.role == null || store.role === 'OWNER') && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive-text"
                                  onClick={() => setConfirmDeleteId(store.id)}
                                  aria-label={t('cloudStore.yesDelete')}
                                >
                                  <Trash2 />
                                </Button>
                              )}
                            </ItemActions>
                          </Item>
                          {counts && (
                            <div className="flex flex-wrap gap-1.5">
                              <Badge size="sm" variant="outline"><Package className="h-3 w-3" />{counts.products} {t('cloudStore.stats.products')}</Badge>
                              <Badge size="sm" variant="outline"><ShoppingCart className="h-3 w-3" />{counts.storeTransactions} {t('cloudStore.stats.transactions')}</Badge>
                              <Badge size="sm" variant="outline"><HardDrive className="h-3 w-3" />{counts.backups} {t('cloudStore.stats.backups')}</Badge>
                            </div>
                          )}
                        </>
                      )}
                    </Card>
                  );
                })}
              </ItemGroup>
            )}
          </section>

          {/* Form buat toko baru */}
          {showCreate && !atLimit && (
            <Card className="border-dashed">
              <CardContent className="space-y-2 p-3">
                <p className="text-sm font-medium">
                  {stores.length === 0 ? t('cloudStore.createFirst') : t('cloudStore.addNew')}
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('cloudStore.storeNamePlaceholder')}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    autoFocus
                  />
                  <Button disabled={!newName.trim() || busy === 'create'} onClick={handleCreate}>
                    {busy === 'create' ? <Loader2 className="animate-spin" /> : t('cloudStore.create')}
                  </Button>
                </div>
                {stores.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                    {t('cloudStore.cancel')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
