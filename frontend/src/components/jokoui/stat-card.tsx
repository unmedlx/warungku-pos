import * as React from 'react';
import { type IconComponent } from '@/components/icons';

import { cn } from '@/lib/utils';
import { Card } from './card';

interface StatCardProps {
  icon?: IconComponent;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Kelas warna untuk nilai (mis. `text-destructive-text`). Kompat: kelas blob lama diabaikan. */
  color?: string;
  valueClassName?: string;
  size?: 'default' | 'sm';
  className?: string;
}

/**
 * Stat tile Shark: label 12 muted di atas, angka 18–22/600 tabular di bawah.
 * Tanpa blob ikon — di kanvas 3 kolom ikon hanya memakan ruang angka.
 */
const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, sub, valueClassName, size = 'default', className }, ref) => {
    const isSm = size === 'sm';
    return (
      <Card ref={ref} className={cn('min-w-0', isSm ? 'p-3' : 'p-3.5', className)}>
        <p className={cn('truncate font-medium text-muted-foreground', isSm ? 'text-[11px]' : 'text-xs')}>{label}</p>
        <p className={cn('mt-1 break-words font-semibold leading-tight tracking-tight tabular-nums', isSm ? 'text-base' : 'text-lg', valueClassName)}>
          {value}
        </p>
        {sub && <p className={cn('mt-0.5 truncate text-muted-foreground', isSm ? 'text-[11px]' : 'text-xs')}>{sub}</p>}
      </Card>
    );
  },
);
StatCard.displayName = 'StatCard';

export { StatCard };
