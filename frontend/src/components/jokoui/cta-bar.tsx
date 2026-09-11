import * as React from 'react';
import { type IconComponent } from '@/components/icons';

import { cn } from '@/lib/utils';

interface CtaBarProps {
  icon?: IconComponent;
  children?: React.ReactNode;
  /** Aksi di kanan — biasanya nominal atau label tombol. */
  action?: React.ReactNode;
  filled?: boolean;
  tone?: 'primary' | 'success';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Bar CTA (mis. "Bayar · Rp 45.000") gaya Shark: kotak `rounded-xl border`
 * ber-shadow-lg untuk versi mengambang, atau fill primary/success untuk
 * `filled`. Tinggi 48px, tanpa pil.
 */
const CtaBar = React.forwardRef<HTMLDivElement & HTMLButtonElement, CtaBarProps>(
  ({ icon: Icon, children, action, filled = false, tone = 'primary', onClick, disabled, className }, ref) => {
    const Comp = onClick ? 'button' : 'div';
    return (
      <Comp
        ref={ref as never}
        {...(onClick ? { type: 'button' as const, onClick, disabled } : {})}
        className={cn(
          'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-all',
          'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
          onClick && 'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60',
          filled
            ? tone === 'success'
              ? 'bg-success text-white shadow-sm'
              : 'bg-primary text-primary-foreground shadow-primary'
            : 'border border-border bg-popover text-foreground shadow-lg',
          className,
        )}
      >
        {Icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', filled ? 'bg-white/15' : 'bg-primary/10 text-primary')}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{children}</span>
        {action && (
          <span className={cn('shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums', filled ? 'bg-white/15' : 'bg-primary text-primary-foreground shadow-primary')}>
            {action}
          </span>
        )}
      </Comp>
    );
  },
);
CtaBar.displayName = 'CtaBar';

export { CtaBar };
