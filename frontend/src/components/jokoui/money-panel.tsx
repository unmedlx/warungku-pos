import * as React from 'react';

import { cn } from '@/lib/utils';
import { useMoneyVisibility } from './money-display';

/**
 * Satu momen bergerak yang digarap, bukan efek tekan yang bertebaran.
 *
 * Di app ini kejadian yang paling sering diulang dan paling perlu
 * dikonfirmasi adalah nominal berubah: barang masuk keranjang, diskon
 * dipakai, transaksi ditutup. Panel dompet adalah objek yang memikulnya,
 * jadi di sinilah satu-satunya beat milik app ini hidup.
 *
 * Bentuknya sengaja menahan diri: angkanya sudah terlihat sejak awal
 * (tidak ada yang dianimasikan dari keadaan tersembunyi), lalu mendarat
 * dengan ease-out eksponensial pendek. Di HP Android kelas bawah ini
 * transform dan opacity saja — tidak ada layout, tidak ada blur, tidak ada
 * biaya yang dibayar tiap frame.
 */
function useValueBeat(value: number) {
  const [beat, setBeat] = React.useState(0);
  const previous = React.useRef(value);

  React.useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setBeat((n) => n + 1);
  }, [value]);

  return beat;
}

/**
 * MoneyPanel — bidang brand yang dicelup penuh.
 *
 * Ini setengah dari dunia visual "Dibagi Per Peran": di layar yang
 * pekerjaannya uang (kasir, pembayaran, laporan), nominal adalah OBJEK-nya,
 * bukan keterangan di sebelah label. Panel ini yang memikulnya — satu per
 * layar, tidak pernah dua.
 *
 * Aturan yang dipegang di sini:
 *  - Warna dicelup, bukan diaksen: seluruh bidang memakai `--primary`.
 *  - Teks sekunder di atasnya memakai `--primary-dim`, yang ditint dari hue
 *    brand-nya sendiri. Abu-abu di atas biru selalu terbaca kotor, dan pada
 *    aksen apa pun rasionya jatuh di bawah 4.5:1.
 *  - Tidak ada gradien dan tidak ada glass. Bidangnya rata; kedalamannya
 *    datang dari bayangan brand, bukan dari lapisan transparan.
 *
 * `variant="screen"` menempel di puncak layar (sudut bawah saja membulat);
 * `variant="card"` berdiri sebagai kartu di tengah halaman.
 */
export interface MoneyPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'screen' | 'card';
}

const MoneyPanel = React.forwardRef<HTMLDivElement, MoneyPanelProps>(
  ({ className, variant = 'screen', ...props }, ref) => (
    <div
      ref={ref}
      data-slot="money-panel"
      className={cn(
        'bg-primary text-primary-foreground',
        variant === 'screen'
          ? 'rounded-b-3xl px-4 pb-5 pt-3'
          : 'rounded-2xl px-4 py-4 shadow-primary',
        className,
      )}
      {...props}
    />
  ),
);
MoneyPanel.displayName = 'MoneyPanel';

/** Label kecil di atas nominal. Ditint dari hue brand, bukan abu-abu. */
const MoneyPanelLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="money-panel-label"
      className={cn('text-xsm font-semibold text-primary-dim', className)}
      {...props}
    />
  ),
);
MoneyPanelLabel.displayName = 'MoneyPanelLabel';

export interface MoneyPanelAmountProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  locale?: string;
  /** `hero` untuk satu angka utama layar; `lead` untuk panel kartu. */
  scale?: 'hero' | 'lead';
  /** Abaikan toggle privasi global (mis. nominal di dalam form). */
  alwaysVisible?: boolean;
}

/**
 * Nominal utama di atas panel. Tabular dan berat, dengan tracking negatif:
 * angka uang di app ini dibaca sambil berdiri, dari jarak lengan.
 */
const MoneyPanelAmount = React.forwardRef<HTMLSpanElement, MoneyPanelAmountProps>(
  ({ className, value, locale = 'id-ID', scale = 'hero', alwaysVisible = false, ...props }, ref) => {
    const { hidden } = useMoneyVisibility();
    const beat = useValueBeat(value);
    const masked = !alwaysVisible && hidden;
    const abs = Math.abs(Math.round(value));
    const sign = value < 0 ? '−' : '';

    return (
      <span
        ref={ref}
        data-slot="money-panel-amount"
        /* `key` pada beat memaksa remount, jadi animasinya jalan ulang tiap
           nominal berubah tanpa perlu membatalkan timer sendiri. */
        key={beat}
        className={cn(
          'flex items-baseline gap-1.5 tabular-nums whitespace-nowrap',
          'animate-amount-land motion-reduce:animate-none',
          scale === 'hero' ? 'text-[2.6rem] leading-[1.02]' : 'text-metric leading-[1.05]',
          'font-extrabold tracking-[-0.035em]',
          className,
        )}
        {...props}
      >
        <span className={cn('font-semibold text-primary-dim', scale === 'hero' ? 'text-heading' : 'text-base')}>
          Rp
        </span>
        <span>{masked ? '••••••' : `${sign}${abs.toLocaleString(locale)}`}</span>
      </span>
    );
  },
);
MoneyPanelAmount.displayName = 'MoneyPanelAmount';

/**
 * Kaki panel: meta di kiri, satu tautan di kanan, dipisah garis tipis yang
 * digambar dari putih transparan supaya ikut warna apa pun aksennya.
 */
const MoneyPanelFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="money-panel-footer"
      className={cn(
        'mt-3.5 flex items-center justify-between gap-3 border-t border-white/20 pt-3',
        'text-xsm font-medium text-primary-dim',
        className,
      )}
      {...props}
    />
  ),
);
MoneyPanelFooter.displayName = 'MoneyPanelFooter';

export { MoneyPanel, MoneyPanelLabel, MoneyPanelAmount, MoneyPanelFooter };
