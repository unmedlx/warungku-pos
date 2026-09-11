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
}

/**
 * Header halaman gaya Shark: polos 56px, judul 18/600 di kiri, aksi di kanan.
 * Menggantikan pil putih + lingkaran ikon biru dari design Figma lama —
 * Shark tidak punya "pill header", dan judul yang menempel di tepi kiri
 * lebih mudah dipindai daripada judul di tengah pil.
 */
const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, subtitle, avatar, backTo, onBack, inlineActions, children, className }, ref) => {
    const back =
      onBack ? (
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={onBack} aria-label="Kembali">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      ) : backTo ? (
        <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0" aria-label="Kembali">
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
          'sticky top-0 z-30 -mx-4 mb-3 flex h-14 items-center gap-2.5 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-8 md:px-8',
          className,
        )}
      >
        {back}
        {avatar && <div className="shrink-0">{avatar}</div>}
        <div className="min-w-0 flex-1">
          {title && <h1 className="truncate text-lg font-semibold leading-tight tracking-tight">{title}</h1>}
          {subtitle && <p className="truncate text-xs leading-tight text-muted-foreground">{subtitle}</p>}
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
