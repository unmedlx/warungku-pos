<!-- Superdesign init — generated for `frontend` -->

# Components — `frontend`

Kankitu POS kasir app (Vite + React + TS, shadcn/ui + custom jokoui, Capacitor Android/Electron)

Shared UI primitives with FULL source. 92 files.

### `src/components/jokoui/alert-strip.tsx`

```tsx
import type { ReactNode } from 'react';
import { ChevronRight } from '@/components/icons';
import type { IconComponent } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Alert, AlertAction, AlertDescription, AlertTitle } from './alert';

/**
 * Baris peringatan di Beranda untuk kejadian yang bikin rugi diam-diam.
 * Kini = Alert Shark (bg 4% + border 32% + ikon berwarna) dengan chevron
 * sebagai aksi; seluruh baris bisa ditekan.
 */
export interface AlertStripProps {
  icon: IconComponent;
  title: ReactNode;
  description?: ReactNode;
  tone?: 'warning' | 'destructive' | 'info' | 'success';
  onClick?: () => void;
  className?: string;
}

export function AlertStrip({ icon: Icon, title, description, tone = 'warning', onClick, className }: AlertStripProps) {
  const content = (
    <Alert variant={tone} className={cn(onClick && 'transition-colors hover:bg-muted/40', className)}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription className="truncate">{description}</AlertDescription>}
      {onClick && (
        <AlertAction>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </AlertAction>
      )}
    </Alert>
  );

  if (!onClick) return content;

  return (
    <button type="button" onClick={onClick} className="block w-full rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 active:scale-[0.995]">
      {content}
    </button>
  );
}
```


### `src/components/jokoui/alert.tsx`

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Alert — port `registry/react/components/alert.tsx` milik Shark UI:
 * `rounded-xl border px-3.5 py-3`, grid ikon 16px + isi + aksi;
 * status = bg 4% + border 32% + ikon berwarna.
 *
 * Pemanggil menaruh `<svg>` sebagai anak pertama, lalu `AlertTitle`,
 * `AlertDescription`, dan opsional `AlertAction`. Baris tambahan (mis. tombol
 * CTA) dibungkus `AlertContent` supaya ikut kolom isi.
 *
 * Kolom isi ditentukan root lewat custom property `--alert-col`, bukan oleh
 * masing-masing anak. Versi sebelumnya memakai indeks negatif (`col-start-[-2]`)
 * yang menghitung dari garis terakhir grid *eksplisit*: pada template tiga
 * kolom itu jatuh di kolom aksi, bukan kolom isi — teks jadi terdorong ke
 * kanan dan aksi membuat kolom keempat implisit.
 */
const alertVariants = cva(
  [
    'relative grid w-full items-start gap-x-2 gap-y-0.5',
    'px-3.5 py-3 text-sm text-card-foreground',
    'rounded-xl border',
    // Template kolom mengikuti isi: ikon (16px) dan/atau kolom aksi hanya
    // dibuat kalau elemennya memang ada, supaya tidak ada track kosong.
    'grid-cols-[1fr]',
    'has-[[data-slot=alert-action]]:grid-cols-[1fr_auto]',
    'has-[>svg]:grid-cols-[1rem_1fr]',
    'has-[>svg]:has-[[data-slot=alert-action]]:grid-cols-[1rem_1fr_auto]',
    // Kolom isi: 1 tanpa ikon, 2 dengan ikon. Dipakai anak lewat
    // `col-start-[var(--alert-col)]`. Custom property dipilih, bukan dua aturan
    // `col-start-*` yang saling menimpa: keduanya bespesifisitas sama sehingga
    // pemenangnya bergantung urutan keluaran Tailwind — di v3 varian `has-*`
    // justru kalah, dan teks mendarat di kolom ikon.
    '[--alert-col:1] has-[>svg]:[--alert-col:2]',
    // Ikon sejajar baris teks pertama (Shark: `h-lh w-4`).
    '[&>svg]:h-5 [&>svg]:w-4 [&>svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: 'border-border bg-input/5 [&>svg]:text-muted-foreground',
        destructive: 'border-destructive/30 bg-destructive/5 [&>svg]:text-destructive-text',
        info: 'border-info/30 bg-info/5 [&>svg]:text-info',
        warning: 'border-warning/30 bg-warning/5 [&>svg]:text-warning-text',
        success: 'border-success/30 bg-success/5 [&>svg]:text-success-text',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      data-slot="alert-title"
      className={cn('col-start-[var(--alert-col)] font-medium leading-snug', className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="alert-description"
      className={cn('col-start-[var(--alert-col)] text-[13px] leading-snug text-muted-foreground', className)}
      {...props}
    />
  ),
);
AlertDescription.displayName = 'AlertDescription';

/** Baris tambahan di kolom isi — mis. tombol CTA di bawah deskripsi. */
const AlertContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="alert-content" className={cn('col-start-[var(--alert-col)] mt-2', className)} {...props} />
  ),
);
AlertContent.displayName = 'AlertContent';

/**
 * Aksi di ujung kanan (tombol ghost kecil / chevron). `-2 / -1` selalu menunjuk
 * kolom terakhir, baik template dua maupun tiga kolom.
 */
const AlertAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="alert-action"
      className={cn('col-start-[-2] col-end-[-1] row-start-1 row-end-[-1] self-center', className)}
      {...props}
    />
  ),
);
AlertAction.displayName = 'AlertAction';

export { Alert, AlertTitle, AlertDescription, AlertContent, AlertAction, alertVariants };
```


### `src/components/jokoui/avatar.tsx`

```tsx
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
```


### `src/components/jokoui/badge.tsx`

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Badge — port `registry/react/components/badge.tsx` milik Shark UI.
 * Status = tint 10% + border 20% + teks shade 700 (`*-text`), bukan blok
 * warna solid. `default` = foreground di atas background (netral pekat).
 *
 * Prop `shape="pill"` lama dipetakan ke `pill` Shark.
 */
const badgeVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-1',
    'select-none whitespace-nowrap font-medium text-xs leading-none',
    'rounded-md border border-transparent overflow-hidden',
    'transition-colors',
    '[&_svg]:pointer-events-none [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        success: 'bg-success/10 text-success-text border-success/20',
        info: 'bg-info/10 text-info-text border-info/20',
        warning: 'bg-warning/10 text-warning-text border-warning/20',
        destructive: 'bg-destructive/10 text-destructive-text border-destructive-text/20 dark:bg-destructive/5',
        /* alias warisan: dulu biru muda; sekarang tint primary */
        primary: 'bg-primary/10 text-primary border-primary/20',
      },
      size: {
        sm: 'h-5 min-w-5 px-1',
        default: 'h-[22px] min-w-[22px] px-1.5',
        lg: 'h-[26px] min-w-[26px] px-2 text-sm',
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

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Kompat: `shape="pill"` = `pill`. */
  shape?: 'default' | 'pill' | null;
}

function Badge({ className, variant, size, pill, shape, ...props }: BadgeProps) {
  const isPill = pill ?? shape === 'pill';
  return (
    <span
      data-slot="badge"
      data-variant={variant ?? 'default'}
      className={cn(badgeVariants({ variant, size, pill: isPill }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
```


### `src/components/jokoui/bottom-nav.tsx`

```tsx
import * as React from "react";
import { type IconComponent } from "@/components/icons";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  key: string;
  to: string;
  icon: IconComponent;
  label: string;
  isCta?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeKey: string;
  onItemClick?: (item: BottomNavItem) => void;
  className?: string;
}

const BottomNav = React.forwardRef<HTMLElement, BottomNavProps>(
  ({ items, activeKey, onItemClick, className }, ref) => (
    <nav
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="mx-auto flex min-h-14 max-w-lg items-center justify-around md:max-w-6xl">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onItemClick?.(item)}
              className={cn(
                "group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 p-2 transition-colors",
                item.isCta
                  ? "text-primary [&>svg]:-mt-5 [&>svg]:h-10 [&>svg]:w-10 [&>svg]:rounded-xl [&>svg]:bg-primary [&>svg]:p-2.5 [&>svg]:text-primary-foreground [&>svg]:shadow-primary"
                  : active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                undefined,
              )}
            >
              <Icon className={cn("h-5 w-5", item.isCta && "h-6 w-6")} />
              <span className="truncate text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  ),
);
BottomNav.displayName = "BottomNav";

export { BottomNav };
export type { BottomNavItem };
```


### `src/components/jokoui/button.tsx`

```tsx
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
```


### `src/components/jokoui/card.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Card — port `registry/react/components/card.tsx` milik Shark UI:
 * `rounded-xl border shadow-xs/5 bg-card`, padding lewat `--space`.
 *
 * Shark memakai `py-(--space)` di root dan `px-(--space)` di tiap bagian.
 * Di sini bagian-bagian itu memakai `p-4`/`px-4` biasa supaya pemanggil lama
 * yang menulis `<CardContent className="p-3">` tetap berjalan; `--space`
 * default Shark (24px) diturunkan ke 16px karena kanvas 375px.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-xs', className)}
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

/** Footer Shark: `bg-muted/48 border-t rounded-b-xl`. */
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
```


### `src/components/jokoui/checkbox.tsx`

```tsx
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from '@/components/icons';

import { cn } from '@/lib/utils';

/**
 * Checkbox — gaya Shark: kotak `rounded-sm border-input shadow-xs`, checked =
 * fill primary, fokus ring 3px. Primitif tetap Radix.
 *
 * API lama dipertahankan: `checked`, `onCheckedChange`, `size` (16/20px).
 */
export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'onCheckedChange'> {
  onCheckedChange?: (checked: boolean) => void;
  size?: 'sm' | 'default';
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, size = 'default', onCheckedChange, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      onCheckedChange={(v) => onCheckedChange?.(v === true)}
      className={cn(
        'peer shrink-0 rounded-sm border border-input bg-transparent shadow-xs',
        'transition-[color,box-shadow] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
```


### `src/components/jokoui/cta-bar.tsx`

```tsx
import * as React from 'react';
import { type IconComponent } from '@/components/icons';

import { cn } from '@/lib/utils';

interface CtaBarProps {
  icon?: IconComponent;
  children?: React.ReactNode;
  /** Aksi di kanan — biasanya nominal atau label tombol. */
  action?: React.ReactNode;
  filled?: boolean;
  tone?: 'primary' | 'success';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Bar CTA (mis. "Bayar · Rp 45.000") gaya Shark: kotak `rounded-xl border`
 * ber-shadow-lg untuk versi mengambang, atau fill primary/success untuk
 * `filled`. Tinggi 48px, tanpa pil.
 */
const CtaBar = React.forwardRef<HTMLDivElement & HTMLButtonElement, CtaBarProps>(
  ({ icon: Icon, children, action, filled = false, tone = 'primary', onClick, disabled, className }, ref) => {
    const Comp = onClick ? 'button' : 'div';
    return (
      <Comp
        ref={ref as never}
        {...(onClick ? { type: 'button' as const, onClick, disabled } : {})}
        className={cn(
          'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-all',
          'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
          onClick && 'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60',
          filled
            ? tone === 'success'
              ? 'bg-success text-white shadow-sm'
              : 'bg-primary text-primary-foreground shadow-primary'
            : 'border border-border bg-popover text-foreground shadow-lg',
          className,
        )}
      >
        {Icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', filled ? 'bg-white/15' : 'bg-primary/10 text-primary')}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{children}</span>
        {action && (
          <span className={cn('shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums', filled ? 'bg-white/15' : 'bg-primary text-primary-foreground shadow-primary')}>
            {action}
          </span>
        )}
      </Comp>
    );
  },
);
CtaBar.displayName = 'CtaBar';

export { CtaBar };
```


### `src/components/jokoui/customer-types.tsx`

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

interface CustomerTypesProps {
  /** Segmented control options; first entry is active by default. */
  segments: { key: string; label: React.ReactNode; color?: "primary" | "success" | "purple" }[];
  value?: string;
  onValueChange?: (key: string) => void;
  /** `sm` = exact SVG size (27px track); `default` = 44px touch-friendly track. */
  size?: "sm" | "default";
  className?: string;
}

const segmentColor: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  purple: "bg-[#CB5CFE] text-white",
};

/**
 * Customer type segmented control matching design `Customer Types Container.svg`
 * (318×27 track with rx=7.5 stroke #ECEFF3, colored pill segments inside).
 */
const CustomerTypes = React.forwardRef<HTMLDivElement, CustomerTypesProps>(
  ({ segments, value, onValueChange, size = "default", className }, ref) => {
    const [internal, setInternal] = React.useState(segments[0]?.key ?? "");
    const active = value ?? internal;
    const handle = (k: string) => {
      if (value === undefined) setInternal(k);
      onValueChange?.(k);
    };
    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn(
          "flex w-full items-center gap-1 rounded-[7.5px] border border-muted bg-card",
          size === "sm" ? "h-[27px] p-0.5" : "h-11 rounded-xl p-1",
          className,
        )}
      >
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={active === s.key}
            onClick={() => handle(s.key)}
            className={cn(
              "flex-1 min-w-0 truncate font-medium transition-all",
              size === "sm" ? "h-5 rounded-[6px] text-[11px]" : "h-9 rounded-lg px-1 text-xs",
              active === s.key ? segmentColor[s.color ?? "primary"] : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    );
  },
);
CustomerTypes.displayName = "CustomerTypes";

export { CustomerTypes };
```


### `src/components/jokoui/data-list.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Data List Shark: pasangan label–nilai dipisah garis tipis.
 * Baris `total` memakai border atas warna foreground dan tebal 600.
 */
const DataList = React.forwardRef<HTMLDListElement, React.HTMLAttributes<HTMLDListElement>>(
  ({ className, ...props }, ref) => (
    <dl ref={ref} data-slot="data-list" className={cn('flex flex-col', className)} {...props} />
  ),
);
DataList.displayName = 'DataList';

interface DataListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  total?: boolean;
  valueClassName?: string;
}

const DataListRow = React.forwardRef<HTMLDivElement, DataListRowProps>(
  ({ className, label, value, total, valueClassName, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="data-list-row"
      className={cn(
        'flex items-baseline justify-between gap-3 py-2 text-sm',
        'border-t border-border first:border-t-0',
        total && 'border-t-foreground font-semibold',
        className,
      )}
      {...props}
    >
      <dt className={cn('min-w-0', total ? 'text-foreground' : 'text-muted-foreground')}>{label}</dt>
      <dd className={cn('shrink-0 font-medium tabular-nums', valueClassName)}>{value}</dd>
    </div>
  ),
);
DataListRow.displayName = 'DataListRow';

export { DataList, DataListRow };
```


### `src/components/jokoui/empty-state.tsx`

```tsx
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
```


### `src/components/jokoui/header-left.tsx`

```tsx
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
```


### `src/components/jokoui/help-section.tsx`

```tsx
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
        <CtaIcon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-medium leading-snug">{title}</p>}
        {description && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{description}</p>}
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
```


### `src/components/jokoui/input.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Input — port `registry/react/components/input.tsx` milik Shark UI:
 * `rounded-lg border-input shadow-xs bg-transparent`, placeholder muted/64,
 * fokus = border primary + ring 3px ring/32, invalid = destructive.
 *
 * Tinggi default h-9 (= `lg` Shark) untuk tap-target jari; `text-base` di
 * layar kecil supaya iOS tidak zoom saat fokus.
 */
export const inputClassName = cn(
  'peer flex h-9 w-full min-w-0 px-3',
  'bg-transparent dark:bg-input/30',
  'text-base md:text-sm text-foreground',
  'rounded-lg border border-input shadow-xs',
  'placeholder:text-muted-foreground/60',
  'file:inline-flex file:h-7 file:items-center file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm',
  'transition-[color,box-shadow]',
  'outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:text-destructive-text aria-[invalid=true]:ring-[3px] aria-[invalid=true]:ring-destructive/20',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} data-slot="input" className={cn(inputClassName, className)} {...props} />
  ),
);
Input.displayName = 'Input';

export { Input };
```


### `src/components/jokoui/item.tsx`

```tsx
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
        '[&_svg]:h-[18px] [&_svg]:w-[18px]',
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
    <div ref={ref} data-slot="item-description" className={cn('line-clamp-1 text-[13px] leading-snug text-muted-foreground', className)} {...props} />
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
```


### `src/components/jokoui/label.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Label form — Field Shark: 14px medium, redup saat kontrol di dalamnya disabled. */
const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      data-slot="label"
      className={cn(
        'block text-sm font-medium leading-none text-foreground',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

export { Label };
```


### `src/components/jokoui/modal.tsx`

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

function Modal({ open, onClose, children, className }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg translate-y-0 rounded-t-3xl bg-card p-5 pt-3 shadow-lg transition-transform duration-300 sm:rounded-xl sm:pt-5 animate-scale-in",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted sm:hidden" />
        {children}
      </div>
    </div>
  );
}

const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />
);

const ModalTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-base font-semibold leading-6", className)} {...props} />
);

const ModalDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);

const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end", className)} {...props} />
);

export { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter };
```


### `src/components/jokoui/money-display.tsx`

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * Tampilan nominal Rupiah yang konsisten di seluruh app.
 *
 * Dua hal yang membedakannya dari sekadar `toLocaleString()`:
 *  1. Skala ukuran tetap — nominal uang dibaca sambil berdiri, di bawah lampu
 *     terang. `xl` (32px) dipakai untuk angka utama satu layar, bukan untuk
 *     semua angka.
 *  2. Privasi — pemilik sering membuka app di depan pembeli. Toggle "sembunyikan"
 *     berlaku global (localStorage) sehingga sekali di-set, seluruh app ikut.
 */

const STORAGE_KEY = 'kanpos_money_hidden_v1';
const EVENT = 'kanpos:money-visibility';

function readHidden(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Status "sembunyikan nominal" beserta pengubahnya. Sinkron antar komponen
 * lewat CustomEvent — tidak perlu provider di root.
 */
export function useMoneyVisibility() {
  const [hidden, setHidden] = useState(readHidden);

  useEffect(() => {
    const sync = () => setHidden(readHidden());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !readHidden();
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* mode privat / storage penuh — cukup update state lokal */
    }
    window.dispatchEvent(new Event(EVENT));
    setHidden(next);
  }, []);

  return { hidden, toggle };
}

const SIZE_CLASS = {
  sm: 'text-[13px] font-semibold',
  md: 'text-base font-semibold',
  lg: 'text-xl font-semibold',
  xl: 'text-[28px] leading-[1.1] font-semibold tracking-[-0.02em]',
} as const;

const MASK = { sm: '•••', md: '••••', lg: '•••••', xl: '••••••' } as const;

export type MoneySize = keyof typeof SIZE_CLASS;

export interface MoneyDisplayProps {
  value: number;
  /** Default `md`. Pakai `xl` hanya untuk satu angka utama per layar. */
  size?: MoneySize;
  /** Kode locale angka, mis. `id-ID`. */
  locale?: string;
  /** Default `Rp`. Kosongkan dengan `""` bila prefiks sudah ada di label. */
  symbol?: string;
  /** Tampilkan tanda `+`/`−` — dipakai untuk arus uang masuk/keluar. */
  signed?: boolean;
  /** Abaikan toggle privasi global (mis. nominal di dalam form input). */
  alwaysVisible?: boolean;
  className?: string;
}

export function MoneyDisplay({
  value,
  size = 'md',
  locale = 'id-ID',
  symbol = 'Rp',
  signed = false,
  alwaysVisible = false,
  className,
}: MoneyDisplayProps) {
  const { hidden } = useMoneyVisibility();
  const masked = !alwaysVisible && hidden;

  const text = useMemo(() => {
    if (masked) return MASK[size];
    const abs = Math.abs(Math.round(value));
    const sign = signed ? (value < 0 ? '−' : '+') : value < 0 ? '−' : '';
    return `${sign}${abs.toLocaleString(locale)}`;
  }, [masked, size, value, signed, locale]);

  return (
    <span className={cn('tabular-nums whitespace-nowrap', SIZE_CLASS[size], className)}>
      {symbol && <span className="mr-1 font-semibold opacity-70">{symbol}</span>}
      {text}
    </span>
  );
}

/** Tombol mata untuk menyalakan/mematikan penyamaran nominal. */
export function MoneyVisibilityToggle({ className }: { className?: string }) {
  const { hidden, toggle } = useMoneyVisibility();
  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
      aria-pressed={hidden}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
```


### `src/components/jokoui/news-card.tsx`

```tsx
import * as React from 'react';
import { X, Info } from '@/components/icons';

import { cn } from '@/lib/utils';
import { Alert, AlertAction, AlertContent, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';

interface NewsCardProps {
  imageSrc?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  ctaLabel?: React.ReactNode;
  onCtaClick?: () => void;
  onDismiss?: () => void;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Kartu pengumuman/promo. Dulu blok biru solid dengan gelembung dekoratif;
 * sekarang = Alert Shark varian info (bg info/4, border info/32) dengan
 * tombol aksi kecil dan × untuk menutup. Lebih tenang, tidak berebut
 * perhatian dengan angka penjualan.
 */
const NewsCard = React.forwardRef<HTMLDivElement, NewsCardProps>(
  ({ title, description, ctaLabel, onCtaClick, onDismiss, onClick, className, children }, ref) => (
    <Alert ref={ref} variant="info" onClick={onClick} className={cn(onClick && 'cursor-pointer', className)}>
      <Info />
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <AlertDescription>{description}</AlertDescription>}
      {(ctaLabel || children) && (
        <AlertContent className="flex flex-wrap items-center gap-2">
          {ctaLabel && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCtaClick?.();
              }}
            >
              {ctaLabel}
            </Button>
          )}
          {children}
        </AlertContent>
      )}
      {onDismiss && (
        <AlertAction className="self-start">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Tutup"
            className="-mr-1.5 -mt-1 h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </AlertAction>
      )}
    </Alert>
  ),
);
NewsCard.displayName = 'NewsCard';

export { NewsCard };
```


### `src/components/jokoui/numpad.tsx`

```tsx
import { cn } from '@/lib/utils';

/**
 * Keypad angka sendiri, bukan keyboard sistem.
 *
 * Keyboard OS memakan setengah layar dan menutup nominal kembalian — persis
 * informasi yang paling dibutuhkan kasir saat antrean panjang. Keypad ini
 * tetap terlihat bersama hasilnya, dengan tap-target 52px.
 */
export interface NumPadProps {
  /** Nilai saat ini sebagai string digit ("0" bila kosong). */
  value: string;
  onChange: (next: string) => void;
  className?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0'] as const;

/** Ikon backspace — tidak ada padanannya di registry `@/components/icons`. */
function BackspaceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M21 4H8L2 12l6 8h13a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z" />
      <path d="M17 9l-5 6M12 9l5 6" />
    </svg>
  );
}

export function NumPad({ value, onChange, className }: NumPadProps) {
  const press = (key: string) => {
    const base = value === '0' ? '' : value;
    const next = `${base}${key}`.replace(/^0+(?=\d)/, '');
    // Batasi agar tidak melewati presisi aman JavaScript.
    if (next.length > 12) return;
    onChange(next || '0');
  };

  const backspace = () => {
    const next = value.slice(0, -1);
    onChange(next === '' ? '0' : next);
  };

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className="h-12 rounded-lg border border-input bg-transparent text-lg font-medium shadow-xs transition-colors hover:bg-accent active:scale-[0.98] dark:bg-input/30"
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        aria-label="Hapus satu digit"
        onClick={backspace}
        className="flex h-12 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-destructive-text transition-colors hover:bg-destructive/10 active:scale-[0.98]"
      >
        <BackspaceIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

/**
 * Pecahan uang yang wajar untuk sebuah total.
 *
 * Bukan daftar tetap: untuk total Rp 12.000 yang berguna adalah 15rb/20rb/50rb,
 * bukan 1rb/2rb/5rb yang tidak mungkin menutup tagihan.
 */
export function suggestCashDenominations(total: number, count = 3): number[] {
  if (total <= 0) return [];
  const NOTES = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];
  const out: number[] = [];

  // Pembulatan ke atas ke kelipatan bulat — uang yang biasa disodorkan pembeli.
  for (const step of [5000, 10000, 50000, 100000]) {
    const rounded = Math.ceil(total / step) * step;
    if (rounded > total && !out.includes(rounded)) out.push(rounded);
  }
  for (const note of NOTES) {
    if (note > total && !out.includes(note)) out.push(note);
  }

  return out.sort((a, b) => a - b).slice(0, count);
}

export interface QuickCashRowProps {
  /** Total yang harus dibayar — dipakai untuk tombol "uang pas". */
  total: number;
  onPick: (amount: number) => void;
  /** Label tombol uang pas (i18n dari pemanggil). */
  exactLabel: string;
  locale?: string;
  className?: string;
}

export function QuickCashRow({ total, onPick, exactLabel, locale = 'id-ID', className }: QuickCashRowProps) {
  const suggestions = suggestCashDenominations(total);

  const short = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })}jt`
      : `${(n / 1000).toLocaleString(locale, { maximumFractionDigits: 0 })}rb`;

  return (
    <div
      className={cn('grid gap-2', className)}
      style={{ gridTemplateColumns: `repeat(${suggestions.length + 1}, minmax(0, 1fr))` }}
    >
      <button
        type="button"
        onClick={() => onPick(total)}
        className="h-9 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-primary transition-transform active:scale-[0.98]"
      >
        {exactLabel}
      </button>
      {suggestions.map((amount) => (
        <button
          key={amount}
          type="button"
          onClick={() => onPick(amount)}
          className="h-9 rounded-lg border border-input bg-transparent text-sm font-medium shadow-xs transition-colors hover:bg-accent active:scale-[0.98] dark:bg-input/30"
        >
          {short(amount)}
        </button>
      ))}
    </div>
  );
}
```


### `src/components/jokoui/order-card.tsx`

```tsx
import * as React from 'react';
import { type IconComponent } from '@/components/icons';

import { cn } from '@/lib/utils';
import { Badge } from './badge';

interface OrderCardProps {
  title: React.ReactNode;
  orderId: React.ReactNode;
  meta?: React.ReactNode;
  status?: {
    label: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'info';
    icon?: IconComponent;
  };
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/** Kartu bill/pesanan = Card Shark; bill terbuka diberi border warning/32. */
const OrderCard = React.forwardRef<HTMLDivElement, OrderCardProps>(
  ({ title, orderId, meta, status, onClick, className, children }, ref) => {
    const StatusIcon = status?.icon;
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'relative w-[262px] shrink-0 rounded-xl border bg-card p-3 shadow-xs transition-all',
          status?.variant === 'warning' ? 'border-warning/30' : 'border-border',
          onClick && 'cursor-pointer hover:bg-muted/40 active:scale-[0.99]',
          className,
        )}
      >
        <div className="flex flex-col gap-0.5 pr-20">
          <p className="truncate text-sm font-medium leading-snug text-foreground">{title}</p>
          <p className="truncate text-base font-semibold leading-tight tabular-nums text-foreground">{orderId}</p>
          {meta && <p className="truncate text-[13px] text-muted-foreground">{meta}</p>}
        </div>
        {status && (
          <Badge variant={status.variant ?? 'default'} size="sm" className="absolute right-3 top-3">
            {StatusIcon && <StatusIcon className="h-3 w-3" />}
            {status.label}
          </Badge>
        )}
        {children}
      </div>
    );
  },
);
OrderCard.displayName = 'OrderCard';

export { OrderCard };
```


### `src/components/jokoui/overview-row.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

interface OverviewRowProps {
  icon?: React.ReactNode;
  iconClassName?: string;
  label: React.ReactNode;
  progress?: number;
  amount: React.ReactNode;
  delta?: number | null;
  formatDelta?: (delta: number) => string;
  deltaTitle?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Baris ringkasan (metode bayar / kategori) gaya Shark: media 40px rounded-xl,
 * label 14/500, progress bar 6px, nominal tabular, delta = Badge tint.
 */
const OverviewRow = React.forwardRef<HTMLDivElement, OverviewRowProps>(
  ({ icon, iconClassName, label, progress, amount, delta, formatDelta, deltaTitle, onClick, className }, ref) => {
    const Comp = onClick ? 'button' : 'div';
    const pct = progress == null ? null : Math.min(100, Math.max(0, progress));
    const deltaLabel = delta == null ? null : formatDelta ? formatDelta(delta) : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;

    return (
      <Comp
        ref={ref as never}
        {...(onClick ? { type: 'button' as const, onClick } : {})}
        className={cn(
          'flex w-full items-center gap-3 py-2.5 text-left',
          onClick && 'transition-colors hover:bg-muted/40 active:bg-muted',
          className,
        )}
      >
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground', iconClassName)}>
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium leading-snug">{label}</span>
          {pct != null && (
            <span className="mt-1.5 block h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </span>
          )}
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-semibold leading-none tabular-nums">{amount}</span>
          {deltaLabel && (
            <span
              title={deltaTitle}
              aria-label={deltaTitle ? `${deltaLabel} ${deltaTitle}` : undefined}
              className={cn(
                'inline-flex h-5 items-center rounded-md border px-1 text-[11px] font-medium leading-none tabular-nums',
                (delta ?? 0) >= 0 ? 'border-success/20 bg-success/10 text-success-text' : 'border-destructive-text/20 bg-destructive/10 text-destructive-text',
              )}
            >
              {deltaLabel}
            </span>
          )}
        </span>
      </Comp>
    );
  },
);
OverviewRow.displayName = 'OverviewRow';

export { OverviewRow };
```


### `src/components/jokoui/page-header.tsx`

```tsx
import * as React from 'react';
import { ChevronLeft, type IconComponent } from '@/components/icons';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { Button } from './button';

interface PageHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Diterima demi kompat; header Shark polos tidak menggambar ikon halaman. */
  icon?: IconComponent;
  /** Avatar 40px di kiri judul (mis. logo toko di Beranda). */
  avatar?: React.ReactNode;
  backTo?: string;
  onBack?: () => void;
  /** Tombol ikon di ujung kanan (dirender sebagai Button outline size icon). */
  inlineActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Header halaman gaya Shark: polos 56px, judul 18/600 di kiri, aksi di kanan.
 * Menggantikan pil putih + lingkaran ikon biru dari design Figma lama —
 * Shark tidak punya "pill header", dan judul yang menempel di tepi kiri
 * lebih mudah dipindai daripada judul di tengah pil.
 */
const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, subtitle, avatar, backTo, onBack, inlineActions, children, className }, ref) => {
    const back =
      onBack ? (
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={onBack} aria-label="Kembali">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      ) : backTo ? (
        <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0" aria-label="Kembali">
          <Link to={backTo}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
      ) : null;

    return (
      <div
        ref={ref}
        data-slot="page-header"
        className={cn(
          'sticky top-0 z-30 -mx-4 mb-3 flex h-14 items-center gap-2.5 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-8 md:px-8',
          className,
        )}
      >
        {back}
        {avatar && <div className="shrink-0">{avatar}</div>}
        <div className="min-w-0 flex-1">
          {title && <h1 className="truncate text-lg font-semibold leading-tight tracking-tight">{title}</h1>}
          {subtitle && <p className="truncate text-xs leading-tight text-muted-foreground">{subtitle}</p>}
        </div>
        {(inlineActions || children) && (
          <div className="flex shrink-0 items-center gap-1.5">
            {inlineActions}
            {children}
          </div>
        )}
      </div>
    );
  },
);
PageHeader.displayName = 'PageHeader';

export { PageHeader };
```


### `src/components/jokoui/price-tier-seg.tsx`

```tsx
import { BASE_TIER_NAME, type ResolvedTier } from '@/lib/price-tiers';
import { cn } from '@/lib/utils';

/**
 * Pemilih tingkat harga untuk satu baris keranjang.
 *
 * Sengaja selalu terlihat, bukan disembunyikan di menu tiga titik: di grosir,
 * memilih tingkat harga adalah bagian normal dari setiap transaksi, dan salah
 * tingkat berarti rugi langsung. Tingkat yang belum memenuhi jumlah minimum
 * tetap ditampilkan (redup) supaya pemilik tahu tinggal berapa lagi.
 */
export interface PriceTierSegProps {
  tiers: ResolvedTier[];
  /** Nama tingkat yang sedang berlaku. */
  value: string;
  onChange: (tierName: string) => void;
  /** Jumlah saat ini — menentukan tingkat mana yang sudah memenuhi syarat. */
  qty: number;
  /** Label untuk tingkat dasar, mis. "Eceran". */
  baseLabel: string;
  className?: string;
}

export function PriceTierSeg({ tiers, value, onChange, qty, baseLabel, className }: PriceTierSegProps) {
  if (tiers.length < 2) return null;

  return (
    <div className={cn('flex gap-0.5 rounded-lg bg-muted p-0.5', className)} role="group">
      {tiers.map((tier) => {
        const active = tier.name === value;
        const eligible = qty >= tier.minQty;
        const label = tier.name === BASE_TIER_NAME ? baseLabel : tier.name;

        return (
          <button
            key={tier.name || '__base__'}
            type="button"
            onClick={() => onChange(tier.name)}
            title={eligible ? undefined : `Berlaku mulai ${tier.minQty}`}
            className={cn(
              'flex h-6 flex-1 items-center justify-center rounded-md px-2 text-[11px] font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-xs'
                : eligible
                  ? 'text-muted-foreground hover:text-foreground'
                  : 'text-muted-foreground/50',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
```


### `src/components/jokoui/progress.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Progress Shark: track `bg-muted` rounded-full h-1.5, indikator primary. */
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  tone?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
}

const TONE: Record<NonNullable<ProgressProps['tone']>, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, tone = 'primary', ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        data-slot="progress"
        className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
        {...props}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-300', TONE[tone])} style={{ width: `${pct}%` }} />
      </div>
    );
  },
);
Progress.displayName = 'Progress';

export { Progress };
```


### `src/components/jokoui/qty-stepper.tsx`

```tsx
import { Minus, Plus } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * Stepper jumlah = Number Input Shark: satu kotak `rounded-lg border-input
 * shadow-xs` berisi tombol −, angka, tombol + yang dipisah garis tipis.
 *
 * Angkanya bisa ditekan (`onEditValue`) untuk mengetik manual — penting di
 * grosir yang qty-nya puluhan.
 */
export interface QtyStepperProps {
  value: number;
  onChange: (next: number) => void;
  onEditValue?: () => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function QtyStepper({
  value,
  onChange,
  onEditValue,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  size = 'md',
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: QtyStepperProps) {
  const sm = size === 'sm';
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const btn = cn(
    'flex h-full items-center justify-center text-foreground transition-colors hover:bg-muted active:bg-accent disabled:opacity-40 disabled:hover:bg-transparent',
    sm ? 'w-7' : 'w-9',
  );

  return (
    <div
      className={cn(
        'inline-flex items-stretch overflow-hidden rounded-lg border border-input bg-transparent shadow-xs dark:bg-input/30',
        sm ? 'h-7' : 'h-9',
        disabled && 'opacity-60',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button type="button" aria-label="Kurangi" disabled={disabled || value <= min} onClick={() => onChange(clamp(value - step))} className={btn}>
        <Minus className={sm ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>

      {onEditValue ? (
        <button
          type="button"
          onClick={onEditValue}
          disabled={disabled}
          className={cn('border-x border-input text-center font-medium tabular-nums', sm ? 'min-w-[28px] px-1 text-xs' : 'min-w-[36px] px-1.5 text-sm')}
        >
          {value}
        </button>
      ) : (
        <span className={cn('flex items-center justify-center border-x border-input text-center font-medium tabular-nums', sm ? 'min-w-[28px] px-1 text-xs' : 'min-w-[36px] px-1.5 text-sm')}>
          {value}
        </span>
      )}

      <button type="button" aria-label="Tambah" disabled={disabled || value >= max} onClick={() => onChange(clamp(value + step))} className={btn}>
        <Plus className={sm ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>
    </div>
  );
}
```


### `src/components/jokoui/section-title.tsx`

```tsx
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
```


### `src/components/jokoui/segment-group.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Segment Group — port `registry/react/components/segment-group.tsx` Shark:
 * deretan chip `rounded-lg h-8 px-3 text-[13px] font-medium`, item aktif
 * berlatar `bg-input`, bukan pil biru solid. Dipakai untuk filter kategori
 * di Kasir dan filter status di Riwayat.
 */
interface SegmentGroupProps<T extends string> {
  items: { value: T; label: React.ReactNode }[];
  value: T;
  onValueChange: (value: T) => void;
  /** `scroll` = satu baris menggulir horizontal (bleed -mx-4); `full` = dibagi rata. */
  layout?: 'scroll' | 'full' | 'inline';
  className?: string;
  'aria-label'?: string;
}

function SegmentGroup<T extends string>({ items, value, onValueChange, layout = 'inline', className, 'aria-label': ariaLabel }: SegmentGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-slot="segment-group"
      className={cn(
        'flex gap-2',
        layout === 'scroll' && '-mx-4 overflow-x-auto px-4 pb-0.5 scrollbar-hide md:-mx-8 md:px-8',
        layout === 'full' && 'w-full',
        className,
      )}
      style={layout === 'scroll' ? { WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' } : undefined}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-state={active ? 'checked' : 'unchecked'}
            onClick={() => onValueChange(item.value)}
            className={cn(
              'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-transparent px-3 text-[13px] font-medium transition-colors',
              'outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
              active ? 'bg-input text-foreground' : 'text-muted-foreground hover:text-foreground',
              layout === 'full' && 'flex-1',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentGroup };
```


### `src/components/jokoui/segmented-bar-chart.tsx`

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

export interface SegmentedBarDatum {
  label: string;
  value: number;
}

interface SegmentedBarChartProps {
  data: SegmentedBarDatum[];
  /** Capsules per bar — design uses 15 (24×10, rx=5, pitch 11.82). */
  slots?: number;
  /** Highlighted bar; defaults to the largest value. */
  activeIndex?: number;
  onSelect?: (index: number) => void;
  /** Formats the y-axis ticks (e.g. compact currency). */
  formatTick?: (value: number) => string;
  mode?: "bar" | "line";
  className?: string;
}

const SLOT_HEIGHT = 10;
const SLOT_PITCH = 11.8168;
const TICK_COUNT = 5;

function chartHeight(slots: number) {
  return (slots - 1) * SLOT_PITCH + SLOT_HEIGHT;
}

/**
 * Segmented bar chart from design `Transaction Overview.svg`: each bar is a stack
 * of 24×10 rx=5 capsules filled from the bottom — empty `#EFF5FF`, filled
 * `#C0CAEC`, and the active bar in brand `#3554C1`. `mode="line"` renders the
 * same series as the trend line behind the header's second toggle icon.
 */
const SegmentedBarChart = React.forwardRef<HTMLDivElement, SegmentedBarChartProps>(
  ({ data, slots = 15, activeIndex, onSelect, formatTick, mode = "bar", className }, ref) => {
    const max = Math.max(...data.map((d) => d.value), 0);
    const highest = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -Infinity) ? i : best), 0);
    const active = activeIndex ?? highest;
    const height = chartHeight(slots);

    const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
      const value = (max / TICK_COUNT) * (TICK_COUNT - i);
      return formatTick ? formatTick(value) : Math.round(value).toString();
    });

    return (
      <div ref={ref} className={cn("flex gap-3", className)}>
        {/* y-axis */}
        <div
          className="flex shrink-0 flex-col justify-between pb-6 text-[11px] font-medium text-muted-foreground/70"
          style={{ height: height + 24 }}
          aria-hidden="true"
        >
          {ticks.map((tick, i) => (
            <span key={i} className="tabular leading-none">{tick}</span>
          ))}
        </div>

        {/* plot — bleeds to the right like the SVG when there are many columns */}
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
          {mode === "line" ? (
            <LineSeries data={data} max={max} height={height} active={active} onSelect={onSelect} />
          ) : (
            <div className="flex gap-[23px]">
              {data.map((d, i) => {
                const filled = max > 0 ? Math.round((d.value / max) * slots) : 0;
                const count = d.value > 0 ? Math.max(1, filled) : 0;
                // static columns stay plain elements — a no-op <button> would be focusable
                const Column = onSelect ? "button" : "div";
                return (
                  <Column
                    key={`${d.label}-${i}`}
                    {...(onSelect
                      ? { type: "button" as const, onClick: () => onSelect(i), "aria-pressed": i === active }
                      : {})}
                    aria-label={`${d.label}: ${formatTick ? formatTick(d.value) : d.value}`}
                    className={cn("flex shrink-0 flex-col items-center gap-1.5", onSelect && "cursor-pointer")}
                  >
                    <span
                      className="flex flex-col-reverse justify-start"
                      style={{ height, gap: SLOT_PITCH - SLOT_HEIGHT }}
                    >
                      {Array.from({ length: slots }, (_, s) => (
                        <span
                          key={s}
                          className={cn(
                            "block w-6 rounded-[5px] transition-colors",
                            s < count ? (i === active ? "bg-primary" : "bg-accent-strong") : "bg-accent",
                          )}
                          style={{ height: SLOT_HEIGHT }}
                        />
                      ))}
                    </span>
                    <span className="text-[11px] font-medium leading-none text-muted-foreground/70">
                      {d.label}
                    </span>
                  </Column>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  },
);
SegmentedBarChart.displayName = "SegmentedBarChart";

interface LineSeriesProps {
  data: SegmentedBarDatum[];
  max: number;
  height: number;
  active: number;
  onSelect?: (index: number) => void;
}

function LineSeries({ data, max, height, active, onSelect }: LineSeriesProps) {
  const step = 47;
  const width = Math.max(step * data.length, step);
  const y = (v: number) => height - (max > 0 ? (v / max) * (height - 10) : 0) - 5;
  // centre each point in its column so the labels below line up regardless of text width
  const cx = (i: number) => i * step + step / 2;
  const points = data.map((d, i) => `${cx(i)},${y(d.value)}`).join(" ");

  return (
    <div style={{ width }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={cx(i)}
            cy={y(d.value)}
            r={i === active ? 5 : 3.5}
            fill={i === active ? "hsl(var(--primary))" : "hsl(var(--card))"}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="flex" style={{ width }}>
        {data.map((d, i) => {
          const Label = onSelect ? "button" : "div";
          return (
            <Label
              key={i}
              {...(onSelect ? { type: "button" as const, onClick: () => onSelect(i) } : {})}
              style={{ width: step }}
              className="pt-1.5 text-center text-[11px] font-medium leading-none text-muted-foreground/70"
            >
              {d.label}
            </Label>
          );
        })}
      </div>
    </div>
  );
}

export { SegmentedBarChart };
```


### `src/components/jokoui/select.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';
import { inputClassName } from './input';

/** Native Select Shark: gaya Input + chevron di kanan. */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        data-slot="native-select"
        className={cn(inputClassName, 'appearance-none pr-9 font-medium', className)}
        {...props}
      >
        {children}
      </select>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </div>
  ),
);
Select.displayName = 'Select';

export { Select };
```


### `src/components/jokoui/settings-group.tsx`

```tsx
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
          {description && <p className="mt-0.5 truncate text-[13px] leading-snug text-muted-foreground">{description}</p>}
        </div>
        {trailing && <div className="flex shrink-0 items-center gap-2 text-muted-foreground">{trailing}</div>}
        {children}
      </Comp>
    );
  },
);
SettingsItem.displayName = 'SettingsItem';

export { SettingsGroup, SettingsItem };
```


### `src/components/jokoui/skeleton.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Skeleton Shark: `bg-muted rounded-lg animate-pulse`. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-lg bg-muted', className)} {...props} />;
}

export { Skeleton };
```


### `src/components/jokoui/stat-card.tsx`

```tsx
import * as React from 'react';
import { type IconComponent } from '@/components/icons';

import { cn } from '@/lib/utils';
import { Card } from './card';

interface StatCardProps {
  icon?: IconComponent;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Kelas warna untuk nilai (mis. `text-destructive-text`). Kompat: kelas blob lama diabaikan. */
  color?: string;
  valueClassName?: string;
  size?: 'default' | 'sm';
  className?: string;
}

/**
 * Stat tile Shark: label 12 muted di atas, angka 18–22/600 tabular di bawah.
 * Tanpa blob ikon — di kanvas 3 kolom ikon hanya memakan ruang angka.
 */
const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, sub, valueClassName, size = 'default', className }, ref) => {
    const isSm = size === 'sm';
    return (
      <Card ref={ref} className={cn('min-w-0', isSm ? 'p-3' : 'p-3.5', className)}>
        <p className={cn('truncate font-medium text-muted-foreground', isSm ? 'text-[11px]' : 'text-xs')}>{label}</p>
        <p className={cn('mt-1 break-words font-semibold leading-tight tracking-tight tabular-nums', isSm ? 'text-base' : 'text-lg', valueClassName)}>
          {value}
        </p>
        {sub && <p className={cn('mt-0.5 truncate text-muted-foreground', isSm ? 'text-[11px]' : 'text-xs')}>{sub}</p>}
      </Card>
    );
  },
);
StatCard.displayName = 'StatCard';

export { StatCard };
```


### `src/components/jokoui/switch.tsx`

```tsx
import { Toggle, type ToggleProps } from "./toggle";

const Switch = Toggle;
type SwitchProps = ToggleProps;

export { Switch, type SwitchProps };
```


### `src/components/jokoui/table-grid.tsx`

```tsx
import { cn } from '@/lib/utils';

/**
 * Denah meja restoran.
 *
 * Statusnya dibaca dari warna, bukan teks: pemilik memindai satu layar dalam
 * sedetik saat jam ramai. Timer menit mengubah "sudah lama nih" dari perasaan
 * jadi angka yang bisa ditindak.
 *
 * Meja tidak disimpan sebagai entitas tersendiri — daftar ini dibangun dari
 * `tableCount` dan status diturunkan dari bill yang masih terbuka.
 */
export interface TableSlot {
  /** Label meja, mis. "01". Juga dipakai sebagai `tableNumber` transaksi. */
  number: string;
  /** Bill terbuka pada meja ini, bila ada. */
  occupied?: {
    total: number;
    minutes: number;
    /** Meja sudah meminta bill — perlu ditindak sekarang. */
    requested: boolean;
  };
}

export interface TableGridProps {
  tables: TableSlot[];
  onSelect: (table: TableSlot) => void;
  /** Format nominal, mis. `rp`. */
  formatMoney: (n: number) => string;
  emptyLabel: string;
  /** Label untuk meja yang sudah meminta bill. */
  requestedLabel: string;
  /** Menit sejak bill dibuka yang dianggap "lama" — angka menitnya disorot. */
  staleAfterMinutes?: number;
  className?: string;
}

export function TableGrid({
  tables,
  onSelect,
  formatMoney,
  emptyLabel,
  requestedLabel,
  staleAfterMinutes = 40,
  className,
}: TableGridProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-2.5', className)}>
      {tables.map((table) => {
        const busy = !!table.occupied;
        const requested = busy && table.occupied!.requested;
        // "Sudah lama" tidak dapat warnanya sendiri: satu warna alarm untuk satu
        // arti. Meja yang lama hanya menyorot angka menitnya; kuning disimpan
        // untuk hal yang benar-benar perlu ditindak sekarang — minta bill.
        const stale = busy && !requested && table.occupied!.minutes >= staleAfterMinutes;

        return (
          <button
            key={table.number}
            type="button"
            onClick={() => onSelect(table)}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border shadow-xs transition-transform active:scale-[0.98]',
              requested
                ? 'border-warning/40 bg-warning/10 text-warning-text'
                : busy
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground',
            )}
          >
            <span className="text-xl font-semibold tabular-nums">{table.number}</span>
            {busy ? (
              <>
                <span className="text-[11px] font-medium tabular-nums opacity-90">
                  {requested ? requestedLabel : formatMoney(table.occupied!.total)}
                </span>
                <span className={cn('text-[11px] tabular-nums', stale ? 'font-semibold text-warning-text' : 'opacity-75')}>
                  {table.occupied!.minutes} mnt
                </span>
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground">{emptyLabel}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```


### `src/components/jokoui/table.tsx`

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("bg-muted/60 text-foreground", className)} {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("divide-y divide-border bg-card", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("transition-colors hover:bg-muted/40", className)} {...props} />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground", className)} {...props} />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-3 align-middle", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
```


### `src/components/jokoui/tabs.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Tabs — port `registry/react/components/tabs.tsx` milik Shark UI.
 *
 * Dua varian list:
 *  - `default`: list `rounded-lg`, tab aktif memakai latar `bg-accent`
 *    (Shark menggambar indikator bergeser; di sini latar dipasang langsung
 *    ke trigger aktif — tanpa animasi geser, hasil visual akhirnya sama).
 *  - `underline`: garis 2px `bg-primary` di bawah tab aktif.
 *
 * Tambahan KanPOS: `variant="pill"` = list dengan latar `bg-muted p-0.5`,
 * tab aktif putih ber-shadow (pola pemilih rentang waktu di Laporan).
 */
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  variant: TabsVariant;
}

type TabsVariant = 'default' | 'underline' | 'pill';

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>');
  return ctx;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value: valueProp, onValueChange: onValueChangeProp, variant = 'default', className, children, ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? '');
    const isControlled = valueProp !== undefined;
    const value = isControlled ? valueProp : uncontrolled;
    const handleValueChange = (v: string) => {
      if (!isControlled) setUncontrolled(v);
      onValueChangeProp?.(v);
    };
    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange, variant }}>
        <div ref={ref} data-slot="tabs" className={cn('flex w-full flex-col gap-2', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

const LIST: Record<TabsVariant, string> = {
  default: 'w-fit gap-x-0.5 rounded-lg',
  underline: 'w-full gap-x-0.5 border-b border-input',
  pill: 'w-fit gap-x-0.5 rounded-lg bg-muted p-0.5',
};

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { variant } = useTabs();
    return (
      <div
        ref={ref}
        role="tablist"
        data-slot="tabs-list"
        className={cn('relative z-0 flex items-center justify-center text-muted-foreground', LIST[variant], className)}
        {...props}
      />
    );
  },
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TRIGGER: Record<TabsVariant, { base: string; active: string }> = {
  default: { base: 'rounded-lg', active: 'bg-accent text-foreground' },
  underline: {
    base: 'rounded-t-lg after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent',
    active: 'text-foreground after:bg-primary',
  },
  pill: { base: 'rounded-md h-8', active: 'bg-background text-foreground shadow-xs' },
};

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selected, onValueChange, variant } = useTabs();
    const active = selected === value;
    const v = TRIGGER[variant];
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={active}
        data-state={active ? 'active' : 'inactive'}
        data-slot="tabs-trigger"
        onClick={() => onValueChange(value)}
        className={cn(
          'relative flex h-9 shrink-0 grow items-center justify-center gap-1.5 px-2.5',
          'whitespace-nowrap text-sm font-medium',
          'border border-transparent cursor-pointer',
          'transition-[color,background-color,box-shadow]',
          'hover:text-foreground/70',
          'outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
          'disabled:pointer-events-none disabled:opacity-60',
          '[&_svg]:pointer-events-none [&_svg]:-mx-0.5 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
          v.base,
          active && v.active,
          className,
        )}
        {...props}
      />
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selected } = useTabs();
    if (selected !== value) return null;
    return <div ref={ref} role="tabpanel" data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />;
  },
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
```


### `src/components/jokoui/textarea.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Textarea — gaya Input Shark (rounded-lg border-input shadow-xs, ring fokus 3px). */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        'flex min-h-[88px] w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 shadow-xs',
        'text-base md:text-sm text-foreground placeholder:text-muted-foreground/60',
        'dark:bg-input/30',
        'transition-[color,box-shadow] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-[3px] aria-[invalid=true]:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
```


### `src/components/jokoui/toggle.tsx`

```tsx
import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

/**
 * Switch — port `registry/react/components/switch.tsx` milik Shark UI:
 * thumb 20px (mobile), track = thumb×2−2 lebar, checked = primary,
 * unchecked = bg-input, thumb putih. Primitif tetap Radix.
 *
 * API lama dipertahankan: `checked`, `onCheckedChange`, `disabled`.
 */
export interface ToggleProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, 'onCheckedChange'> {
  onCheckedChange?: (checked: boolean) => void;
}

const Toggle = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, ToggleProps>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      data-slot="switch"
      className={cn(
        'group/switch inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-transparent p-px',
        'transition-all outline-none',
        'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-xs transition-transform',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
          'dark:bg-foreground dark:data-[state=checked]:bg-primary-foreground',
        )}
      />
    </SwitchPrimitive.Root>
  ),
);
Toggle.displayName = 'Toggle';

export { Toggle };
```


### `src/components/jokoui/transaction-item.tsx`

```tsx
import * as React from 'react';
import { type IconComponent } from '@/components/icons';

import { cn } from '@/lib/utils';

interface TransactionItemProps {
  icon: IconComponent;
  /** Kelas warna media 40px (default: muted). */
  iconColor?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  amount?: React.ReactNode;
  amountClassName?: string;
  /** `row` = baris flat di dalam Card (dipisah garis); `card` = Item berbingkai sendiri. */
  variant?: 'row' | 'card';
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/** Baris transaksi = Item Shark: media 40px rounded-xl, judul 14/500, meta 13 muted, nominal tabular. */
const TransactionItem = React.forwardRef<HTMLDivElement, TransactionItemProps>(
  ({ icon: Icon, iconColor = 'bg-muted text-muted-foreground', title, meta, amount, amountClassName, variant = 'row', onClick, className, children }, ref) => (
    <div
      ref={ref}
      onClick={onClick}
      data-slot="item"
      className={cn(
        'flex w-full items-center gap-3 text-sm transition-colors',
        variant === 'card' ? 'rounded-xl border border-border bg-card p-3 shadow-xs' : 'px-4 py-3',
        onClick && 'cursor-pointer hover:bg-muted/60 active:bg-muted',
        className,
      )}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconColor)}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-snug text-foreground">{title}</p>
        {meta && <div className="mt-0.5 truncate text-[13px] leading-snug text-muted-foreground">{meta}</div>}
      </div>
      {amount && <p className={cn('shrink-0 font-semibold tabular-nums text-foreground', amountClassName)}>{amount}</p>}
      {children}
    </div>
  ),
);
TransactionItem.displayName = 'TransactionItem';

export { TransactionItem };
```


### `src/components/jokoui/user-greeting.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

interface UserGreetingProps {
  greeting?: React.ReactNode;
  name?: React.ReactNode;
  meta?: React.ReactNode;
  avatar?: React.ReactNode;
  avatarPosition?: 'leading' | 'trailing';
  onAvatarClick?: () => void;
  action?: React.ReactNode;
  /** Diterima demi kompat; header Shark selalu polos. */
  variant?: 'plain' | 'pill';
  className?: string;
}

/**
 * Header Beranda gaya Shark: avatar 40px bulat, nama 18/600, sapaan 12 muted,
 * aksi (tombol ikon outline) di kanan. Tanpa pil, tanpa shadow.
 */
const UserGreeting = React.forwardRef<HTMLDivElement, UserGreetingProps>(
  ({ greeting, name, meta, avatar, avatarPosition = 'leading', onAvatarClick, action, className }, ref) => {
    const avatarNode = avatar ? (
      onAvatarClick ? (
        <button
          type="button"
          onClick={onAvatarClick}
          className="h-10 w-10 shrink-0 overflow-hidden rounded-full outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/30 active:scale-95"
        >
          {avatar}
        </button>
      ) : (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">{avatar}</div>
      )
    ) : null;

    return (
      <div ref={ref} className={cn('flex h-14 w-full items-center justify-between gap-3', className)}>
        <div className="flex min-w-0 items-center gap-2.5">
          {avatarPosition === 'leading' && avatarNode}
          <div className="min-w-0">
            {name && <h1 className="truncate text-lg font-semibold leading-tight tracking-tight">{name}</h1>}
            {(greeting || meta) && (
              <p className="truncate text-xs leading-tight text-muted-foreground">
                {greeting}
                {greeting && meta ? ' · ' : ''}
                {meta}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {avatarPosition === 'trailing' && avatarNode}
          {action}
        </div>
      </div>
    );
  },
);
UserGreeting.displayName = 'UserGreeting';

export { UserGreeting };
```


### `src/components/jokoui/user-info.tsx`

```tsx
import * as React from 'react';

import { cn } from '@/lib/utils';

interface UserInfoStat {
  value: React.ReactNode;
  label: React.ReactNode;
}

interface UserInfoProps {
  avatar?: React.ReactNode;
  name: React.ReactNode;
  subtitle?: React.ReactNode;
  stats?: UserInfoStat[];
  className?: string;
  children?: React.ReactNode;
}

/** Kartu profil = Card Shark: avatar 56px bulat, nama 16/600, stat berkolom dipisah garis. */
const UserInfo = React.forwardRef<HTMLDivElement, UserInfoProps>(
  ({ avatar, name, subtitle, stats, className, children }, ref) => (
    <div ref={ref} className={cn('rounded-xl border border-border bg-card p-4 text-center shadow-xs', className)}>
      {avatar && (
        <div className="mx-auto mb-2.5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-semibold text-primary-foreground">
          {avatar}
        </div>
      )}
      <p className="text-base font-semibold leading-tight">{name}</p>
      {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
      {stats && stats.length > 0 && (
        <div className="mt-4 flex border-t border-border pt-3">
          {stats.map((s, i) => (
            <div key={i} className={cn('min-w-0 flex-1', i > 0 && 'border-l border-border')}>
              <p className="truncate text-sm font-semibold tabular-nums">{s.value}</p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  ),
);
UserInfo.displayName = 'UserInfo';

export { UserInfo };
```


### `src/components/jokoui/whatsapp-action.tsx`

```tsx
import { cn } from '@/lib/utils';

/**
 * Tombol kirim pesan WhatsApp dengan teks yang sudah tersusun.
 *
 * Warung menagih lewat WhatsApp, bukan email. Menyusun kalimatnya otomatis
 * menghilangkan hambatan sosial "canggung menagih" — hambatan nyata yang
 * membuat kasbon menumpuk meskipun datanya sudah tercatat rapi.
 */
export interface WhatsAppActionProps {
  /** Nomor tujuan, format bebas (spasi, tanda hubung, 0/62 di depan). */
  phone: string;
  message: string;
  label: string;
  variant?: 'solid' | 'soft';
  className?: string;
  disabled?: boolean;
}

/** Normalkan nomor Indonesia ke format internasional tanpa tanda baca. */
export function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.02h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 5.82 2.42 8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.09-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.55-.43h-.47c-.16 0-.43.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.71 2.61 4.15 3.66.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.47-.28z" />
    </svg>
  );
}

export function WhatsAppAction({
  phone,
  message,
  label,
  variant = 'soft',
  className,
  disabled,
}: WhatsAppActionProps) {
  const number = toWhatsAppNumber(phone);
  const unavailable = disabled || !number;

  const open = () => {
    if (!number) return;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={unavailable}
      title={unavailable ? 'Nomor WhatsApp belum diisi' : undefined}
      className={cn(
        'flex h-9 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100',
        variant === 'solid'
          ? 'border-transparent bg-success text-white shadow-sm hover:bg-success/90'
          : 'border-success/20 bg-success/10 text-success-text hover:bg-success/20',
        className,
      )}
    >
      <WhatsAppIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
```


### `src/components/ui/accordion.tsx`

```tsx
import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "@/components/icons";

import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn("border-b border-border last:border-b-0", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-semibold transition-all hover:text-primary [&[data-state=open]>svg]:rotate-180 [&[data-state=open]>svg]:text-primary",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-primary transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
));

AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
```


### `src/components/ui/alert-dialog.tsx`

```tsx
import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-border bg-popover p-5 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className,
      )}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
```


### `src/components/ui/alert.tsx`

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 shadow-sm [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-5 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground border-border",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive-text [&>svg]:text-destructive-text",
        success: "border-success/30 bg-success/10 text-success-text [&>svg]:text-success-text",
        warning: "border-warning/30 bg-warning/10 text-warning-text [&>svg]:text-warning-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
```


### `src/components/ui/aspect-ratio.tsx`

```tsx
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

const AspectRatio = AspectRatioPrimitive.Root;

export { AspectRatio };
```


### `src/components/ui/avatar.tsx`

```tsx
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-2 ring-primary/20", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
```


### `src/components/ui/badge.tsx`

```tsx
/** Alias ke Badge jokoui (gaya Shark UI: tint 10% + border 20%). */
export { Badge, badgeVariants, type BadgeProps } from '@/components/jokoui/badge';
```


### `src/components/ui/breadcrumb.tsx`

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "@/components/icons";

import { cn } from "@/lib/utils";

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode;
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<"ol">>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
        className,
      )}
      {...props}
    />
  ),
);
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />
  ),
);
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean;
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";

  return <Comp ref={ref} className={cn("transition-colors hover:text-foreground", className)} {...props} />;
});
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-normal text-foreground", className)}
      {...props}
    />
  ),
);
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = ({ children, className, ...props }: React.ComponentProps<"li">) => (
  <li role="presentation" aria-hidden="true" className={cn("[&>svg]:size-3.5", className)} {...props}>
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
```


### `src/components/ui/button.tsx`

```tsx
/**
 * Alias ke tombol jokoui (gaya Shark UI) supaya komponen shadcn bawaan
 * (calendar, pagination, alert-dialog, carousel, sidebar) memakai visual
 * yang sama dengan seluruh aplikasi.
 */
export { Button, buttonVariants, type ButtonProps } from '@/components/jokoui/button';
```


### `src/components/ui/calendar.tsx`

```tsx
import * as React from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 rounded-lg bg-transparent p-0 opacity-60 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground w-9 font-medium text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-lg [&:has([aria-selected].day-outside)]:bg-primary/20 [&:has([aria-selected])]:bg-primary first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 rounded-lg font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg",
        day_today: "bg-primary/10 text-primary rounded-lg",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-primary/20 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-primary aria-selected:text-primary-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
```


### `src/components/ui/card.tsx`

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md", className)} {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-tight tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```


### `src/components/ui/carousel.tsx`

```tsx
import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "@/components/icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

const Carousel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & CarouselProps>(
  ({ orientation = "horizontal", opts, setApi, plugins, className, children, ...props }, ref) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins,
    );
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return;
      }

      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    }, []);

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev();
    }, [api]);

    const scrollNext = React.useCallback(() => {
      api?.scrollNext();
    }, [api]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          scrollPrev();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          scrollNext();
        }
      },
      [scrollPrev, scrollNext],
    );

    React.useEffect(() => {
      if (!api || !setApi) {
        return;
      }

      setApi(api);
    }, [api, setApi]);

    React.useEffect(() => {
      if (!api) {
        return;
      }

      onSelect(api);
      api.on("reInit", onSelect);
      api.on("select", onSelect);

      return () => {
        api?.off("select", onSelect);
      };
    }, [api, onSelect]);

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: api,
          opts,
          orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    );
  },
);
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { carouselRef, orientation } = useCarousel();

    return (
      <div ref={carouselRef} className="overflow-hidden">
        <div
          ref={ref}
          className={cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)}
          {...props}
        />
      </div>
    );
  },
);
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { orientation } = useCarousel();

    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={cn("min-w-0 shrink-0 grow-0 basis-full", orientation === "horizontal" ? "pl-4" : "pt-4", className)}
        {...props}
      />
    );
  },
);
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel();

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full",
          orientation === "horizontal"
            ? "-left-12 top-1/2 -translate-y-1/2"
            : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
          className,
        )}
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        {...props}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">Previous slide</span>
      </Button>
    );
  },
);
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { orientation, scrollNext, canScrollNext } = useCarousel();

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full",
          orientation === "horizontal"
            ? "-right-12 top-1/2 -translate-y-1/2"
            : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
          className,
        )}
        disabled={!canScrollNext}
        onClick={scrollNext}
        {...props}
      >
        <ArrowRight className="h-4 w-4" />
        <span className="sr-only">Next slide</span>
      </Button>
    );
  },
);
CarouselNext.displayName = "CarouselNext";

export { type CarouselApi, Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
```


### `src/components/ui/chart.tsx`

```tsx
import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item.dataKey || item.name || "value"}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>;
      }

      if (!value) {
        return null;
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== "dot";

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color || item.payload.fill || item.color;

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center",
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", {
                            "h-2.5 w-2.5": indicator === "dot",
                            "w-1": indicator === "line",
                            "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                            "my-0.5": nestLabel && indicator === "dashed",
                          })}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center",
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
                      </div>
                      {item.value && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div
            key={item.value}
            className={cn("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground")}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegend";

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
```


### `src/components/ui/checkbox.tsx`

```tsx
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "@/components/icons";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-5 w-5 shrink-0 rounded-lg border-2 border-border bg-background transition-all data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
      <Check className="h-3.5 w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
```


### `src/components/ui/collapsible.tsx`

```tsx
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
```


### `src/components/ui/command.tsx`

```tsx
import * as React from "react";
import { type DialogProps } from "@radix-ui/react-dialog";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "@/components/icons";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

type CommandDialogProps = DialogProps;

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl">
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-14 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:rounded-xl [&_[cmdk-item]]:my-0.5 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />);

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className,
    )}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn("-mx-1 h-px bg-border", className)} {...props} />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
      className,
    )}
    {...props}
  />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
```


### `src/components/ui/context-menu.tsx`

```tsx
import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight, Circle } from "@/components/icons";

import { cn } from "@/lib/utils";

const ContextMenu = ContextMenuPrimitive.Root;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
));
ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold text-foreground", inset && "pl-8", className)}
    {...props}
  />
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
```


### `src/components/ui/dialog.tsx`

```tsx
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@/components/icons";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-border bg-popover p-5 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold leading-6 tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```


### `src/components/ui/drawer.tsx`

```tsx
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

const Drawer = ({ shouldScaleBackground = true, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm", className)} {...props} />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[2rem] border border-border bg-card shadow-2xl",
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
```


### `src/components/ui/dropdown-menu.tsx`

```tsx
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "@/components/icons";

import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[state=open]:bg-accent data-[state=open]:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />;
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
```


### `src/components/ui/form.tsx`

```tsx
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import { Controller, ControllerProps, FieldPath, FieldValues, FormProvider, useFormContext } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn("space-y-2", className)} {...props} />
      </FormItemContext.Provider>
    );
  },
);
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return <Label ref={ref} className={cn(error && "text-destructive", className)} htmlFor={formItemId} {...props} />;
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(
  ({ ...props }, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

    return (
      <Slot
        ref={ref}
        id={formItemId}
        aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
        aria-invalid={!!error}
        {...props}
      />
    );
  },
);
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField();

    return <p ref={ref} id={formDescriptionId} className={cn("text-sm text-muted-foreground", className)} {...props} />;
  },
);
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error?.message) : children;

    if (!body) {
      return null;
    }

    return (
      <p ref={ref} id={formMessageId} className={cn("text-sm font-medium text-destructive", className)} {...props}>
        {body}
      </p>
    );
  },
);
FormMessage.displayName = "FormMessage";

export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField };
```


### `src/components/ui/hover-card.tsx`

```tsx
import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "@/lib/utils";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };
```


### `src/components/ui/input-otp.tsx`

```tsx
import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Dot } from "@/components/icons";

import { cn } from "@/lib/utils";

const InputOTP = React.forwardRef<React.ElementRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput>>(
  ({ className, containerClassName, ...props }, ref) => (
    <OTPInput
      ref={ref}
      containerClassName={cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  ),
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center", className)} {...props} />,
);
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-2 ring-ring ring-offset-background",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink h-4 w-px bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
  ({ ...props }, ref) => (
    <div ref={ref} role="separator" {...props}>
      <Dot />
    </div>
  ),
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
```


### `src/components/ui/input.tsx`

```tsx
/**
 * Alias ke input jokoui (gaya Shark UI). Komponen shadcn internal
 * (form, sidebar) mengimpor jalur ini, jadi diarahkan ke satu sumber
 * kebenaran supaya tidak ada dua gaya yang hidup berdampingan.
 */
export { Input } from '@/components/jokoui/input';
```


### `src/components/ui/label.tsx`

```tsx
/**
 * Alias ke label jokoui (gaya Shark UI). Komponen shadcn internal
 * (form, sidebar) mengimpor jalur ini, jadi diarahkan ke satu sumber
 * kebenaran supaya tidak ada dua gaya yang hidup berdampingan.
 */
export { Label } from '@/components/jokoui/label';
```


### `src/components/ui/menubar.tsx`

```tsx
import * as React from "react";
import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { Check, ChevronRight, Circle } from "@/components/icons";

import { cn } from "@/lib/utils";

const MenubarMenu = MenubarPrimitive.Menu;

const MenubarGroup = MenubarPrimitive.Group;

const MenubarPortal = MenubarPrimitive.Portal;

const MenubarSub = MenubarPrimitive.Sub;

const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

const Menubar = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Root
    ref={ref}
    className={cn("flex h-10 items-center space-x-1 rounded-lg border bg-background p-1", className)}
    {...props}
  />
));
Menubar.displayName = MenubarPrimitive.Root.displayName;

const MenubarTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  />
));
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName;

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </MenubarPrimitive.SubTrigger>
));
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;

const MenubarSubContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName;

const MenubarContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
>(({ className, align = "start", alignOffset = -4, sideOffset = 8, ...props }, ref) => (
  <MenubarPrimitive.Portal>
    <MenubarPrimitive.Content
      ref={ref}
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[12rem] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </MenubarPrimitive.Portal>
));
MenubarContent.displayName = MenubarPrimitive.Content.displayName;

const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
MenubarItem.displayName = MenubarPrimitive.Item.displayName;

const MenubarCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <MenubarPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
));
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;

const MenubarRadioItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
));
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;

const MenubarLabel = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
MenubarLabel.displayName = MenubarPrimitive.Label.displayName;

const MenubarSeparator = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;

const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
};
MenubarShortcut.displayname = "MenubarShortcut";

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};
```


### `src/components/ui/navigation-menu.tsx`

```tsx
import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "@/components/icons";

import { cn } from "@/lib/utils";

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
));
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)}
    {...props}
  />
));
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

const NavigationMenuItem = NavigationMenuPrimitive.Item;

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-10 w-max items-center justify-center rounded-lg bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
);

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}{" "}
    <ChevronDown
      className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto",
      className,
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = NavigationMenuPrimitive.Link;

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  </div>
));
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName;

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className,
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-lg" />
  </NavigationMenuPrimitive.Indicator>
));
NavigationMenuIndicator.displayName = NavigationMenuPrimitive.Indicator.displayName;

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
};
```


### `src/components/ui/pagination.tsx`

```tsx
import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "@/components/icons";

import { cn } from "@/lib/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/button";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
  ),
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({ className, isActive, size = "icon", ...props }: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className,
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" size="default" className={cn("gap-1 pl-2.5", className)} {...props}>
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" size="default" className={cn("gap-1 pr-2.5", className)} {...props}>
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
```


### `src/components/ui/popover.tsx`

```tsx
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
```


### `src/components/ui/progress.tsx`

```tsx
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 rounded-full bg-primary transition-all duration-500"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
```


### `src/components/ui/radio-group.tsx`

```tsx
import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "@/components/icons";

import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitive.Root className={cn("grid gap-2", className)} {...props} ref={ref} />;
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-5 w-5 rounded-full border-2 border-border bg-background text-primary ring-offset-background transition-all data-[state=checked]:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
```


### `src/components/ui/resizable.tsx`

```tsx
import { GripVertical } from "@/components/icons";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
```


### `src/components/ui/scroll-area.tsx`

```tsx
import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">{children}</ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-primary/40" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
```


### `src/components/ui/select.tsx`

```tsx
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "@/components/icons";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-sm font-medium shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground/60 dark:bg-input/30 focus:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 [&>span]:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
        "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
          "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
```


### `src/components/ui/separator.tsx`

```tsx
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "@/lib/utils";

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
```


### `src/components/ui/sheet.tsx`

```tsx
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "@/components/icons";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-popover text-popover-foreground shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 rounded-b-2xl border-b border-border p-5 data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 rounded-t-2xl border-t border-border px-4 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 rounded-r-2xl border-r border-border p-5 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 rounded-l-2xl border-l border-border p-5 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
  VariantProps<typeof sheetVariants> { }

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  ),
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-base font-semibold leading-6 text-foreground", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
```


### `src/components/ui/sidebar.tsx`

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeft } from "@/components/icons";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContext = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContext | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContext>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn("group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar", className)}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
});
SidebarProvider.displayName = "SidebarProvider";

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
  }
>(({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }, ref) => {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        className={cn("flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground", className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-mobile="true"
          className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      ref={ref}
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        className={cn(
          "relative h-svh w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]",
        )}
      />
      <div
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
        >
          {children}
        </div>
      </div>
    </div>
  );
});
Sidebar.displayName = "Sidebar";

const SidebarTrigger = React.forwardRef<React.ElementRef<typeof Button>, React.ComponentProps<typeof Button>>(
  ({ className, onClick, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();

    return (
      <Button
        ref={ref}
        data-sidebar="trigger"
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", className)}
        onClick={(event) => {
          onClick?.(event);
          toggleSidebar();
        }}
        {...props}
      >
        <PanelLeft />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    );
  },
);
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();

    return (
      <button
        ref={ref}
        data-sidebar="rail"
        aria-label="Toggle Sidebar"
        tabIndex={-1}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
        className={cn(
          "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] group-data-[side=left]:-right-4 group-data-[side=right]:left-0 hover:after:bg-sidebar-border sm:flex",
          "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
          "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
          "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
          "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
          "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarRail.displayName = "SidebarRail";

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<"main">>(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background",
        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className,
      )}
      {...props}
    />
  );
});
SidebarInset.displayName = "SidebarInset";

const SidebarInput = React.forwardRef<React.ElementRef<typeof Input>, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        data-sidebar="input"
        className={cn(
          "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarInput.displayName = "SidebarInput";

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return <div ref={ref} data-sidebar="header" className={cn("flex flex-col gap-2 p-2", className)} {...props} />;
});
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return <div ref={ref} data-sidebar="footer" className={cn("flex flex-col gap-2 p-2", className)} {...props} />;
});
SidebarFooter.displayName = "SidebarFooter";

const SidebarSeparator = React.forwardRef<React.ElementRef<typeof Separator>, React.ComponentProps<typeof Separator>>(
  ({ className, ...props }, ref) => {
    return (
      <Separator
        ref={ref}
        data-sidebar="separator"
        className={cn("mx-2 w-auto bg-sidebar-border", className)}
        {...props}
      />
    );
  },
);
SidebarSeparator.displayName = "SidebarSeparator";

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  );
});
SidebarContent.displayName = "SidebarContent";

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
});
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & { asChild?: boolean }>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";

    return (
      <Comp
        ref={ref}
        data-sidebar="group-label"
        className={cn(
          "flex h-8 shrink-0 items-center rounded-lg px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
          "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupAction = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & { asChild?: boolean }>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-sidebar="group-action"
        className={cn(
          "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-lg p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
          // Increases the hit area of the button on mobile.
          "after:absolute after:-inset-2 after:md:hidden",
          "group-data-[collapsible=icon]:hidden",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarGroupAction.displayName = "SidebarGroupAction";

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-sidebar="group-content" className={cn("w-full text-sm", className)} {...props} />
  ),
);
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({ className, ...props }, ref) => (
  <ul ref={ref} data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props} />
));
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li ref={ref} data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...props} />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-lg p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(({ asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      ref={ref}
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" hidden={state !== "collapsed" || isMobile} {...tooltip} />
    </Tooltip>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    showOnHover?: boolean;
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-lg p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className,
      )}
      {...props}
    />
  );
});
SidebarMenuAction.displayName = "SidebarMenuAction";

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-lg px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  ),
);
SidebarMenuBadge.displayName = "SidebarMenuBadge";

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean;
  }
>(({ className, showIcon = false, ...props }, ref) => {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-lg px-2", className)}
      {...props}
    >
      {showIcon && <Skeleton className="size-4 rounded-lg" data-sidebar="menu-skeleton-icon" />}
      <Skeleton
        className="h-4 max-w-[--skeleton-width] flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      data-sidebar="menu-sub"
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  ),
);
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ ...props }, ref) => (
  <li ref={ref} {...props} />
));
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean;
    size?: "sm" | "md";
    isActive?: boolean;
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-lg px-2 text-sidebar-foreground outline-none ring-sidebar-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
```


### `src/components/ui/skeleton.tsx`

```tsx
/**
 * Alias ke skeleton jokoui (gaya Shark UI). Komponen shadcn internal
 * (form, sidebar) mengimpor jalur ini, jadi diarahkan ke satu sumber
 * kebenaran supaya tidak ada dua gaya yang hidup berdampingan.
 */
export { Skeleton } from '@/components/jokoui/skeleton';
```


### `src/components/ui/slider.tsx`

```tsx
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
      <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
```


### `src/components/ui/sonner.tsx`

```tsx
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      closeButton
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border-border group-[.toast]:rounded-lg",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
```


### `src/components/ui/switch.tsx`

```tsx
import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-transparent p-px transition-all data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-xs transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0 dark:bg-foreground dark:data-[state=checked]:bg-primary-foreground",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
```


### `src/components/ui/table.tsx`

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-x-auto rounded-xl border border-border">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("bg-muted text-foreground", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("divide-y divide-border bg-card", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("transition-colors hover:bg-muted/50", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-semibold text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
```


### `src/components/ui/tabs.tsx`

```tsx
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center gap-2 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex h-[45px] items-center justify-center whitespace-nowrap rounded-full border border-border bg-card px-4 text-sm font-semibold ring-offset-background transition-all duration-200 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
```


### `src/components/ui/textarea.tsx`

```tsx
/**
 * Alias ke textarea jokoui (gaya Shark UI). Komponen shadcn internal
 * (form, sidebar) mengimpor jalur ini, jadi diarahkan ke satu sumber
 * kebenaran supaya tidak ada dua gaya yang hidup berdampingan.
 */
export { Textarea } from '@/components/jokoui/textarea';
```


### `src/components/ui/toast.tsx`

```tsx
import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "@/components/icons";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border bg-popover p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent px-3 text-sm font-medium shadow-xs ring-offset-background transition-colors group-[.destructive]:border-muted/40 hover:bg-secondary group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-[.destructive]:focus:ring-destructive disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-lg p-1 text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 group-[.destructive]:text-red-300 hover:text-foreground group-[.destructive]:hover:text-red-50 focus:opacity-100 focus:outline-none focus:ring-2 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
```


### `src/components/ui/toaster.tsx`

```tsx
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
```


### `src/components/ui/toggle-group.tsx`

```tsx
import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: "default",
  variant: "default",
});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root ref={ref} className={cn("flex items-center justify-center gap-1", className)} {...props}>
    <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
```


### `src/components/ui/toggle.tsx`

```tsx
import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
```


### `src/components/ui/tooltip.tsx`

```tsx
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-full border border-border bg-popover px-3 py-1.5 text-sm font-medium text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
```

