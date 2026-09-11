import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Segment Group — port `registry/react/components/segment-group.tsx` Shark:
 * deretan chip `rounded-lg h-8 px-3 text-[13px] font-medium`, item aktif
 * berlatar `bg-input`, bukan pil biru solid. Dipakai untuk filter kategori
 * di Kasir dan filter status di Riwayat.
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
              'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-transparent px-3 text-[13px] font-medium transition-colors',
              'outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
              active ? 'bg-input text-foreground' : 'text-muted-foreground hover:text-foreground',
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
