import * as React from 'react';
import { ChevronLeft, type IconComponent } from '@/components/icons';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { Button } from './button';

interface HeaderLeftProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: IconComponent;
  avatar?: React.ReactNode;
  backTo?: string;
  onBack?: () => void;
  className?: string;
}

/** Sub-header inline gaya Shark: tombol kembali ghost + judul 16/600 + subjudul 12 muted. */
const HeaderLeft = React.forwardRef<HTMLDivElement, HeaderLeftProps>(
  ({ title, subtitle, icon: Icon, avatar, backTo, onBack, className }, ref) => (
    <div ref={ref} className={cn('flex h-12 items-center gap-2', className)}>
      {onBack ? (
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={onBack} aria-label="Kembali">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      ) : backTo ? (
        <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0" aria-label="Kembali">
          <Link to={backTo}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
      ) : null}
      {avatar ? (
        <div className="shrink-0">{avatar}</div>
      ) : Icon ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        {title && <h2 className="truncate text-base font-semibold leading-tight tracking-tight">{title}</h2>}
        {subtitle && <p className="truncate text-xs leading-tight text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  ),
);
HeaderLeft.displayName = 'HeaderLeft';

export { HeaderLeft };
