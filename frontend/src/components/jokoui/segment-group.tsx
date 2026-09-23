import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Segment Group — deretan chip penyaring.
 *
 * Item aktif dicelup brand, bukan diberi latar `bg-input`. Pil abu di atas
 * bidang abu adalah persis perlakuan netral yang membuat app ini terbaca
 * generik, dan ia dipakai di layar-layar bertata-bahasa dompet (periode di
 * Laporan, status di Kasbon, filter di Riwayat) di mana status terpilih
 * justru harus terbaca dari sudut mata.
 *
 * Tingginya 36px, bukan 32px: chip ini disentuh jempol di HP murah.
 */
interface SegmentGroupProps<T extends string> {
  items: { value: T; label: React.ReactNode }[];
  value: T;
  onValueChange: (value: T) => void;
  /** `scroll` = satu baris menggulir horizontal (bleed -mx-4); `full` = dibagi rata. */
  layout?: 'scroll' | 'full' | 'inline';
  className?: string;
  'aria-label'?: string;
}

function SegmentGroup<T extends string>({ items, value, onValueChange, layout = 'inline', className, 'aria-label': ariaLabel }: SegmentGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-slot="segment-group"
      className={cn(
        'flex gap-2',
        layout === 'scroll' && '-mx-4 overflow-x-auto px-4 pb-0.5 scrollbar-hide md:-mx-8 md:px-8',
        layout === 'full' && 'w-full',
        className,
      )}
      style={layout === 'scroll' ? { WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' } : undefined}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-state={active ? 'checked' : 'unchecked'}
            onClick={() => onValueChange(item.value)}
            className={cn(
              'inline-flex h-9 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-3.5 text-xsm font-semibold tracking-[-0.01em] transition-colors',
              'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              'motion-reduce:transition-none',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              layout === 'full' && 'flex-1',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentGroup };
