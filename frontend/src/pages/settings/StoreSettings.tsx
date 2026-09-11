import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/lib/db';
import { ChevronRight, CreditCard, HandCoins, LayoutGrid, Ruler, Store, Tag, Wallet } from '@/components/icons';
import { PageHeader } from '@/components/jokoui/page-header';
import { SettingsGroup, SettingsItem } from '@/components/jokoui/settings-group';
import { Input } from '@/components/jokoui/input';
import { Switch } from '@/components/jokoui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BUSINESS_MODES, normalizeBusinessMode, type BusinessMode } from '@/lib/business-mode';
import { CountPill, TONE_CLASS } from '@/components/settings/SettingsTile';
import { StoreProfileDialog } from '@/components/settings/StoreProfileDialog';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const RowIcon = ({ icon: Icon, tone }: { icon: typeof Store; tone: 'blue' | 'green' }) => (
  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS[tone]}`}>
    <Icon className="h-[18px] w-[18px]" />
  </div>
);

/**
 * Sub-halaman "Toko & Produk" — isi grup `store.sectionTitle` yang dulu
 * ditumpuk di halaman Pengaturan tunggal.
 */
export default function StoreSettings() {
  const { t } = useTranslation('settings');
  const { can } = useAuth();
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());
  const categories = useLiveQuery(() => db.categories.where('isDeleted').equals(0).toArray());
  const expenseCategories = useLiveQuery(() => db.expenseCategories.where('isDeleted').equals(0).toArray());
  const units = useLiveQuery(() => db.units.where('isDeleted').equals(0).toArray());
  const [storeDialog, setStoreDialog] = useState(false);

  const canStore = can('manage_store_settings');
  const canMaster = can('manage_categories_payments');
  if (!canStore && !canMaster) {
    return <LockedPage title={t('hub.categories.store.label')} permissionLabel={t('masterData.theme.permissionLabel')} />;
  }

  /**
   * Mode kasir ditebak dari jenis usaha saat onboarding. Tebakan itu bisa
   * meleset, jadi pemilik harus bisa menimpanya tanpa mengulang onboarding.
   */
  const handleChangeBusinessMode = async (mode: BusinessMode) => {
    if (!storeSettings?.id) return;
    await db.storeSettings.update(storeSettings.id, { businessMode: mode });
    toast.success(t('masterData.businessMode.saved', { defaultValue: 'Mode kasir diperbarui' }));
  };

  /** Batasi 0–99: di atas itu grid meja jadi tidak terbaca di layar HP. */
  const handleChangeTableCount = async (raw: string) => {
    if (!storeSettings?.id) return;
    const count = Math.min(99, Math.max(0, Math.floor(Number(raw) || 0)));
    await db.storeSettings.update(storeSettings.id, { tableCount: count });
  };

  const handleToggleDebt = async (enabled: boolean) => {
    if (!storeSettings?.id) return;
    await db.storeSettings.update(storeSettings.id, { allowDebt: enabled });
    toast.success(enabled ? t('toast.debtEnabled') : t('toast.debtDisabled'));
  };

  const isResto = normalizeBusinessMode(storeSettings?.businessMode) === 'resto';

  return (
    <div className="page-container">
      <PageHeader backTo="/settings" title={t('hub.categories.store.label')} />

      {canStore && (
        <SettingsGroup title={t('hub.sections.identity')}>
          <SettingsItem
            interactive
            onClick={() => setStoreDialog(true)}
            icon={<RowIcon icon={Store} tone="blue" />}
            label={t('storeDialog.title')}
            description={storeSettings?.storeName || t('storeFallback')}
            trailing={<ChevronRight className="h-4 w-4" />}
          />
          <SettingsItem
            icon={<RowIcon icon={Store} tone="blue" />}
            label={t('masterData.businessMode.title')}
            description={t('masterData.businessMode.description')}
            trailing={
              <Select
                value={normalizeBusinessMode(storeSettings?.businessMode)}
                onValueChange={(value) => { void handleChangeBusinessMode(value as BusinessMode); }}
              >
                <SelectTrigger className="w-[132px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>{t(`masterData.businessMode.options.${mode}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
          {/* Jumlah meja hanya relevan untuk restoran. */}
          {isResto && (
            <SettingsItem
              icon={<RowIcon icon={LayoutGrid} tone="blue" />}
              label={t('masterData.tableCount.title')}
              description={t('masterData.tableCount.description')}
              trailing={
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={storeSettings?.tableCount ?? 0}
                  onChange={(e) => { void handleChangeTableCount(e.target.value); }}
                  className="w-[72px] text-center tabular-nums"
                />
              }
            />
          )}
        </SettingsGroup>
      )}

      {canMaster && (
        <SettingsGroup title={t('hub.sections.masterData')}>
          <Link to="/settings/payment-methods" className="block">
            <SettingsItem
              interactive
              icon={<RowIcon icon={CreditCard} tone="green" />}
              label={t('masterData.paymentMethods.title')}
              description={t('hub.entries.paymentMethods')}
              trailing={<><CountPill>{paymentMethods?.length ?? 0}</CountPill><ChevronRight className="h-4 w-4" /></>}
            />
          </Link>
          <Link to="/settings/product-category" className="block">
            <SettingsItem
              interactive
              icon={<RowIcon icon={Tag} tone="green" />}
              label={t('masterData.productCategory.title')}
              description={t('hub.entries.productCategory')}
              trailing={<><CountPill>{categories?.length ?? 0}</CountPill><ChevronRight className="h-4 w-4" /></>}
            />
          </Link>
          <Link to="/settings/expense-category" className="block">
            <SettingsItem
              interactive
              icon={<RowIcon icon={Wallet} tone="green" />}
              label={t('masterData.expenseCategory.title')}
              description={t('hub.entries.expenseCategory')}
              trailing={<><CountPill>{expenseCategories?.length ?? 0}</CountPill><ChevronRight className="h-4 w-4" /></>}
            />
          </Link>
          <Link to="/settings/units" className="block">
            <SettingsItem
              interactive
              icon={<RowIcon icon={Ruler} tone="green" />}
              label={t('masterData.units.title')}
              description={t('hub.entries.units')}
              trailing={<><CountPill>{units?.length ?? 0}</CountPill><ChevronRight className="h-4 w-4" /></>}
            />
          </Link>
        </SettingsGroup>
      )}

      {canStore && (
        <SettingsGroup title={t('hub.sections.payment')}>
          <SettingsItem
            icon={<RowIcon icon={HandCoins} tone="blue" />}
            label={t('masterData.allowDebt.title')}
            description={t('masterData.allowDebt.description')}
            trailing={<Switch checked={storeSettings?.allowDebt ?? false} onCheckedChange={handleToggleDebt} />}
          />
        </SettingsGroup>
      )}

      <StoreProfileDialog open={storeDialog} onOpenChange={setStoreDialog} storeSettings={storeSettings} />
    </div>
  );
}
