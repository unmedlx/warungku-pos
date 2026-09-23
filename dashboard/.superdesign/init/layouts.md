<!-- Superdesign init — generated for `dashboard` -->

# Layouts — `dashboard`

Shared shell/layout components with FULL source.

### `src/components/Sidebar.tsx`

```tsx
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, GitCompare, Activity, LayoutGrid, LogOut, Settings, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Logo from './Logo';
import { Avatar, Badge, Bar, Button } from './Common';
import type { Health, Profile } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

export interface NavItem {
  to: string;
  label: string;
  /** Kelompok yang muncul di breadcrumb topbar. */
  grup: 'Laporan' | 'Akun';
  icon: LucideIcon;
}

/**
 * Sumber tunggal daftar navigasi: dipakai sidebar untuk menu, dan App untuk
 * breadcrumb di topbar. Dua tempat itu tidak boleh berbeda penamaannya.
 */
export const NAV: NavItem[] = [
  { to: '/', label: 'Ringkasan', grup: 'Laporan', icon: LayoutGrid },
  { to: '/bandingkan', label: 'Bandingkan Cabang', grup: 'Laporan', icon: GitCompare },
  { to: '/tren', label: 'Tren Jangka Panjang', grup: 'Laporan', icon: BarChart3 },
  { to: '/status', label: 'Status Data', grup: 'Laporan', icon: Activity },
  { to: '/toko', label: 'Toko & Cabang', grup: 'Akun', icon: Store },
  { to: '/pengaturan', label: 'Pengaturan', grup: 'Akun', icon: Settings },
];

export function initials(name: string): string {
  return (
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export function Sidebar({
  health,
  profile,
  onLogout,
}: {
  health: Health | null;
  profile: Profile | null;
  onLogout: () => void;
}) {
  const { pathname } = useLocation();
  const storage = health?.storage;
  const plan = health?.plan;
  const persen = storage ? Math.min(storage.usedPercent, 100) : 0;

  // Titik pada menu Status Data — sinyal ringan bahwa ada toko yang perlu dilihat.
  const perluPerhatian = health
    ? health.stores.filter((s) => s.stale || s.neverSynced).length
    : 0;

  const grup = (nama: NavItem['grup']) => NAV.filter((i) => i.grup === nama);

  return (
    <aside className="sticky top-0 flex h-screen w-sidebar flex-none flex-col border-r border-border bg-card">
      <div className="flex h-topbar items-center gap-2.5 border-b border-border px-4">
        <Logo className="h-7 w-7 flex-none rounded-lg" />
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">KanPOS</div>
          <div className="text-[11px] leading-tight text-muted-foreground">Dashboard pemilik</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {(['Laporan', 'Akun'] as const).map((nama) => (
          <div key={nama}>
            <div className="px-2 pb-1.5 pt-3.5 text-xs font-medium text-muted-foreground first:pt-1">
              {nama}
            </div>
            {grup(nama).map(({ to, label, icon: Icon }) => {
              const aktif = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={aktif ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-sm font-medium transition-colors',
                    aktif
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon size={18} strokeWidth={1.75} className="flex-none" />
                  <span className="truncate">{label}</span>
                  {to === '/status' && perluPerhatian > 0 && (
                    <span
                      className="ml-auto h-1.5 w-1.5 flex-none rounded-full bg-warning"
                      title={`${perluPerhatian} toko belum sinkron`}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        {storage && plan && (
          <div className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-semibold">
                {plan.name ?? 'Tanpa paket'}
              </span>
              {plan.daysLeft !== null && (
                <Badge
                  size="sm"
                  variant={plan.daysLeft < 0 ? 'destructive' : plan.daysLeft <= 7 ? 'warning' : 'success'}
                >
                  {plan.daysLeft < 0 ? 'Berakhir' : 'Aktif'}
                </Badge>
              )}
            </div>
            <Bar
              percent={persen}
              tone={persen > 85 ? 'warning' : 'primary'}
              className="my-2.5"
            />
            <div className="text-xs tabular-nums text-muted-foreground">
              {storage.usedMb} MB / {storage.limitMb} MB
              {plan.maxStores ? ` · ${plan.storeCount} dari ${plan.maxStores} toko` : ''}
            </div>
            {plan.expiresAt && (
              <div className="mt-1 text-xs text-muted-foreground">
                Aktif s/d {formatDate(plan.expiresAt)}
              </div>
            )}
          </div>
        )}

        {profile && (
          <div className="mt-3 flex items-center gap-2.5">
            {profile.picture ? (
              <img src={profile.picture} alt="" className="h-8 w-8 flex-none rounded-full object-cover" />
            ) : (
              <Avatar tone="primary">
                {(profile.name || profile.email || '?').slice(0, 1).toUpperCase()}
              </Avatar>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{profile.name || profile.email}</div>
              <div className="truncate text-xs text-muted-foreground">{profile.email}</div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onLogout} aria-label="Keluar" title="Keluar">
              <LogOut size={16} strokeWidth={1.75} />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
```


### `src/components/Login.tsx`

```tsx
import { GoogleLogin } from '@react-oauth/google';
import Logo from './Logo';
import { Alert, Card } from './Common';

/**
 * Backend memverifikasi Google ID token pada tiap request, jadi login di sini
 * cukup menyimpan credential dari Google — tidak ada sesi server terpisah.
 */
export function Login({ onToken, error }: { onToken: (t: string) => void; error?: string | null }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-[380px] p-7">
        <div className="flex items-center gap-2.5">
          <Logo className="h-9 w-9 flex-none rounded-xl" />
          <div>
            <div className="text-sm font-semibold leading-tight">Dashboard KanPOS</div>
            <div className="text-xs text-muted-foreground">Laporan pemilik lintas cabang</div>
          </div>
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-tight">Masuk</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Pakai akun Google yang sama dengan yang kamu pakai di aplikasi kasir.
        </p>

        <div className="mt-5 flex justify-center">
          <GoogleLogin
            onSuccess={(res) => res.credential && onToken(res.credential)}
            onError={() => undefined}
            locale="id"
            width="316"
          />
        </div>

        {error && <Alert variant="destructive" title={error} className="mt-4" />}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Dashboard tersedia untuk pengguna Cloud KanPOS aktif.
        </p>
      </Card>
    </div>
  );
}
```

