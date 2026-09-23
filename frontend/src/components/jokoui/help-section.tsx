import * as React from 'react';
import { type IconComponent, Info } from '@/components/icons';

import { cn } from '@/lib/utils';
import { Button } from './button';

interface HelpSectionProps {
  imageSrc?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  ctaLabel?: React.ReactNode;
  ctaIcon?: IconComponent;
  onCtaClick?: () => void;
  className?: string;
}

/** Kartu bantuan = Item Shark: ikon muted 40px, judul 14/500, deskripsi 13, tombol secondary sm. */
const HelpSection = React.forwardRef<HTMLDivElement, HelpSectionProps>(
  ({ title, description, ctaLabel, ctaIcon: CtaIcon = Info, onCtaClick, className }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs', className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <CtaIcon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-medium leading-snug">{title}</p>}
        {description && <p className="mt-0.5 text-xsm leading-snug text-muted-foreground">{description}</p>}
      </div>
      {ctaLabel && (
        <Button variant="secondary" size="sm" className="shrink-0" onClick={onCtaClick}>
          {ctaLabel}
        </Button>
      )}
    </div>
  ),
);
HelpSection.displayName = 'HelpSection';

export { HelpSection };
