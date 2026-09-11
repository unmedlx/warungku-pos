import * as React from 'react';

import { cn } from '@/lib/utils';

/** Progress Shark: track `bg-muted` rounded-full h-1.5, indikator primary. */
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  tone?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
}

const TONE: Record<NonNullable<ProgressProps['tone']>, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, tone = 'primary', ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        data-slot="progress"
        className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
        {...props}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-300', TONE[tone])} style={{ width: `${pct}%` }} />
      </div>
    );
  },
);
Progress.displayName = 'Progress';

export { Progress };
