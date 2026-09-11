import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Avatar — port `registry/react/components/avatar.tsx` milik Shark UI:
 * bulat, `bg-muted` untuk fallback, ring border tipis lewat `ring-1`.
 *
 * Ukuran lama (36/44/46/72) dipertahankan; `tone="brand"` = fill primary,
 * `accent` = tint primary 10%.
 */
type Size = 'xs' | 'sm' | 'default' | 'md' | 'lg';
type Tone = 'accent' | 'brand' | 'muted';

const SIZES: Record<Size, string> = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-9 w-9 text-xs',
  default: 'h-11 w-11 text-sm',
  md: 'h-12 w-12 text-sm',
  lg: 'h-[72px] w-[72px] text-xl',
};

const TONES: Record<Tone, string> = {
  accent: 'bg-primary/10 text-primary',
  brand: 'bg-primary text-primary-foreground',
  muted: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
};

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: Size | null;
  tone?: Tone | null;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, tone, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="avatar"
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-medium',
        SIZES[(size ?? 'default') as Size],
        TONES[(tone ?? 'accent') as Tone],
        className,
      )}
      {...props}
    />
  ),
);
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, ...props }, ref) => (
    <img ref={ref} className={cn('aspect-square h-full w-full object-cover', className)} {...props} />
  ),
);
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex h-full w-full items-center justify-center', className)} {...props} />
  ),
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
