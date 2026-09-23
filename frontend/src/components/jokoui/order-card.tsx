import * as React from 'react';
import { type IconComponent } from '@/components/icons';

import { cn } from '@/lib/utils';
import { Badge } from './badge';

interface OrderCardProps {
  title: React.ReactNode;
  orderId: React.ReactNode;
  meta?: React.ReactNode;
  status?: {
    label: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'info';
    icon?: IconComponent;
  };
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/** Kartu bill/pesanan = Card Shark; bill terbuka diberi border warning/32. */
const OrderCard = React.forwardRef<HTMLDivElement, OrderCardProps>(
  ({ title, orderId, meta, status, onClick, className, children }, ref) => {
    const StatusIcon = status?.icon;
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'relative w-[262px] shrink-0 rounded-xl border bg-card p-3 shadow-xs transition-all',
          status?.variant === 'warning' ? 'border-warning/30' : 'border-border',
          onClick && 'cursor-pointer hover:bg-muted/40 active:scale-[0.99]',
          className,
        )}
      >
        <div className="flex flex-col gap-0.5 pr-20">
          <p className="truncate text-sm font-medium leading-snug text-foreground">{title}</p>
          <p className="truncate text-base font-semibold leading-tight tabular-nums text-foreground">{orderId}</p>
          {meta && <p className="truncate text-xsm text-muted-foreground">{meta}</p>}
        </div>
        {status && (
          <Badge variant={status.variant ?? 'default'} size="sm" className="absolute right-3 top-3">
            {StatusIcon && <StatusIcon className="h-3 w-3" />}
            {status.label}
          </Badge>
        )}
        {children}
      </div>
    );
  },
);
OrderCard.displayName = 'OrderCard';

export { OrderCard };
