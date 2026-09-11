import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Data List Shark: pasangan label–nilai dipisah garis tipis.
 * Baris `total` memakai border atas warna foreground dan tebal 600.
 */
const DataList = React.forwardRef<HTMLDListElement, React.HTMLAttributes<HTMLDListElement>>(
  ({ className, ...props }, ref) => (
    <dl ref={ref} data-slot="data-list" className={cn('flex flex-col', className)} {...props} />
  ),
);
DataList.displayName = 'DataList';

interface DataListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  total?: boolean;
  valueClassName?: string;
}

const DataListRow = React.forwardRef<HTMLDivElement, DataListRowProps>(
  ({ className, label, value, total, valueClassName, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="data-list-row"
      className={cn(
        'flex items-baseline justify-between gap-3 py-2 text-sm',
        'border-t border-border first:border-t-0',
        total && 'border-t-foreground font-semibold',
        className,
      )}
      {...props}
    >
      <dt className={cn('min-w-0', total ? 'text-foreground' : 'text-muted-foreground')}>{label}</dt>
      <dd className={cn('shrink-0 font-medium tabular-nums', valueClassName)}>{value}</dd>
    </div>
  ),
);
DataListRow.displayName = 'DataListRow';

export { DataList, DataListRow };
