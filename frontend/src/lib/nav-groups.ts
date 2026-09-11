import { Home, Package, ClipboardList, LayoutGrid, type IconComponent } from '@/components/icons';
import type { PermissionKey } from '@/lib/db';

/**
 * Pengelompokan halaman berdasarkan *pekerjaan*, bukan entitas database.
 *
 * Sebelumnya 17 halaman berdiri sejajar di navigasi, sehingga Kasir (dipakai
 * ratusan kali sehari) setara dengan Supplier (seminggu sekali). Kelompok di
 * bawah menyatukan halaman yang dikerjakan dalam satu sesi yang sama:
 *  - Barang   — apa yang dijual & berapa sisanya
 *  - Catatan  — buku catatan uang: kasbon, pengeluaran, riwayat, laporan
 *
 * Rute lamanya tetap hidup; yang berubah hanya cara mencapainya. Supplier &
 * Pelanggan sengaja tidak jadi kelompok — keduanya hanya dipakai di dalam alur
 * lain (pilih supplier saat stok masuk, pilih pelanggan saat kasbon).
 */

export interface NavTab {
  to: string;
  /** Kunci i18n pada namespace `common`. */
  labelKey: string;
  /** Izin yang dibutuhkan; salah satu cukup. */
  perm?: PermissionKey[];
}

export interface NavGroup {
  id: 'home' | 'goods' | 'notes' | 'me';
  /** Rute yang dibuka saat ikon di bottom nav ditekan. */
  root: string;
  icon: IconComponent;
  labelKey: string;
  /** Tab yang muncul di dalam kelompok. Kosong = kelompok tanpa tab. */
  tabs: NavTab[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    root: '/',
    icon: Home,
    labelKey: 'nav.home',
    tabs: [],
  },
  {
    id: 'goods',
    root: '/products',
    icon: Package,
    labelKey: 'nav.goods',
    tabs: [
      { to: '/products', labelKey: 'nav.tabs.productList', perm: ['manage_products'] },
      { to: '/stock-in', labelKey: 'nav.tabs.stockIn', perm: ['manage_stock_inout'] },
      { to: '/stock-out', labelKey: 'nav.tabs.stockOut', perm: ['manage_stock_inout'] },
      { to: '/stock-report', labelKey: 'nav.tabs.stockReport', perm: ['view_reports'] },
    ],
  },
  {
    id: 'notes',
    root: '/history',
    icon: ClipboardList,
    labelKey: 'nav.notes',
    tabs: [
      { to: '/history', labelKey: 'nav.tabs.history' },
      { to: '/debts', labelKey: 'nav.tabs.debts' },
      { to: '/expenses', labelKey: 'nav.tabs.expenses', perm: ['view_expenses', 'manage_expenses'] },
      { to: '/reports', labelKey: 'nav.tabs.reports', perm: ['view_reports'] },
    ],
  },
  {
    id: 'me',
    root: '/settings',
    icon: LayoutGrid,
    labelKey: 'nav.me',
    tabs: [],
  },
];

/** Kelompok yang memuat sebuah path, atau `null` bila di luar semua kelompok. */
export function groupForPath(pathname: string): NavGroup | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  for (const group of NAV_GROUPS) {
    if (group.tabs.some((tab) => tab.to === path)) return group;
    if (group.root === path) return group;
    // Sub-halaman pengaturan (mis. /settings/units) tetap milik kelompok "Saya".
    if (group.root !== '/' && path.startsWith(`${group.root}/`)) return group;
  }
  return null;
}
