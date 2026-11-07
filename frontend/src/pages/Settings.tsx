import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/lib/db';
import {
  ChevronRight, ClipboardCheck, CreditCard, Download, Globe, HandCoins, Info, LayoutGrid, LogOut,
  Palette, Printer, Receipt, Ruler, Settings as SettingsIcon, Sparkles, Store, Tag, Truck,
  Users as UsersIcon, Wallet, type IconComponent,
} from '@/components/icons';
import { PageHeader } from '@/components/jokoui/page-header';
import { SettingsGroup, SettingsItem } from '@/components/jokoui/settings-group';
import { Switch } from '@/components/jokoui/switch';
import { Button } from '@/components/jokoui/button';
import { TONE_CLASS, type SettingsTone } from '@/components/settings/SettingsTile';
// OFFLINE MODE: StatusStrip and Cloud status disabled
// import { StatusStrip } from '@/components/settings/StatusStrip';
import { StoreIdentityCard } from '@/components/settings/StoreIdentityCard';
import { StoreProfileDialog } from '@/components/settings/StoreProfileDialog';
import { LogoutDialog } from '@/components/settings/MultiUserDialogs';
// OFFLINE MODE: Cloud status disabled
// import { useCloudStatus } from '@/hooks/use-cloud-status';
import { useAuth } from '@/hooks/use-auth';
import { normalizeBusinessMode } from '@/lib/business-mode';
import { getDefaultBluetoothPrinter, isNativePlatform } from '@/lib/printer';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { APP_VERSION } from '@/lib/app-version';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Row {
  key: string;
  show: boolean;
  to?: string;
  icon: IconComponent;
  tone: SettingsTone;
  label: string;
  description?: string;
  /** Keadaan saat ini, dibaca sekilas tanpa membuka menunya. */
  value?: ReactNode;
  trailing?: ReactNode;
}

/**
 * Halaman "Saya" (mockup `docs/saya-redesign-mockup.html`).
 *
 * Sebelumnya: pencarian + enam ubin kategori yang masing-masing membuka
 * halaman perantara, jadi mengatur printer saja butuh dua ketukan plus
 * menebak kategorinya. Sekarang satu daftar yang langsung ke tujuan,
 * dikelompokkan per pekerjaan, dengan keadaan sekarang di kanan baris.
 * Menu yang tidak boleh dipakai disembunyikan, bukan digembok.
 */
export default function Pengaturan() {
  const { t, i18n } = useTranslation('settings');
  const { multiUserEnabled, currentUser, isOwner, can, logout } = useAuth();
  // OFFLINE MODE: Cloud status disabled
  // const cloud = useCloudStatus();

  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const paymentCount = useLiveQuery(() => db.paymentMethods.count());
  const usersCount = useLiveQuery(() => db.users.count());

  const [storeDialog, setStoreDialog] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const canStore = can('manage_store_settings');
  const canMaster = can('manage_categories_payments');
  const canBackup = can('manage_backup');

  const printer = isNativePlatform() ? getDefaultBluetoothPrinter() : null;
  const language = SUPPORTED_LANGUAGES.find(l => i18n.language?.startsWith(l.code))?.label;
  const businessMode = normalizeBusinessMode(storeSettings?.businessMode);
  const tableCount = storeSettings?.tableCount ?? 0;

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

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: t('hub.groups.sales', { defaultValue: 'Jualan' }),
      rows: [
        {
          key: 'printer', show: isNativePlatform() && canStore, to: '/settings/display',
          icon: Printer, tone: 'blue', label: t('bluetoothPrinter.title'),
          value: printer
            ? <span className="font-medium text-success-text">{printer.name}</span>
            : t('hub.values.notSelected', { defaultValue: 'Belum dipilih' }),
        },
        { key: 'receipt', show: canStore, to: '/settings/receipt', icon: Receipt, tone: 'blue', label: t('masterData.receiptFooter.title') },
        {
          key: 'payment', show: canMaster, to: '/settings/payment-methods', icon: CreditCard, tone: 'blue',
          label: t('masterData.paymentMethods.title'),
          value: paymentCount != null ? t('hub.values.active', { count: paymentCount, defaultValue: '{{count}} aktif' }) : undefined,
        },
        {
          key: 'debt', show: canStore, icon: HandCoins, tone: 'amber',
          label: t('masterData.allowDebt.title'),
          description: t('hub.quick.allowDebt.description'),
          trailing: <Switch checked={storeSettings?.allowDebt ?? false} onCheckedChange={handleToggleDebt} />,
        },
      ],
    },
    {
      title: t('hub.groups.store', { defaultValue: 'Toko & barang' }),
      rows: [
        {
          key: 'mode', show: canStore, to: '/settings/store', icon: Store, tone: 'gray',
          label: t('masterData.businessMode.title'),
          value: t(`masterData.businessMode.options.${businessMode}`) + (businessMode === 'resto' && tableCount > 0 ? ` · ${tableCount}` : ''),
        },
        { key: 'productCategory', show: canMaster, to: '/settings/product-category', icon: Tag, tone: 'gray', label: t('masterData.productCategory.title') },
        { key: 'expenseCategory', show: canMaster, to: '/settings/expense-category', icon: Wallet, tone: 'gray', label: t('masterData.expenseCategory.title') },
        { key: 'units', show: true, to: '/settings/units', icon: Ruler, tone: 'gray', label: t('masterData.units.title') },
        { key: 'opname', show: can('manage_stock_inout'), to: '/settings/stock-opname', icon: ClipboardCheck, tone: 'gray', label: t('stockOpname.title') },
      ],
    },
    {
      title: t('hub.groups.people', { defaultValue: 'Orang' }),
      rows: [
        {
          key: 'employees', show: isOwner, to: '/settings/employees', icon: UsersIcon, tone: 'purple',
          label: t('employees.sectionTitle'),
          value: multiUserEnabled
            ? t('hub.values.people', { count: usersCount ?? 0, defaultValue: '{{count}} orang' })
            : t('hub.values.off', { defaultValue: 'Belum aktif' }),
        },
        { key: 'customers', show: can('manage_customers'), to: '/customers', icon: UsersIcon, tone: 'green', label: t('transactionsAndStock.customers.title') },
        { key: 'supplier', show: can('manage_supplier'), to: '/supplier', icon: Truck, tone: 'green', label: t('transactionsAndStock.supplier.title') },
      ],
    },
    {
      title: t('hub.groups.data', { defaultValue: 'Data' }),
      rows: [
        // OFFLINE MODE: Cloud backup menu disabled
        // {
        //   key: 'cloud', show: canBackup, to: '/settings/cloud-backup', icon: Cloud, tone: 'red',
        //   label: t('cloudSync.title'),
        //   description: cloud.meta ?? cloud.shortDescription,
        //   value: (
        //     <span className={cn('font-medium', cloud.needsAttention ? 'text-warning-text' : 'text-success-text')}>
        //       {cloud.badge}
        //     </span>
        //   ),
        // },
        { key: 'backup', show: canBackup, to: '/settings/backup', icon: Download, tone: 'red', label: t('masterData.backup.title') },
      ],
    },
    {
      title: t('hub.groups.app', { defaultValue: 'Aplikasi' }),
      rows: [
        { key: 'layout', show: true, to: '/settings/display', icon: LayoutGrid, tone: 'blue', label: t('masterData.cashierLayout.title') },
        { key: 'theme', show: canStore, to: '/settings/theme', icon: Palette, tone: 'amber', label: t('masterData.theme.title'), value: t(`masterData.theme.${storeSettings?.theme ?? 'system'}`) },
        { key: 'language', show: true, to: '/settings/app', icon: Globe, tone: 'gray', label: t('language.title'), value: language },
        { key: 'whatsNew', show: true, to: '/settings/app', icon: Sparkles, tone: 'purple', label: t('about.whatsNew') },
        { key: 'help', show: true, to: '/settings/report-issue', icon: Info, tone: 'green', label: t('masterData.reportIssue.title') },
      ],
    },
  ];

  const renderRow = (row: Row) => {
    const Icon = row.icon;
    const item = (
      <SettingsItem
        interactive={!!row.to}
        icon={
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CLASS[row.tone]}`}>
            <Icon className="size-4.5" />
          </div>
        }
        label={row.label}
        description={row.description}
        trailing={
          row.trailing ?? (
            <>
              {row.value && <span className="max-w-[9rem] truncate text-xsm">{row.value}</span>}
              <ChevronRight className="h-4 w-4" />
            </>
          )
        }
      />
    );
    return row.to ? <Link key={row.key} to={row.to} className="block">{item}</Link> : <div key={row.key}>{item}</div>;
  };

  const roleLabel = currentUser?.role === 'owner' ? t('employees.owner') : t('employees.staff');

  return (
    <div className="page-container">
      <PageHeader icon={SettingsIcon} title={t('common:common.setting')} />

      {/* Identitas toko — ketuk untuk mengubah nama, alamat, logo. */}
      <div className="mb-3">
        <StoreIdentityCard
          name={storeSettings?.storeName || t('storeFallback')}
          address={storeSettings?.address || t('notSet')}
          logo={storeSettings?.logo}
          chips={multiUserEnabled && currentUser ? [`${currentUser.name} · ${roleLabel}`] : []}
          onEdit={canStore ? () => setStoreDialog(true) : undefined}
        />
      </div>

      {/* OFFLINE MODE: Cloud warning strip disabled */}
      {/* Peringatan hanya saat ada yang perlu dikerjakan; kalau aman, cukup di baris Data. */}
      {/* {canBackup && cloud.needsAttention && (
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
      )} */}

      {groups.map(group => {
        const rows = group.rows.filter(r => r.show);
        if (rows.length === 0) return null;
        return (
          <SettingsGroup key={group.title} title={group.title}>
            {rows.map(renderRow)}
          </SettingsGroup>
        );
      })}

      {multiUserEnabled && currentUser && (
        <Button
          variant="outline"
          size="lg"
          className="mt-2 w-full text-destructive-text"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut />
          {t('hub.logoutAs', { name: currentUser.name, defaultValue: 'Keluar dari akun {{name}}' })}
        </Button>
      )}

      <p className="pb-6 pt-4 text-center text-xs text-muted-foreground">
        {t('about.appName')} v{APP_VERSION}
      </p>

      <StoreProfileDialog open={storeDialog} onOpenChange={setStoreDialog} storeSettings={storeSettings} />
      <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={handleLogout} />
    </div>
  );
}
