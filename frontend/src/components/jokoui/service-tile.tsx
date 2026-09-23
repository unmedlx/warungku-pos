import * as React from 'react';
import { Link } from 'react-router-dom';

import type { IconComponent } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * ServiceTile — setengah kedua dari dunia visual "Dibagi Per Peran".
 *
 * Di layar yang pekerjaannya memilih (beranda, menu, stok, pengaturan),
 * strukturnya adalah kisi ubin berwarna: satu petak satu tindakan, ikon
 * tebal di atas label pendek.
 *
 * Warna di sini BUKAN hiasan, ia sistem pengenal. Satu urusan memegang satu
 * nomor kategori di seluruh app — di ubin menu, pita kategori kasir,
 * thumbnail produk, dan ikon daftar transaksi — supaya mata belajar sekali
 * lalu memakainya di mana-mana. Karena itu nomornya dipilih per tujuan dan
 * dicatat di `TILE_TONE`, bukan ditebak di tempat pemakaian.
 *
 * Ikonnya digambar (Lucide), tidak pernah emoji, dan tintanya memakai
 * `cat-N-on` — versi yang digelapkan terhadap tint-nya, supaya tetap lolos
 * 3:1 di layar HP murah di bawah matahari.
 */
export type TileTone = 1 | 2 | 3 | 4 | 5 | 6;

const TONE_CLASS: Record<TileTone, string> = {
  1: 'bg-cat-1-bg text-cat-1-on',
  2: 'bg-cat-2-bg text-cat-2-on',
  3: 'bg-cat-3-bg text-cat-3-on',
  4: 'bg-cat-4-bg text-cat-4-on',
  5: 'bg-cat-5-bg text-cat-5-on',
  6: 'bg-cat-6-bg text-cat-6-on',
};

export interface ServiceTileProps {
  to: string;
  icon: IconComponent;
  label: React.ReactNode;
  tone: TileTone;
  /** Angka kecil di pojok ikon, mis. jumlah kasbon jatuh tempo. */
  count?: number;
  className?: string;
}

export function ServiceTile({ to, icon: Icon, label, tone, count, className }: ServiceTileProps) {
  return (
    <Link
      to={to}
      data-slot="service-tile"
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl px-1 py-3',
        'text-foreground no-underline transition-colors active:bg-accent',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'motion-reduce:transition-none',
        className,
      )}
    >
      <span className={cn('relative flex h-12 w-12 items-center justify-center rounded-2xl', TONE_CLASS[tone])}>
        <Icon className="h-5.5 w-5.5" />
        {count != null && count > 0 && (
          <span
            className={cn(
              'absolute -right-1 -top-1 min-w-[1.15rem] rounded-full px-1.5',
              'border-2 border-background bg-destructive text-destructive-foreground',
              'text-3xs font-extrabold leading-[1.05rem] tabular-nums',
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      {/* Kotak label setinggi dua baris: label satu kata dan label dua kata
          harus menempati ruang yang sama, kalau tidak barisnya terbaca
          ragged. Tiga bahasa membuat panjang label berubah cukup jauh. */}
      <span className="flex min-h-[2.1rem] items-start justify-center text-center text-2xs font-semibold leading-tight tracking-[-0.01em]">{label}</span>
    </Link>
  );
}

/**
 * Kisi ubin. Empat kolom di HP — lebar yang membuat label dua kata masih
 * muat dalam satu baris pada ketiga bahasa, dan melebar di tablet.
 */
const TileGrid = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="tile-grid"
      className={cn('grid grid-cols-4 gap-x-1.5 gap-y-2 md:grid-cols-6 lg:grid-cols-8', className)}
      {...props}
    />
  ),
);
TileGrid.displayName = 'TileGrid';

export { TileGrid };
