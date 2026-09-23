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
      className={cn('col-start-[var(--alert-col)] text-xsm leading-snug text-muted-foreground', className)}
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
