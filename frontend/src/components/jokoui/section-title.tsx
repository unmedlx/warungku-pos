import * as React from 'react';

import { cn } from '@/lib/utils';

interface SectionTitleProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Judul seksi Shark: 14/600, deskripsi 13 muted, aksi (link primary) di kanan. */
const SectionTitle = React.forwardRef<HTMLDivElement, SectionTitleProps>(
  ({ title, description, action, className }, ref) => (
    <div ref={ref} className={cn('mb-2 flex items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold leading-tight text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0 text-sm font-medium text-primary">{action}</div>}
    </div>
  ),
);
SectionTitle.displayName = 'SectionTitle';

export { SectionTitle };
