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
