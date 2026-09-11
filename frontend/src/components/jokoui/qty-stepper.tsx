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
