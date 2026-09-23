import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card } from './card';

interface SettingsGroupProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Kelompok pengaturan: judul seksi 14/600 + Card berisi Item flat dipisah garis. */
const SettingsGroup = React.forwardRef<HTMLDivElement, SettingsGroupProps>(
  ({ title, description, children, className }, ref) => (
    <section ref={ref} className={cn('mb-4', className)}>
      {(title || description) && (
        <div className="mb-2">
          {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      <Card className="divide-y divide-border overflow-hidden">{children}</Card>
    </section>
  ),
);
SettingsGroup.displayName = 'SettingsGroup';

interface SettingsItemProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  description?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'button' | 'div';
  interactive?: boolean;
}

/** Baris pengaturan = Item flat Shark: media 40px, judul 14/500, deskripsi 13 muted. */
const SettingsItem = React.forwardRef<HTMLButtonElement | HTMLDivElement, SettingsItemProps>(
  ({ icon, label, description, trailing, children, className, onClick, as = 'div', interactive }, ref) => {
    const Comp = as as React.ElementType;
    return (
      <Comp
        ref={ref as React.Ref<HTMLElement>}
        onClick={onClick}
        {...(as === 'button' ? { type: 'button' } : {})}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left text-sm',
          (onClick || interactive) && 'cursor-pointer transition-colors hover:bg-muted/60 active:bg-muted',
          className,
        )}
      >
        {icon && <div className="shrink-0 [&>div]:h-10 [&>div]:w-10 [&>div]:rounded-xl">{icon}</div>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-snug">{label}</p>
          {description && <p className="mt-0.5 truncate text-xsm leading-snug text-muted-foreground">{description}</p>}
        </div>
        {trailing && <div className="flex shrink-0 items-center gap-2 text-muted-foreground">{trailing}</div>}
        {children}
      </Comp>
    );
  },
);
SettingsItem.displayName = 'SettingsItem';

export { SettingsGroup, SettingsItem };
