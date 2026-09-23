import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

/**
 * Item — port `registry/react/components/item.tsx` milik Shark UI:
 * baris `rounded-xl border p-3 gap-3`, media 40px `rounded-xl`, konten
 * judul 14/500 + deskripsi 13 muted, aksi di kanan.
 *
 * `variant="flat"` = tanpa border/radius, untuk baris di dalam Card yang
 * dipisah garis (`divide-y`).
 */
interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  variant?: 'outline' | 'flat';
  interactive?: boolean;
}

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ className, asChild, variant = 'outline', interactive, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        ref={ref}
        data-slot="item"
        className={cn(
          'group/item flex w-full items-center gap-3 text-left text-sm',
          variant === 'outline' ? 'rounded-xl border border-border bg-card p-3 shadow-xs' : 'px-4 py-3',
          interactive && 'cursor-pointer transition-colors hover:bg-muted/60 active:bg-muted',
          'outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
          className,
        )}
        {...props}
      />
    );
  },
);
Item.displayName = 'Item';

type Tone = 'muted' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';

const MEDIA_TONE: Record<Tone, string> = {
  muted: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success-text',
  warning: 'bg-warning/10 text-warning-text',
  destructive: 'bg-destructive/10 text-destructive-text',
  info: 'bg-info/10 text-info-text',
};

interface ItemMediaProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  size?: 'sm' | 'default' | 'lg';
}

const ItemMedia = React.forwardRef<HTMLDivElement, ItemMediaProps>(
  ({ className, tone = 'muted', size = 'default', ...props }, ref) => (
    <div
      ref={ref}
      data-slot="item-media"
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl',
        size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10',
        '[&_img]:h-full [&_img]:w-full [&_img]:object-cover',
        '[&_svg]:h-4.5 [&_svg]:w-4.5',
        MEDIA_TONE[tone],
        className,
      )}
      {...props}
    />
  ),
);
ItemMedia.displayName = 'ItemMedia';

const ItemContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="item-content" className={cn('flex min-w-0 flex-1 flex-col gap-0.5', className)} {...props} />
  ),
);
ItemContent.displayName = 'ItemContent';

const ItemTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="item-title" className={cn('line-clamp-1 text-sm font-medium leading-snug', className)} {...props} />
  ),
);
ItemTitle.displayName = 'ItemTitle';

const ItemDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="item-description" className={cn('line-clamp-1 text-xsm leading-snug text-muted-foreground', className)} {...props} />
  ),
);
ItemDescription.displayName = 'ItemDescription';

const ItemActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="item-actions" className={cn('flex shrink-0 items-center gap-1.5', className)} {...props} />
  ),
);
ItemActions.displayName = 'ItemActions';

const ItemGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="item-group" className={cn('flex w-full flex-col gap-2', className)} {...props} />
  ),
);
ItemGroup.displayName = 'ItemGroup';

export { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup };
export type { Tone as ItemTone };
