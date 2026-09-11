import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Button — port `registry/react/components/button.tsx` milik Shark UI.
 *
 * Kelas dasarnya disalin apa adanya (rounded-lg, font-medium text-sm, ring
 * fokus 3px ring/32, disabled opacity 64, svg size-4, click effect scale .98).
 * Yang beda dari Shark: skala ukurannya digeser satu tingkat — `default`
 * di sini = `lg` Shark (h-9) karena layar ini disentuh jari, bukan kursor.
 *
 * Varian lama (`gradient`, `glass`, `success`, `tertiary`) dipertahankan
 * sebagai alias supaya 17 halaman tidak perlu ikut diubah.
 */
const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2',
    'whitespace-nowrap font-medium text-sm',
    'rounded-lg border border-transparent',
    'transition-all',
    'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
    'disabled:pointer-events-none disabled:opacity-60',
    'active:scale-[0.98]',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="h-"])]:h-4 [&_svg:not([class*="w-"])]:w-4',
    'motion-reduce:transition-none',
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-primary hover:bg-primary/90 focus-visible:border-background',
        outline:
          'bg-transparent text-foreground border-input shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:hover:bg-input/60 focus-visible:border-primary',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:border-primary',
        ghost: 'hover:bg-accent hover:text-accent-foreground focus-visible:border-primary',
        destructive: 'bg-destructive text-white shadow-destructive hover:bg-destructive/90 focus-visible:border-background',
        link: 'text-primary underline-offset-4 hover:underline h-auto px-0',
        success: 'bg-success text-white shadow-sm hover:bg-success/90 focus-visible:border-background',
        /* alias warisan */
        gradient: 'bg-primary text-primary-foreground shadow-primary hover:bg-primary/90',
        glass: 'bg-foreground/5 border-border text-foreground hover:bg-foreground/10',
        tertiary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      },
      size: {
        xs: 'h-6 gap-1.5 px-2 text-xs rounded-sm [&_svg:not([class*="h-"])]:h-2.5 [&_svg:not([class*="w-"])]:w-2.5',
        sm: 'h-8 px-2.5 gap-1.5 [&_svg:not([class*="h-"])]:h-3.5 [&_svg:not([class*="w-"])]:w-3.5',
        default: 'h-9 px-3.5',
        lg: 'h-10 px-4 text-base',
        xl: 'h-11 px-5 text-base',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-10 w-10 p-0 [&_svg:not([class*="h-"])]:h-5 [&_svg:not([class*="w-"])]:w-5',
      },
      pill: {
        true: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, pill, asChild = false, isLoading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={variant ?? 'default'}
        data-size={size ?? 'default'}
        aria-busy={isLoading || undefined}
        className={cn(buttonVariants({ variant, size, pill }), isLoading && 'pointer-events-none', className)}
        {...props}
      >
        {isLoading ? (
          <>
            <span aria-hidden className="invisible contents">{children}</span>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
