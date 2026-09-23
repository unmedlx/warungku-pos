import type { ReactNode } from 'react';
import Logo from './Logo';
import type { Admin } from '@/lib/types';
import { Avatar, Badge, Button } from './Common';
import { cn } from '@/lib/cn';

export type Halaman =
  | 'ringkasan'
  | 'antrean'
  | 'pengguna'
  | 'pembayaran'
  | 'paket'
  | 'rilis'
  | 'audit'
  | 'admin';

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

const IKON: Record<Halaman, ReactNode> = {
  ringkasan: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  antrean: (
    <>
      <path d="M3 12h4l2 3h6l2-3h4" />
      <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </>
  ),
  pengguna: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 11.2a3 3 0 0 0 0-6M18 20a5.5 5.5 0 0 0-3-4.9" />
    </>
  ),
  pembayaran: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  paket: (
    <>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 12l9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  rilis: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  audit: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
};

/**
 * Menu dikelompokkan menurut **objek yang diurus**, bukan kata kerja.
 * Pembagian lama (Pantau / Kelola) rancu karena satu halaman hampir selalu
 * dipantau sekaligus dikelola: Transaksi punya tombol rekonsiliasi tapi ada di
 * "Pantau", sementara Audit log yang cuma bisa dibaca ada di "Kelola".
 *
 * Dua tujuan yang paling sering dibuka (Ringkasan, Antrean kerja) sengaja
 * berdiri tanpa judul grup di paling atas supaya jaraknya paling pendek.
 */
const GRUP: { judul: string | null; item: Halaman[] }[] = [
  { judul: null, item: ['ringkasan', 'antrean'] },
  { judul: 'Pelanggan', item: ['pengguna', 'pembayaran'] },
  { judul: 'Produk', item: ['paket', 'rilis'] },
  { judul: 'Sistem', item: ['audit', 'admin'] },
];

export const LABEL: Record<Halaman, string> = {
  ringkasan: 'Ringkasan',
  antrean: 'Antrean kerja',
  pengguna: 'Pengguna',
  pembayaran: 'Pembayaran',
  paket: 'Paket & harga',
  rilis: 'Rilis aplikasi',
  audit: 'Audit log',
  admin: 'Kelola admin',
};

/** Nama grup tempat sebuah halaman berada — dipakai breadcrumb di topbar. */
export const GRUP_DARI: Partial<Record<Halaman, string>> = Object.fromEntries(
  GRUP.flatMap((g) => (g.judul ? g.item.map((i) => [i, g.judul!] as const) : [])),
);

const ITEM =
  'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-sm font-medium transition-colors';

function Tautan({
  halaman,
  aktif,
  ciut,
  onClick,
  jumlah,
}: {
  halaman: Halaman;
  aktif: boolean;
  ciut: boolean;
  onClick: () => void;
  jumlah?: number;
}) {
  const label = LABEL[halaman];
  return (
    <button
      onClick={onClick}
      aria-current={aktif ? 'page' : undefined}
      // Saat menyusut jadi rail, label yang hilang digantikan `title` supaya
      // ikonnya tetap bisa dikenali tanpa menebak.
      title={ciut ? label : undefined}
      className={cn(
        ITEM,
        ciut && 'justify-center px-0 py-2',
        aktif
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {/* Penanda tepi kiri: menandai halaman aktif tanpa bergantung warna saja. */}
      {aktif && (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary"
        />
      )}
      <Ikon d={IKON[halaman]} />
      {!ciut && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {jumlah !== undefined && jumlah > 0 && (
        <span
          title={`${jumlah} hal perlu ditangani`}
          className={cn(
            'grid place-items-center rounded-full bg-destructive/10 text-[11px] font-medium tabular-nums text-destructive-text',
            ciut
              ? 'absolute right-1.5 top-1 h-4 min-w-[16px] px-1'
              : 'ml-auto h-5 min-w-[20px] px-1.5',
          )}
        >
          {jumlah > 99 ? '99+' : jumlah}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  aktif,
  onPilih,
  admin,
  perluDitangani,
  onKeluar,
  ciut = false,
  onCiut,
}: {
  aktif: Halaman;
  onPilih: (h: Halaman) => void;
  admin: Admin;
  perluDitangani: number;
  onKeluar: () => void;
  /** Rail 64px: ikon saja. Dipakai di layar 13" supaya tabel lebih lega. */
  ciut?: boolean;
  onCiut?: () => void;
}) {
  return (
    <aside className="sticky top-0 flex h-screen flex-col border-r border-border bg-card">
      <div
        className={cn(
          'flex h-topbar flex-none items-center gap-2.5 border-b border-border',
          ciut ? 'justify-center px-0' : 'px-4',
        )}
      >
        <Logo className="h-7 w-7 flex-none" />
        {!ciut && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight">KanPOS</span>
              <span className="block text-[11px] leading-tight text-muted-foreground">
                Panel tim internal
              </span>
            </span>
            <Badge variant="destructive" size="sm">
              ADMIN
            </Badge>
          </>
        )}
      </div>

      <nav className={cn('flex-1 space-y-0.5 overflow-y-auto py-2', ciut ? 'px-2' : 'px-2.5')}>
        {GRUP.map((g, i) => (
          <div key={g.judul ?? 'utama'} className={cn(i > 0 && (ciut ? 'pt-3' : 'pt-1'))}>
            {g.judul &&
              (ciut ? (
                // Judul grup tidak muat di rail; garis tipis menggantikannya
                // supaya pengelompokannya tetap terbaca.
                <div aria-hidden="true" className="mx-2 mb-2 border-t border-border" />
              ) : (
                <div className="px-2.5 pb-1.5 pt-2 text-xs font-medium text-muted-foreground">
                  {g.judul}
                </div>
              ))}
            <div className="space-y-0.5">
              {g.item.map((h) => (
                <Tautan
                  key={h}
                  halaman={h}
                  aktif={aktif === h}
                  ciut={ciut}
                  onClick={() => onPilih(h)}
                  jumlah={h === 'antrean' ? perluDitangani : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-none border-t border-border p-2.5">
        <div className={cn('flex items-center gap-2.5', ciut && 'justify-center')}>
          <Avatar nama={admin.name} bulat tone="muted" />
          {!ciut && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{admin.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {admin.role === 'SUPERADMIN' ? 'Superadmin' : 'Admin'}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
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
            </>
          )}
        </div>

        {onCiut && (
          <button
            onClick={onCiut}
            title={ciut ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
            aria-label={ciut ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
            className={cn(
              'mt-1.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              ciut && 'justify-center px-0',
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 flex-none"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
              <path d={ciut ? 'm12 10 2 2-2 2' : 'm14 10-2 2 2 2'} />
            </svg>
            {!ciut && <span>Ciutkan sidebar</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
