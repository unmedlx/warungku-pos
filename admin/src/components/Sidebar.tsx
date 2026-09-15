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
