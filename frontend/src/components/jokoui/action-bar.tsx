import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * ActionBar — baris aksi tebal di garis jempol.
 *
 * Pasangan dari `MoneyPanel`: panel memikul nominalnya di puncak layar,
 * baris ini memikul aksinya di dasar layar, dan di antara keduanya konten
 * boleh digulir sebebasnya. Satu layar punya paling banyak satu baris aksi —
 * begitu ada dua, tidak ada lagi yang jadi aksi utama.
 *
 * Duduk tepat di atas `BottomNav`. Safe-area TIDAK ditambahkan di sini:
 * `html` di index.css sudah memadanginya sekali untuk seluruh app, dan
 * menambahkannya lagi per komponen menghasilkan celah ganda di HP berponi.
 */
const ActionBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="action-bar"
      className={cn(
        'sticky bottom-0 z-40 shrink-0 border-t border-border bg-card px-4 pb-2.5 pt-2.5',
        className,
      )}
      {...props}
    />
  ),
);
ActionBar.displayName = 'ActionBar';

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Teks aksi di kiri, mis. "Bayar". */
  label: React.ReactNode;
  /** Nominal di kanan. Dibiarkan kosong untuk aksi tanpa uang. */
  amount?: React.ReactNode;
}

/**
 * Tombol di dalam `ActionBar`. Aksi di kiri, nominal di kanan — urutan baca
 * yang sama dengan struk: apa yang dilakukan dulu, berapa yang dibayar
 * kemudian.
 */
const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className, label, amount, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      data-slot="action-button"
      disabled={disabled}
      className={cn(
        'flex h-[54px] w-full items-center justify-between gap-3 rounded-lg px-5',
        'bg-primary text-primary-foreground shadow-primary',
        'text-base font-bold tracking-[-0.01em]',
        'transition-transform duration-100 active:scale-[0.985] active:bg-primary-press',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:bg-muted disabled:text-faint-foreground disabled:shadow-none',
        'motion-reduce:transition-none motion-reduce:active:scale-100',
        className,
      )}
      {...props}
    >
      <span className="min-w-0 truncate">{label}</span>
      {amount != null && <span className="shrink-0 text-amount font-extrabold tabular-nums">{amount}</span>}
    </button>
  ),
);
ActionButton.displayName = 'ActionButton';

export { ActionBar, ActionButton };
