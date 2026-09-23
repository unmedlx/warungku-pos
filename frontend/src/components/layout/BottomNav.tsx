import { ShoppingCart } from '@/components/icons';
import { useUpdateState } from '@/lib/app-updater/store';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { NAV_GROUPS, groupForPath, type NavGroup } from '@/lib/nav-groups';

/**
 * Bottom Navigation.
 *
 * Duduk di atas permukaan kartu yang pejal, bukan latar setengah transparan
 * ber-backdrop-blur: di HP Android kelas bawah blur itu dibayar tiap frame
 * gulir, dan di bawah matahari ia justru menurunkan kontras label yang
 * paling sering dilihat orang di app ini.
 *
 * Kasir dapat porsi terbesar karena dipakai ratusan kali sehari — tombol
 * brand 50px yang menonjol ke atas dengan kedalaman brand, dipagari garis
 * setebal permukaan nav supaya siluetnya tetap terbaca di kedua tema.
 *
 * Status aktif dihitung per *kelompok* (lihat `lib/nav-groups`).
 */
function NavItem({ group, active, dot }: { group: NavGroup; active: boolean; dot?: boolean }) {
  const { t } = useTranslation('common');
  const label = t(group.labelKey);
  const Icon = group.icon;

  return (
    <NavLink
      to={group.root}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2.5 transition-colors',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'motion-reduce:transition-none',
        active ? 'text-primary-text' : 'text-faint-foreground hover:text-foreground',
      )}
    >
      <span className="relative">
        {/* Registry icon app ini sudah bergaya solid, jadi status aktif
            dibawa warna brand pada ikon dan labelnya — mengisi ikon yang
            memang sudah terisi tidak menambah apa pun, dan indikator
            terpisah hanya mengulang status yang sudah terbaca. */}
        <Icon className="h-5.5 w-5.5 shrink-0" />
        {dot && (
          <span
            className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card"
            aria-hidden="true"
          />
        )}
      </span>
      <span className="truncate text-2xs font-semibold tracking-[-0.01em]">{label}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  const { t } = useTranslation('common');
  const { can } = useAuth();
  const { pathname } = useLocation();

  const activeId = groupForPath(pathname)?.id;
  const [home, goods, notes, me] = NAV_GROUPS;
  const showCashier = can('create_transaction');
  const cashierActive = pathname.startsWith('/cashier');
  // Titik di menu Pengaturan selama ada update aplikasi yang belum dipasang.
  const update = useUpdateState();
  const adaUpdate = ['available', 'downloading', 'downloaded'].includes(update.status);

  return (
    <nav
      data-slot="bottom-navigation-list"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex min-h-[var(--app-nav-h)] w-full max-w-lg items-center justify-around sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
        <NavItem group={home} active={activeId === 'home'} />
        <NavItem group={goods} active={activeId === 'goods'} />

        {showCashier && (
          <NavLink
            to="/cashier"
            aria-label={t('nav.cashier')}
            aria-current={cashierActive ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2.5 transition-colors',
              'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              'motion-reduce:transition-none',
              /* Tombolnya selalu dicelup brand — ia aksi utama, bukan status.
                 Tapi LABELNYA mengikuti aturan yang sama dengan item lain,
                 kalau tidak dua label terbaca aktif sekaligus dan tidak ada
                 yang tahu sedang di halaman mana. Ini terlihat di tangkapan
                 layar Laporan: "Kasir" dan "Catatan" sama-sama biru. */
              cashierActive ? 'text-primary-text' : 'text-faint-foreground',
            )}
          >
            <span className="-mt-[1.375rem] flex h-[3.125rem] w-[3.125rem] items-center justify-center rounded-2xl border-[3px] border-card bg-primary text-primary-foreground shadow-primary transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100">
              <ShoppingCart className="h-6 w-6" />
            </span>
            <span className="truncate text-2xs font-semibold tracking-[-0.01em]">{t('nav.cashier')}</span>
          </NavLink>
        )}

        <NavItem group={notes} active={activeId === 'notes'} />
        <NavItem group={me} active={activeId === 'me'} dot={adaUpdate} />
      </div>
    </nav>
  );
}
