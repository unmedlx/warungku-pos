import * as React from 'react';

import { cn } from '@/lib/utils';

interface OverviewRowProps {
  icon?: React.ReactNode;
  iconClassName?: string;
  label: React.ReactNode;
  progress?: number;
  amount: React.ReactNode;
  delta?: number | null;
  formatDelta?: (delta: number) => string;
  deltaTitle?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Baris ringkasan (metode bayar / kategori) gaya Shark: media 40px rounded-xl,
 * label 14/500, progress bar 6px, nominal tabular, delta = Badge tint.
 */
const OverviewRow = React.forwardRef<HTMLDivElement, OverviewRowProps>(
  ({ icon, iconClassName, label, progress, amount, delta, formatDelta, deltaTitle, onClick, className }, ref) => {
    const Comp = onClick ? 'button' : 'div';
    const pct = progress == null ? null : Math.min(100, Math.max(0, progress));
    const deltaLabel = delta == null ? null : formatDelta ? formatDelta(delta) : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;

    return (
      <Comp
        ref={ref as never}
        {...(onClick ? { type: 'button' as const, onClick } : {})}
        className={cn(
          'flex w-full items-center gap-3 py-2.5 text-left',
          onClick && 'transition-colors hover:bg-muted/40 active:bg-muted',
          className,
        )}
      >
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground', iconClassName)}>
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium leading-snug">{label}</span>
          {pct != null && (
            <span className="mt-1.5 block h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </span>
          )}
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-semibold leading-none tabular-nums">{amount}</span>
          {deltaLabel && (
            <span
              title={deltaTitle}
              aria-label={deltaTitle ? `${deltaLabel} ${deltaTitle}` : undefined}
              className={cn(
                'inline-flex h-5 items-center rounded-md border px-1 text-2xs font-medium leading-none tabular-nums',
                (delta ?? 0) >= 0 ? 'border-success/20 bg-success/10 text-success-text' : 'border-destructive-text/20 bg-destructive/10 text-destructive-text',
              )}
            >
              {deltaLabel}
            </span>
          )}
        </span>
      </Comp>
    );
  },
);
OverviewRow.displayName = 'OverviewRow';

export { OverviewRow };
