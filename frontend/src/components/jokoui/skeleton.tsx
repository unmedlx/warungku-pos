import * as React from 'react';

import { cn } from '@/lib/utils';

/** Skeleton Shark: `bg-muted rounded-lg animate-pulse`. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-lg bg-muted', className)} {...props} />;
}

export { Skeleton };
