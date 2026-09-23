import type { ReactNode } from 'react';
import type { Halaman } from './Sidebar';
import { cn } from '@/lib/cn';

/**
 * Navigasi bawah untuk layar sempit. Sidebar tetap ada sebagai drawer, tapi
 * empat tujuan yang paling sering dibuka pantas dijangkau satu ketukan tanpa
 * membuka menu lebih dulu. Tujuan selebihnya (Paket, Rilis, Audit, Kelola
 * admin) hanya lewat drawer — dipakai sesekali dan tidak sepadan dengan slot di
 * bilah yang cuma muat lima.
 */

function Ikon({ d }: { d: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}

const TUJUAN: { id: Halaman; label: string; ikon: ReactNode }[] = [
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
    id: 'antrean',
    label: 'Antrean',
    ikon: (
      <>
        <path d="M3 12h4l2 3h6l2-3h4" />
        <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
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
    id: 'pembayaran',
    label: 'Bayar',
    ikon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </>
    ),
  },
];

const TOMBOL =
  'relative flex flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-medium transition-colors';

export function BottomNav({
  aktif,
  onPilih,
  onLainnya,
  perluDitangani,
}: {
  aktif: Halaman;
  onPilih: (h: Halaman) => void;
  onLainnya: () => void;
  perluDitangani: number;
}) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TUJUAN.map((t) => (
        <button
          key={t.id}
          onClick={() => onPilih(t.id)}
          aria-current={aktif === t.id ? 'page' : undefined}
          className={cn(TOMBOL, aktif === t.id ? 'text-primary' : 'text-muted-foreground')}
        >
          <span className="relative">
            <Ikon d={t.ikon} />
            {t.id === 'antrean' && perluDitangani > 0 && (
              <span className="absolute -right-2.5 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-medium tabular-nums text-destructive-foreground">
                {perluDitangani > 9 ? '9+' : perluDitangani}
              </span>
            )}
          </span>
          {t.label}
        </button>
      ))}

      <button onClick={onLainnya} className={cn(TOMBOL, 'text-muted-foreground')}>
        <Ikon d={<path d="M4 7h16M4 12h16M4 17h16" />} />
        Lainnya
      </button>
    </nav>
  );
}
