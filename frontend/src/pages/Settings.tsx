import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import {
  ChevronRight, Cloud, HandCoins, Info, LogOut, Search, Settings as SettingsIcon,
  ShieldCheck,
} from '@/components/icons';
import { PageHeader } from '@/components/jokoui/page-header';
import { SettingsGroup, SettingsItem } from '@/components/jokoui/settings-group';
import { HelpSection } from '@/components/jokoui/help-section';
import { Input } from '@/components/jokoui/input';
import { Switch } from '@/components/jokoui/switch';
import { Button } from '@/components/jokoui/button';
import { Card } from '@/components/jokoui/card';
import { SectionTitle } from '@/components/jokoui/section-title';
import { SettingsTile, SettingsTileGrid, TONE_CLASS } from '@/components/settings/SettingsTile';
import { StatusStrip } from '@/components/settings/StatusStrip';
import { StoreIdentityCard } from '@/components/settings/StoreIdentityCard';
import { StoreProfileDialog } from '@/components/settings/StoreProfileDialog';
import { LogoutDialog, MultiUserDisableDialog } from '@/components/settings/MultiUserDialogs';
import { SETTINGS_CATEGORIES, SETTINGS_ENTRIES, POPULAR_ENTRY_KEYS } from '@/lib/settings-catalog';
import { useCloudStatus } from '@/hooks/use-cloud-status';
import { useAuth } from '@/hooks/use-auth';
import { APP_VERSION } from '@/lib/app-version';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * Hub Pengaturan (mockup `docs/settings-mockup.html`).
 *
 * Sebelumnya halaman ini menumpuk enam grup list (~25 baris) secara vertikal,
 * sehingga semua item tampak setara dan pemilik harus memindai seluruh layar
 * untuk menemukan satu menu. Sekarang: identitas toko, satu strip status yang
 * hanya muncul saat ada yang perlu dikerjakan, enam kartu kategori, dan dua
 * saklar cepat. Detailnya pindah ke sub-halaman `/settings/<kategori>`.
 *
 * Hierarki menambah satu ketukan, jadi kolom pencarian di atas menjangkau
 * seluruh entri lintas kategori — termasuk yang berada di dalam sub-halaman.
 */
export default function Pengaturan() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const { multiUserEnabled, currentUser, isOwner, can, logout } = useAuth();
  const cloud = useCloudStatus();

  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const txCount = useLiveQuery(() => db.transactions.count());
  const productCount = useLiveQuery(() => db.products.where('isDeleted').equals(0).count());
  const usersCount = useLiveQuery(() => db.users.count());

  const [search, setSearch] = useState('');
  const [storeDialog, setStoreDialog] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const canStoreSettings = can('manage_store_settings');

  /** Kategori terbuka kalau pengguna punya salah satu izin yang disyaratkan. */
  const isCategoryOpen = (cat: (typeof SETTINGS_CATEGORIES)[number]) => {
    if (cat.ownerOnly) return isOwner;
    if (!cat.anyOf) return true;
    return cat.anyOf.some(p => can(p));
  };

  const isEntryOpen = (entry: (typeof SETTINGS_ENTRIES)[number]) => {
    if (entry.ownerOnly) return isOwner;
    return entry.permission ? can(entry.permission) : true;
  };

  const query = search.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return [];
    return SETTINGS_ENTRIES.filter(isEntryOpen).filter(e => {
      const label = t(e.labelKey).toLowerCase();
      const category = t(`hub.categories.${e.category}.label`).toLowerCase();
      return label.includes(query) || category.includes(query);
    });
    // `t` ikut berubah saat bahasa diganti; itu memang harus memicu hitung ulang.
  }, [query, t, isOwner, can]); // eslint-disable-line react-hooks/exhaustive-deps

  const popular = useMemo(
    () => SETTINGS_ENTRIES.filter(e => POPULAR_ENTRY_KEYS.includes(e.key)).filter(isEntryOpen),
    [isOwner, can], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleToggleDebt = async (enabled: boolean) => {
    if (!storeSettings?.id) return;
    await db.storeSettings.update(storeSettings.id, { allowDebt: enabled });
    toast.success(enabled ? t('toast.debtEnabled') : t('toast.debtDisabled'));
  };

  const handleLogout = () => {
    logout();
    setLogoutOpen(false);
    // Reload agar state in-memory hilang dan rute kembali ke layar login.
    window.location.reload();
  };

  const entryRow = (entry: (typeof SETTINGS_ENTRIES)[number], withBreadcrumb: boolean) => {
    const Icon = entry.icon;
    return (
      <Link key={entry.key} to={entry.path} className="block">
        <SettingsItem
          interactive
          icon={
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS[entry.tone]}`}>
              <Icon className="h-[18px] w-[18px]" />
            </div>
          }
          label={t(entry.labelKey)}
          description={withBreadcrumb ? t(`hub.categories.${entry.category}.label`) : undefined}
          trailing={<ChevronRight className="h-4 w-4" />}
        />
      </Link>
    );
  };

  return (
    <div className="page-container">
      <PageHeader
        icon={SettingsIcon}
        title={t('common:common.setting')}
        inlineActions={
          <Button
            variant="outline"
            size="icon"
            aria-label={t('issueReport.title')}
            onClick={() => navigate('/settings/report-issue')}
          >
            <Info />
          </Button>
        }
      />

      {/* Pencarian — jalur cepat yang menembus hierarki kategori. */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('hub.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {query ? (
        <>
          {results.length > 0 && (
            <SettingsGroup title={t('hub.search.resultCount', { count: results.length })}>
              {results.map(e => entryRow(e, true))}
            </SettingsGroup>
          )}

          {results.length === 0 && (
            <>
              <Card className="mb-4 p-6 text-center">
                <p className="text-sm text-muted-foreground">{t('hub.search.empty')}</p>
                <Button variant="link" size="sm" className="mt-1" onClick={() => navigate('/settings/report-issue')}>
                  {t('hub.search.emptyCta')}
                </Button>
              </Card>
              <SettingsGroup title={t('hub.search.popular')}>
                {popular.map(e => entryRow(e, true))}
              </SettingsGroup>
            </>
          )}
        </>
      ) : (
        <>
          {/* Identitas toko — ketuk untuk mengubah nama, alamat, logo. */}
          <div className="mb-3">
            <StoreIdentityCard
              name={storeSettings?.storeName || t('storeFallback')}
              address={storeSettings?.address || t('notSet')}
              logo={storeSettings?.logo}
              chips={[
                t('hub.chips.transactions', { count: txCount ?? 0 }),
                t('hub.chips.products', { count: productCount ?? 0 }),
                ...(multiUserEnabled ? [t('hub.chips.employees', { count: usersCount ?? 0 })] : []),
              ]}
              onEdit={canStoreSettings ? () => setStoreDialog(true) : undefined}
            />
          </div>

          {/* Strip status: hanya menempati ruang saat memang membawa informasi. */}
          {can('manage_backup') && (
            <div className="mb-4">
              <StatusStrip
                to="/settings/cloud-backup"
                tone={cloud.tone}
                icon={Cloud}
                title={t('cloudSync.title')}
                badge={cloud.badge}
                description={cloud.shortDescription}
                meta={cloud.meta}
              />
            </div>
          )}

          <SectionTitle title={t('hub.sections.manage')} />
          <SettingsTileGrid>
            {SETTINGS_CATEGORIES.map(cat => (
              <SettingsTile
                key={cat.id}
                to={cat.path}
                icon={cat.icon}
                tone={cat.tone}
                label={t(cat.labelKey)}
                description={t(cat.descKey)}
                attention={cat.id === 'data' && cloud.needsAttention}
                locked={!isCategoryOpen(cat)}
                lockedHint={t('hub.lockedHint')}
              />
            ))}
          </SettingsTileGrid>

          {/* Saklar yang sering diubah — tidak perlu masuk sub-halaman. */}
          {(isOwner || canStoreSettings) && (
            <div className="mt-4">
              <SettingsGroup title={t('hub.sections.quick')}>
                {isOwner && (
                  <SettingsItem
                    icon={
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS.purple}`}>
                        <ShieldCheck className="h-[18px] w-[18px]" />
                      </div>
                    }
                    label={t('hub.quick.multiUser.label')}
                    description={t('hub.quick.multiUser.description')}
                    trailing={
                      <Switch
                        checked={multiUserEnabled}
                        // Menyalakan multi-user kini punya prasyarat cloud,
                        // jadi tidak muat lagi di dalam satu dialog kecil.
                        onCheckedChange={(on) =>
                          on ? navigate('/settings/employees/activate') : setDisableOpen(true)
                        }
                      />
                    }
                  />
                )}
                {canStoreSettings && (
                  <SettingsItem
                    icon={
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS.green}`}>
                        <HandCoins className="h-[18px] w-[18px]" />
                      </div>
                    }
                    label={t('masterData.allowDebt.title')}
                    description={t('hub.quick.allowDebt.description')}
                    trailing={<Switch checked={storeSettings?.allowDebt ?? false} onCheckedChange={handleToggleDebt} />}
                  />
                )}
              </SettingsGroup>
            </div>
          )}

          <HelpSection
            className="mb-4"
            title={t('helpSection.title', { defaultValue: 'Butuh bantuan?' })}
            description={t('helpSection.description', { defaultValue: 'Ada kendala atau error saat memakai aplikasi? Laporkan langsung ke tim KanPOS.' })}
            ctaLabel={t('issueReport.title')}
            onCtaClick={() => navigate('/settings/report-issue')}
          />

          <div className="pb-6 text-center text-xs leading-relaxed text-muted-foreground">
            <p>{t('about.appName')} v{APP_VERSION}</p>
            {multiUserEnabled && currentUser && (
              <Button
                variant="link"
                size="sm"
                className="mt-1 gap-1.5 text-xs text-destructive-text"
                onClick={() => setLogoutOpen(true)}
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('hub.signedInAs', { username: currentUser.username })}
              </Button>
            )}
          </div>
        </>
      )}

      <StoreProfileDialog open={storeDialog} onOpenChange={setStoreDialog} storeSettings={storeSettings} />
      <MultiUserDisableDialog open={disableOpen} onOpenChange={setDisableOpen} storeId={storeSettings?.id} />
      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={handleLogout} />
    </div>
  );
}
