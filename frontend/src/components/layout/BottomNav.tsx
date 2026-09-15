import { ShoppingCart } from '@/components/icons';
import { useUpdateState } from '@/lib/app-updater/store';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { NAV_GROUPS, groupForPath, type NavGroup } from '@/lib/nav-groups';

/**
 * Bottom Navigation — port `registry/react/components/bottom-navigation.tsx`
 * milik Shark UI: fixed, `border-t bg-background/85 backdrop-blur-sm`,
 * item flat `text-muted-foreground` → `text-primary` saat aktif, label 12/500.
 *
 * Kasir tetap dapat porsi lebih besar (dipakai ratusan kali sehari): tombol
 * kotak `rounded-xl` berisi primary yang menonjol ke atas — bukan lingkaran
 * ber-glow seperti sebelumnya, mengikuti bahasa Shark yang kotak-tipis.
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
        'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 p-2 transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span className="relative">
        <Icon className="h-5 w-5 shrink-0" />
        {dot && (
          <span
            className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
            aria-hidden="true"
          />
        )}
      </span>
      <span className="truncate text-xs font-medium">{label}</span>
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/85 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex min-h-14 w-full max-w-lg items-center justify-around sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
        <NavItem group={home} active={activeId === 'home'} />
        <NavItem group={goods} active={activeId === 'goods'} />

        {showCashier && (
          <NavLink
            to="/cashier"
            aria-label={t('nav.cashier')}
            aria-current={cashierActive ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 p-2 text-primary transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            <span className="-mt-5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-primary transition-transform active:scale-95">
              <ShoppingCart className="h-5 w-5" />
            </span>
            <span className="truncate text-xs font-medium">{t('nav.cashier')}</span>
          </NavLink>
        )}

        <NavItem group={notes} active={activeId === 'notes'} />
        <NavItem group={me} active={activeId === 'me'} dot={adaUpdate} />
      </div>
    </nav>
  );
}
