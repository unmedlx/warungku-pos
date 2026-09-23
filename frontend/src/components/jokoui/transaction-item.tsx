import * as React from 'react';
import { type IconComponent } from '@/components/icons';

import { cn } from '@/lib/utils';

interface TransactionItemProps {
  icon: IconComponent;
  /** Kelas warna media 40px (default: muted). */
  iconColor?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  amount?: React.ReactNode;
  amountClassName?: string;
  /** `row` = baris flat di dalam Card (dipisah garis); `card` = Item berbingkai sendiri. */
  variant?: 'row' | 'card';
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/** Baris transaksi = Item Shark: media 40px rounded-xl, judul 14/500, meta 13 muted, nominal tabular. */
const TransactionItem = React.forwardRef<HTMLDivElement, TransactionItemProps>(
  ({ icon: Icon, iconColor = 'bg-muted text-muted-foreground', title, meta, amount, amountClassName, variant = 'row', onClick, className, children }, ref) => (
    <div
      ref={ref}
      onClick={onClick}
      data-slot="item"
      className={cn(
        'flex w-full items-center gap-3 text-sm transition-colors',
        variant === 'card' ? 'rounded-xl border border-border bg-card p-3 shadow-xs' : 'px-4 py-3',
        onClick && 'cursor-pointer hover:bg-muted/60 active:bg-muted',
        className,
      )}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconColor)}>
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-snug text-foreground">{title}</p>
        {meta && <div className="mt-0.5 truncate text-xsm leading-snug text-muted-foreground">{meta}</div>}
      </div>
      {amount && <p className={cn('shrink-0 font-semibold tabular-nums text-foreground', amountClassName)}>{amount}</p>}
      {children}
    </div>
  ),
);
TransactionItem.displayName = 'TransactionItem';

export { TransactionItem };
