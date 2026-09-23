<!-- Superdesign init — generated for `admin` -->

# Layouts — `admin`

Shared shell/layout components with FULL source.

### `src/components/Sidebar.tsx`

```tsx
import type { ReactNode } from 'react';
import Logo from './Logo';
import type { Admin } from '@/lib/types';
import { Avatar, Badge, Button } from './Common';
import { cn } from '@/lib/cn';

export type Halaman = 'ringkasan' | 'pengguna' | 'transaksi' | 'paket' | 'rilis' | 'audit';

function Ikon({ d }: { d: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}

const MENU: { id: Halaman; label: string; ikon: ReactNode }[] = [
  {
    id: 'ringkasan',
    label: 'Ringkasan',
    ikon: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </>
    ),
  },
  {
    id: 'pengguna',
    label: 'Pengguna',
    ikon: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 11.2a3 3 0 0 0 0-6M18 20a5.5 5.5 0 0 0-3-4.9" />
      </>
    ),
  },
  {
    id: 'transaksi',
    label: 'Transaksi',
    ikon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
  },
];

const MENU_KELOLA: { id: Halaman; label: string; ikon: ReactNode }[] = [
  {
    id: 'paket',
    label: 'Paket & harga',
    ikon: (
      <>
        <path d="M21 8 12 3 3 8l9 5 9-5Z" />
        <path d="M3 12l9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
  },
  {
    id: 'rilis',
    label: 'Rilis aplikasi',
    ikon: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </>
    ),
  },
  {
    id: 'audit',
    label: 'Audit log',
    ikon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </>
    ),
  },
];

// Belum dibangun, tapi sengaja ditampilkan redup supaya urutan kerjanya jelas.
const NANTI = ['Kelola admin'];

const ITEM =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-sm font-medium transition-colors';

function Tautan({
  aktif,
  onClick,
  ikon,
  label,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  ikon: ReactNode;
  label: string;
  children?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={aktif ? 'page' : undefined}
      className={cn(
        ITEM,
        aktif
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Ikon d={ikon} />
      {label}
      {children}
    </button>
  );
}

export function Sidebar({
  aktif,
  onPilih,
  admin,
  perluDitangani,
  onKeluar,
}: {
  aktif: Halaman;
  onPilih: (h: Halaman) => void;
  admin: Admin;
  perluDitangani: number;
  onKeluar: () => void;
}) {
  return (
    <aside className="sticky top-0 flex h-screen flex-col border-r border-border bg-card">
      <div className="flex h-topbar flex-none items-center gap-2.5 border-b border-border px-4">
        <Logo className="h-7 w-7 flex-none" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">KanPOS</span>
          <span className="block text-[11px] leading-tight text-muted-foreground">
            Panel tim internal
          </span>
        </span>
        <Badge variant="destructive" size="sm">
          ADMIN
        </Badge>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        <div className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">Pantau</div>
        {MENU.map((m) => (
          <Tautan
            key={m.id}
            aktif={aktif === m.id}
            onClick={() => onPilih(m.id)}
            ikon={m.ikon}
            label={m.label}
          >
            {m.id === 'transaksi' && perluDitangani > 0 && (
              <span
                className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full bg-destructive/10 px-1.5 text-[11px] font-medium tabular-nums text-destructive-text"
                title={`${perluDitangani} pembayaran perlu ditangani`}
              >
                {perluDitangani}
              </span>
            )}
          </Tautan>
        ))}

        <div className="px-2.5 pb-1.5 pt-3.5 text-xs font-medium text-muted-foreground">Kelola</div>
        {MENU_KELOLA.map((m) => (
          <Tautan
            key={m.id}
            aktif={aktif === m.id}
            onClick={() => onPilih(m.id)}
            ikon={m.ikon}
            label={m.label}
          />
        ))}
        {NANTI.map((label) => (
          <span
            key={label}
            className={cn(ITEM, 'cursor-not-allowed text-muted-foreground opacity-50')}
          >
            <Ikon d={<circle cx="12" cy="12" r="9" />} />
            {label}
            <Badge variant="outline" size="sm" className="ml-auto">
              segera
            </Badge>
          </span>
        ))}
      </nav>

      <div className="flex flex-none items-center gap-2.5 border-t border-border p-3">
        <Avatar nama={admin.name} bulat tone="muted" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{admin.name}</span>
          <span className="block text-xs text-muted-foreground">
            {admin.role === 'SUPERADMIN' ? 'Superadmin' : 'Admin'}
          </span>
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onKeluar} title="Keluar" aria-label="Keluar">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </Button>
      </div>
    </aside>
  );
}
```


### `src/components/Topbar.tsx`

```tsx
import type { ReactNode } from 'react';
import type { Admin } from '@/lib/types';
import type { Theme } from '@/hooks/use-theme';
import { Avatar, Badge, Button } from './Common';

/**
 * Bilah atas: jejak halaman di kiri, pencarian global dan sakelar tema di
 * kanan. Tingginya dikunci ke token `topbar` (56px) supaya sebaris dengan blok
 * merek di sidebar, dan latarnya semi-transparan agar isi halaman terlihat
 * lewat saat digulir.
 */
export function Topbar({
  jejak,
  cari,
  theme,
  onGantiTema,
  admin,
  onKeluar,
}: {
  jejak: string[];
  cari?: ReactNode;
  theme: Theme;
  onGantiTema: () => void;
  admin: Admin;
  onKeluar: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-topbar items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
      {/* Merek hanya muncul di layar sempit, saat sidebar disembunyikan. */}
      <span className="flex items-center gap-2 md:hidden">
        <span className="text-sm font-semibold">KanPOS</span>
        <Badge variant="destructive" size="sm">
          ADMIN
        </Badge>
      </span>

      <nav
        aria-label="Jejak halaman"
        className="hidden min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground md:flex"
      >
        <span>Admin</span>
        {jejak.map((j, i) => (
          <span key={j} className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden="true">›</span>
            <span className={i === jejak.length - 1 ? 'truncate font-medium text-foreground' : ''}>
              {j}
            </span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {cari}

        <Button
          variant="outline"
          size="icon"
          onClick={onGantiTema}
          title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
          aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
        >
          {theme === 'dark' ? (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
            </svg>
          )}
        </Button>

        {/* Di layar sempit sidebar tidak ada, jadi keluar hanya bisa dari sini. */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onKeluar}
          title="Keluar"
          aria-label="Keluar"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </Button>

        <Avatar nama={admin.name} bulat tone="muted" className="hidden md:grid" />
      </div>
    </header>
  );
}
```


### `src/components/Login.tsx`

```tsx
import Logo from './Logo';
import { GoogleLogin } from '@react-oauth/google';
import { Alert, Card } from './Common';

/**
 * Login tetap lewat Google, tapi credential-nya ditukar sekali dengan sesi
 * milik backend. Akun harus sudah ada dan sudah berperan admin — panel ini
 * tidak membuat pengguna baru.
 */
export function Login({
  onCredential,
  onGoogleError,
  error,
  memuat,
}: {
  onCredential: (idToken: string) => void;
  /** Kegagalan di sisi Google (origin belum terdaftar, popup ditutup/diblokir). */
  onGoogleError: (pesan: string) => void;
  error?: string | null;
  memuat?: boolean;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-[400px] p-7">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-9 flex-none" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold">Admin KanPOS</h1>
            <p className="text-xs text-muted-foreground">
              Panel internal tim · bukan untuk pelanggan
            </p>
          </div>
        </div>

        <p className="mt-5 text-[13px] text-muted-foreground">
          Masuk dengan akun Google yang sudah terdaftar sebagai admin. Sesi berlaku 8 jam.
        </p>

        <div className="mt-5 flex min-h-[44px] justify-center">
          {memuat ? (
            <span className="self-center text-[13px] text-muted-foreground">Memeriksa akses…</span>
          ) : (
            <GoogleLogin
              onSuccess={(res) =>
                res.credential
                  ? onCredential(res.credential)
                  : onGoogleError('Google tidak mengirim token. Coba masuk lagi.')
              }
              // Dulu diabaikan diam-diam, sehingga origin yang belum terdaftar di
              // Google Cloud Console tampak seperti tombol yang tidak bereaksi.
              onError={() =>
                onGoogleError(
                  `Login Google gagal. Pastikan ${window.location.origin} terdaftar sebagai Authorized JavaScript origin di Google Cloud Console, lalu coba lagi.`,
                )
              }
              locale="id"
              width="336"
            />
          )}
        </div>

        {error && (
          <Alert
            variant="destructive"
            className="mt-4"
            title={error}
            icon={
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
            }
          />
        )}

        <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
          Belum punya akses? Minta superadmin menjalankan{' '}
          <code className="kode rounded border border-border bg-muted px-1 py-0.5">
            npm run admin -- promote &lt;email&gt;
          </code>{' '}
          di backend. Setiap tindakan di panel ini tercatat di audit log.
        </p>
      </Card>
    </div>
  );
}
```

