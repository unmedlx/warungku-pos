import {
  Store, Users as UsersIcon, Truck, Receipt, HardDrive, Smartphone,
  CreditCard, Tag, Wallet, Ruler, HandCoins, LayoutGrid, Palette,
  ClipboardCheck, Download, Cloud, Globe, Sparkles, Printer, ShieldCheck,
  type IconComponent,
} from '@/components/icons';
import type { PermissionKey } from '@/lib/auth';
import type { SettingsTone } from '@/components/settings/SettingsTile';

/**
 * Katalog Pengaturan — sumber tunggal untuk kartu kategori di hub **dan**
 * indeks pencarian. Hub & spoke menambah satu ketukan untuk menemukan menu;
 * pencarian yang menjangkau seluruh entri (termasuk yang berada di dalam
 * sub-halaman) menghapus biaya itu bagi pengguna yang sudah hafal.
 *
 * Label memakai kunci i18n, bukan teks, supaya tetap ikut bahasa aktif.
 */

export type SettingsCategoryId = 'store' | 'employees' | 'partners' | 'display' | 'data' | 'app';

export interface SettingsCategory {
  id: SettingsCategoryId;
  path: string;
  icon: IconComponent;
  tone: SettingsTone;
  /** Kunci i18n namespace `settings`. */
  labelKey: string;
  descKey: string;
  /** Kategori terbuka jika pengguna punya salah satu izin ini. Kosong = selalu. */
  anyOf?: PermissionKey[];
  /** Hanya pemilik (mis. pengaturan karyawan). */
  ownerOnly?: boolean;
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'store',
    path: '/settings/store',
    icon: Store,
    tone: 'blue',
    labelKey: 'hub.categories.store.label',
    descKey: 'hub.categories.store.description',
    anyOf: ['manage_store_settings', 'manage_categories_payments'],
  },
  {
    id: 'employees',
    path: '/settings/employees',
    icon: UsersIcon,
    tone: 'purple',
    labelKey: 'hub.categories.employees.label',
    descKey: 'hub.categories.employees.description',
    ownerOnly: true,
  },
  {
    id: 'partners',
    path: '/settings/partners',
    icon: Truck,
    tone: 'green',
    labelKey: 'hub.categories.partners.label',
    descKey: 'hub.categories.partners.description',
    anyOf: ['manage_supplier', 'manage_customers'],
  },
  {
    id: 'display',
    path: '/settings/display',
    icon: Receipt,
    tone: 'amber',
    labelKey: 'hub.categories.display.label',
    descKey: 'hub.categories.display.description',
  },
  {
    id: 'data',
    path: '/settings/data',
    icon: HardDrive,
    tone: 'red',
    labelKey: 'hub.categories.data.label',
    descKey: 'hub.categories.data.description',
    anyOf: ['manage_stock_inout', 'manage_backup'],
  },
  {
    id: 'app',
    path: '/settings/app',
    icon: Smartphone,
    tone: 'gray',
    labelKey: 'hub.categories.app.label',
    descKey: 'hub.categories.app.description',
  },
];

export interface SettingsEntry {
  key: string;
  category: SettingsCategoryId;
  /** Rute tujuan: halaman khusus kalau ada, kalau tidak sub-halaman kategorinya. */
  path: string;
  icon: IconComponent;
  tone: SettingsTone;
  labelKey: string;
  /** Kata kunci tambahan (i18n) agar pencarian tetap menemukan istilah awam. */
  keywordKey?: string;
  permission?: PermissionKey;
  ownerOnly?: boolean;
}

export const SETTINGS_ENTRIES: SettingsEntry[] = [
  // Toko & Produk
  { key: 'businessMode', category: 'store', path: '/settings/store', icon: Store, tone: 'blue', labelKey: 'masterData.businessMode.title', permission: 'manage_store_settings' },
  { key: 'tableCount', category: 'store', path: '/settings/store', icon: LayoutGrid, tone: 'blue', labelKey: 'masterData.tableCount.title', permission: 'manage_store_settings' },
  { key: 'allowDebt', category: 'store', path: '/settings/store', icon: HandCoins, tone: 'blue', labelKey: 'masterData.allowDebt.title', permission: 'manage_store_settings' },
  { key: 'paymentMethods', category: 'store', path: '/settings/payment-methods', icon: CreditCard, tone: 'green', labelKey: 'masterData.paymentMethods.title', permission: 'manage_categories_payments' },
  { key: 'productCategory', category: 'store', path: '/settings/product-category', icon: Tag, tone: 'green', labelKey: 'masterData.productCategory.title', permission: 'manage_categories_payments' },
  { key: 'expenseCategory', category: 'store', path: '/settings/expense-category', icon: Wallet, tone: 'green', labelKey: 'masterData.expenseCategory.title', permission: 'manage_categories_payments' },
  { key: 'units', category: 'store', path: '/settings/units', icon: Ruler, tone: 'green', labelKey: 'masterData.units.title' },

  // Karyawan & Akses
  { key: 'manageUsers', category: 'employees', path: '/users', icon: UsersIcon, tone: 'purple', labelKey: 'employees.manage.title', ownerOnly: true },
  { key: 'multiUser', category: 'employees', path: '/settings/employees', icon: ShieldCheck, tone: 'purple', labelKey: 'employees.active.title', ownerOnly: true },

  // Mitra
  { key: 'supplier', category: 'partners', path: '/supplier', icon: Truck, tone: 'green', labelKey: 'transactionsAndStock.supplier.title', permission: 'manage_supplier' },
  { key: 'customers', category: 'partners', path: '/customers', icon: UsersIcon, tone: 'green', labelKey: 'transactionsAndStock.customers.title', permission: 'manage_customers' },

  // Struk & Tampilan
  { key: 'receipt', category: 'display', path: '/settings/receipt', icon: Receipt, tone: 'amber', labelKey: 'masterData.receiptFooter.title', permission: 'manage_store_settings' },
  { key: 'theme', category: 'display', path: '/settings/theme', icon: Palette, tone: 'amber', labelKey: 'masterData.theme.title', permission: 'manage_store_settings' },
  { key: 'cashierLayout', category: 'display', path: '/settings/display', icon: LayoutGrid, tone: 'amber', labelKey: 'masterData.cashierLayout.title' },
  { key: 'printer', category: 'display', path: '/settings/display', icon: Printer, tone: 'amber', labelKey: 'bluetoothPrinter.title' },

  // Data & Backup
  { key: 'stockOpname', category: 'data', path: '/settings/stock-opname', icon: ClipboardCheck, tone: 'red', labelKey: 'stockOpname.title', permission: 'manage_stock_inout' },
  { key: 'backup', category: 'data', path: '/settings/backup', icon: Download, tone: 'red', labelKey: 'masterData.backup.title', permission: 'manage_backup' },
  { key: 'cloud', category: 'data', path: '/settings/cloud-backup', icon: Cloud, tone: 'red', labelKey: 'cloudSync.title', permission: 'manage_backup' },

  // Aplikasi
  { key: 'language', category: 'app', path: '/settings/app', icon: Globe, tone: 'gray', labelKey: 'language.title' },
  { key: 'whatsNew', category: 'app', path: '/settings/app', icon: Sparkles, tone: 'gray', labelKey: 'about.whatsNew' },
  { key: 'reportIssue', category: 'app', path: '/settings/report-issue', icon: Smartphone, tone: 'gray', labelKey: 'masterData.reportIssue.title' },
];

/** Entri yang ditawarkan saat kolom pencarian masih kosong/tidak ada hasil. */
export const POPULAR_ENTRY_KEYS = ['backup', 'printer', 'language', 'paymentMethods'];
