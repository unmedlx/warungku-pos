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
