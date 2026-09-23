import * as React from 'react';

import { cn } from '@/lib/utils';
import { TONE_SOLID } from '@/lib/tones';
import type { TileTone } from './service-tile';

/**
 * CategoryChip — pita penyaring kategori di Kasir dan daftar produk.
 *
 * Titik warna di kiri label adalah jembatan sistem pengenal: warna yang
 * sama muncul di thumbnail produk dan ubin menu, jadi pemilik warung bisa
 * menyaring dengan mengenali warnanya sebelum sempat membaca labelnya.
 *
 * Chip aktif dicelup brand penuh — bukan sekadar border yang menebal.
 * Di layar yang dipakai ratusan kali sehari, status terpilih harus terbaca
 * dari sudut mata.
 */
export interface CategoryChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** Tanpa nomor kategori (mis. chip "Semua") titiknya tidak digambar. */
  tone?: TileTone;
}

const CategoryChip = React.forwardRef<HTMLButtonElement, CategoryChipProps>(
  ({ className, active = false, tone, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      data-slot="category-chip"
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5',
        'text-xsm font-semibold tracking-[-0.01em] whitespace-nowrap',
        'transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'motion-reduce:transition-none',
        active
          ? 'border border-primary bg-primary text-primary-foreground'
          : 'border border-border bg-card text-muted-foreground active:bg-accent',
        className,
      )}
      {...props}
    >
      {tone != null && (
        <span
          aria-hidden
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-white/75' : TONE_SOLID[tone])}
        />
      )}
      {children}
    </button>
  ),
);
CategoryChip.displayName = 'CategoryChip';

/** Pita horizontal yang bisa digeser, tanpa scrollbar yang terlihat. */
const CategoryStrip = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="category-strip"
      className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-hide', className)}
      {...props}
    />
  ),
);
CategoryStrip.displayName = 'CategoryStrip';

export { CategoryChip, CategoryStrip };
