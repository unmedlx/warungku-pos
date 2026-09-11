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
