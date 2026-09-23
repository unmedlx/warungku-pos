import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Card — permukaan dasar dunia visual "Dibagi Per Peran".
 *
 * Satu tingkat elevasi, dan hanya SATU cara memisahkan permukaan dari
 * ground-nya: terang memakai bayangan, gelap memakai garis. Tidak pernah
 * dua-duanya sekaligus — garis 1px plus bayangan 24px adalah tanda paling
 * jelas bahwa kartunya dirakit, bukan dirancang, dan di mode gelap bayangan
 * itu memang tidak terbaca sama sekali.
 *
 * Padding tetap `p-4`/`px-4` supaya pemanggil lama yang menulis
 * `<CardContent className="p-3">` tidak ikut bergeser.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        'rounded-xl bg-card text-card-foreground',
        'border border-transparent shadow-lift',
        'dark:border-border dark:shadow-none',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-header" className={cn('grid gap-1 p-4', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} data-slot="card-title" className={cn('text-base font-semibold leading-6 text-foreground', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

/** Slot aksi di pojok kanan atas header (Shark `CardAction`). */
const CardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-action" className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)} {...props} />
  ),
);
CardAction.displayName = 'CardAction';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-content" className={cn('p-4', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

/** Footer: permukaan cekung, dipisah garis tipis dari isi kartunya. */
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn('flex items-center gap-2 rounded-b-xl border-t border-border bg-muted/50 px-4 py-3', className)}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardAction };
