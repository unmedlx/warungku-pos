import * as React from 'react';
import { ChevronLeft, type IconComponent } from '@/components/icons';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { Button } from './button';

interface PageHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Diterima demi kompat; header Shark polos tidak menggambar ikon halaman. */
  icon?: IconComponent;
  /** Avatar 40px di kiri judul (mis. logo toko di Beranda). */
  avatar?: React.ReactNode;
  backTo?: string;
  onBack?: () => void;
  /** Tombol ikon di ujung kanan (dirender sebagai Button outline size icon). */
  inlineActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  /**
   * `dipped` menempelkan header ke atas bidang brand yang dicelup — dipakai
   * halaman bertata-bahasa dompet (kasir, pembayaran, laporan), di mana
   * header dan nominal adalah satu objek, bukan dua lapis yang ditumpuk.
   */
  tone?: 'ground' | 'dipped';
}

/**
 * Header halaman gaya Shark: polos 56px, judul 18/600 di kiri, aksi di kanan.
 * Menggantikan pil putih + lingkaran ikon biru dari design Figma lama —
 * Shark tidak punya "pill header", dan judul yang menempel di tepi kiri
 * lebih mudah dipindai daripada judul di tengah pil.
 */
const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, subtitle, avatar, backTo, onBack, inlineActions, children, className, tone = 'ground' }, ref) => {
    const dipped = tone === 'dipped';
    const backVariant = dipped ? 'on-brand' : 'ghost';
    const back =
      onBack ? (
        <Button variant={backVariant} size="icon-sm" className="-ml-1 shrink-0" onClick={onBack} aria-label="Kembali">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      ) : backTo ? (
        <Button asChild variant={backVariant} size="icon-sm" className="-ml-1 shrink-0" aria-label="Kembali">
          <Link to={backTo}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
      ) : null;

    return (
      <div
        ref={ref}
        data-slot="page-header"
        className={cn(
          '-mx-4 flex items-center gap-2.5 px-4 md:-mx-8 md:px-8',
          dipped
            ? 'mb-3 min-h-[2.75rem] text-primary-foreground'
            : /* Latar pejal, bukan backdrop-blur: di WebView HP kelas bawah
                 blur dibayar setiap frame gulir, dan di bawah matahari ia
                 menurunkan kontras judul yang paling sering dibaca. */
              'sticky top-0 z-30 mb-3 h-14 bg-background',
          className,
        )}
      >
        {back}
        {avatar && <div className="shrink-0">{avatar}</div>}
        <div className="min-w-0 flex-1">
          {title && (
            <h1 className="truncate text-heading font-bold leading-tight tracking-[-0.02em]">{title}</h1>
          )}
          {subtitle && (
            <p className={cn('truncate text-2xs leading-tight', dipped ? 'text-primary-dim' : 'text-muted-foreground')}>
              {subtitle}
            </p>
          )}
        </div>
        {(inlineActions || children) && (
          <div className="flex shrink-0 items-center gap-1.5">
            {inlineActions}
            {children}
          </div>
        )}
      </div>
    );
  },
);
PageHeader.displayName = 'PageHeader';

export { PageHeader };
