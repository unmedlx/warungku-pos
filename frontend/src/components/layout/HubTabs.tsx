import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { groupForPath } from '@/lib/nav-groups';
import { cn } from '@/lib/utils';

/**
 * Deretan tab di dalam satu kelompok navigasi (Barang / Catatan) — Tabs
 * varian `underline` Shark: garis `border-b border-input` sepanjang lebar,
 * tab aktif bergaris 2px `bg-primary` di bawahnya, teks 14/500.
 *
 * Dipasang tepat di bawah `PageHeader`. Merender `null` untuk halaman di
 * luar kelompok bertab, jadi aman dipasang di mana saja.
 */
export default function HubTabs({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const { t } = useTranslation('common');
  const { can } = useAuth();

  const group = groupForPath(pathname);
  if (!group || group.tabs.length === 0) return null;

  const visible = group.tabs.filter((tab) => !tab.perm || tab.perm.some(can));
  if (visible.length < 2) return null;

  return (
    <div
      className={cn(
        '-mx-4 mb-4 flex gap-0.5 overflow-x-auto border-b border-input px-4 text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-8 md:px-8',
        className,
      )}
      role="tablist"
      data-slot="tabs-list"
    >
      {visible.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          role="tab"
          className={({ isActive }) =>
            cn(
              'relative flex h-9 shrink-0 items-center whitespace-nowrap rounded-t-lg px-2.5 text-sm font-medium transition-colors',
              'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
              'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
              isActive ? 'text-foreground after:bg-primary' : 'hover:text-foreground/70 after:bg-transparent',
            )
          }
        >
          {t(tab.labelKey)}
        </NavLink>
      ))}
    </div>
  );
}
