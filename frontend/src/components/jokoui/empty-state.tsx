import * as React from 'react';
import { type IconComponent } from '@/components/icons';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: IconComponent;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Empty state Shark: ikon di kotak muted 48px rounded-xl, judul 14/500, deskripsi 13 muted. */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, className }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center px-4 py-10 text-center animate-fade-in', className)}
    >
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="text-sm font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';

export { EmptyState };
