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

/**
 * Skala nominal. Bobotnya sengaja berat dan naik seiring ukuran: uang di app
 * ini dibaca sambil berdiri, di HP murah, kadang di bawah matahari. Angka
 * yang disetel seperti teks biasa adalah angka yang harus didekatkan ke mata.
 */
const SIZE_CLASS = {
  sm: 'text-xsm font-semibold',
  md: 'text-base font-bold tracking-[-0.01em]',
  lg: 'text-amount font-bold tracking-[-0.02em]',
  xl: 'text-metric leading-[1.05] font-extrabold tracking-[-0.035em]',
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
      {/* Prefiks "Rp" diredupkan lewat ukuran dan bobot, bukan opacity:
          opacity mencampur warnanya dengan apa pun yang ada di belakangnya,
          dan nominal ini juga berdiri di atas bidang brand yang dicelup. */}
      {symbol && <span className="mr-1 text-[0.8em] font-semibold">{symbol}</span>}
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
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-foreground motion-reduce:transition-none',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        className,
      )}
    >
      <Icon className="size-4.5" />
    </button>
  );
}
