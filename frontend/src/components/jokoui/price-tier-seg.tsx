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
