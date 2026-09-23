import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Badge — port `registry/react/components/badge.tsx` milik Shark UI.
 * Status = tint 10% + border 20% + teks shade 700 (`*-text`), bukan blok
 * warna solid. `default` = foreground di atas background (netral pekat).
 *
 * Prop `shape="pill"` lama dipetakan ke `pill` Shark.
 */
const badgeVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-1',
    'select-none whitespace-nowrap font-medium text-xs leading-none',
    'rounded-md border border-transparent overflow-hidden',
    'transition-colors',
    '[&_svg]:pointer-events-none [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        success: 'bg-success/10 text-success-text border-success/20',
        info: 'bg-info/10 text-info-text border-info/20',
        warning: 'bg-warning/10 text-warning-text border-warning/20',
        destructive: 'bg-destructive/10 text-destructive-text border-destructive-text/20 dark:bg-destructive/5',
        /* alias warisan: dulu biru muda; sekarang tint primary */
        primary: 'bg-primary/10 text-primary border-primary/20',
      },
      size: {
        sm: 'h-5 min-w-5 px-1',
        default: 'h-5.5 min-w-5.5 px-1.5',
        lg: 'h-[26px] min-w-[26px] px-2 text-sm',
      },
      pill: {
        true: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Kompat: `shape="pill"` = `pill`. */
  shape?: 'default' | 'pill' | null;
}

function Badge({ className, variant, size, pill, shape, ...props }: BadgeProps) {
  const isPill = pill ?? shape === 'pill';
  return (
    <span
      data-slot="badge"
      data-variant={variant ?? 'default'}
      className={cn(badgeVariants({ variant, size, pill: isPill }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
