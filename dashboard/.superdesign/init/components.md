<!-- Superdesign init — generated for `dashboard` -->

# Components — `dashboard`

Owner multi-store dashboard (Vite + React + TS, Tailwind, custom components)

Shared UI primitives with FULL source. 10 files.

### `src/components/Common.tsx`

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatDelta } from '@/lib/format';

/**
 * Kit komponen bergaya Shark UI untuk dashboard pemilik — padanan ringkas dari
 * `frontend/src/components/jokoui/*` di aplikasi kasir. Semua layar memakai
 * komponen di file ini; jangan menulis ulang gaya kartu/tombol/badge sendiri,
 * supaya radius, tinggi, dan tint warnanya tetap satu.
 *
 * Aturan yang dipegang di sini:
 *   radius  tombol/input 8px (`rounded-lg`), kartu 12px (`rounded-xl`)
 *   bobot   600 untuk judul & nominal, 500 untuk label & tombol, 400 body
 *   status  fill pekat hanya untuk bilah/grafik; TEKS memakai `*-text` (shade 700)
 */

/* ══════════════════════════ Tombol ══════════════════════════ */

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'destructive' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
  outline: 'border border-input bg-card shadow-xs hover:bg-muted',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  destructive:
    'border border-input bg-card text-destructive-text shadow-xs hover:bg-destructive/10',
  link: 'h-auto p-0 text-muted-foreground hover:text-foreground',
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  default: 'h-9 px-3',
  sm: 'h-8 px-2.5 text-[13px]',
  lg: 'h-10 px-4',
  icon: 'h-9 w-9',
  'icon-sm': 'h-8 w-8',
};

/**
 * Kelas tombol tanpa elemennya — untuk `<a>` dan `<Link>` yang harus tampil
 * sebagai tombol. Komponen `Button` di bawah memakai helper yang sama.
 */
export function buttonClass(
  variant: ButtonVariant = 'outline',
  size: ButtonSize = 'default',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    BUTTON_VARIANT[variant],
    variant === 'link' ? 'text-[13px]' : BUTTON_SIZE[size],
    className,
  );
}

export function Button({
  variant = 'outline',
  size = 'default',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

/* ══════════════════════════ Kartu ══════════════════════════ */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card shadow-xs', className)}>
      {children}
    </div>
  );
}

/** Kepala kartu: judul 14/600, keterangan abu di sampingnya, aksi di kanan. */
export function CardHead({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5">
      <h2 className="text-sm font-semibold">
        {title}
        {hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}
      </h2>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

/** Judul seksi di luar kartu — 14/600, tanpa uppercase-tracking. */
export function SectionTitle({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
      <h2 className="text-sm font-semibold">
        {title}
        {hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}
      </h2>
      {children}
    </div>
  );
}

/* ══════════════════════════ Badge ══════════════════════════ */

type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info';

/** Tint 10% + border 20% + teks shade 700 — pola badge Shark. */
const BADGE_VARIANT: Record<BadgeVariant, string> = {
  primary: 'bg-primary/10 border-primary/20 text-primary',
  secondary: 'bg-muted border-border text-muted-foreground',
  outline: 'border-border text-muted-foreground',
  success: 'bg-success/10 border-success/20 text-success-text',
  warning: 'bg-warning/10 border-warning/25 text-warning-text',
  destructive: 'bg-destructive/10 border-destructive/20 text-destructive-text',
  info: 'bg-info/10 border-info/20 text-info-text',
};

export function Badge({
  variant = 'secondary',
  size = 'default',
  pill,
  className,
  children,
}: {
  variant?: BadgeVariant;
  size?: 'default' | 'sm';
  pill?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap border font-medium',
        pill ? 'rounded-full' : 'rounded-md',
        size === 'sm' ? 'h-5 px-1.5 text-[11px]' : 'h-[22px] px-2 text-xs',
        BADGE_VARIANT[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Perubahan terhadap periode pembanding. Nol dan `null` sengaja netral: warna
 * hijau/merah hanya dipakai kalau memang ada arah yang bisa ditindaklanjuti.
 */
export function DeltaBadge({ value, size = 'sm' }: { value: number | null; size?: 'default' | 'sm' }) {
  const variant: BadgeVariant =
    value === null || value === 0 ? 'secondary' : value > 0 ? 'success' : 'destructive';
  return (
    <Badge variant={variant} size={size} pill className="tabular-nums">
      {formatDelta(value)}
    </Badge>
  );
}

/* ══════════════════════════ Statistik ══════════════════════════ */

/** Kartu angka ringkas — label 12/500, nilai 22/600, baris catatan di bawah. */
export function StatCard({
  label,
  value,
  title,
  children,
  className,
}: {
  label: string;
  value: string;
  /** Angka penuh untuk tooltip saat nilainya diringkas (Rp 48,2 jt). */
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('px-4 py-3.5', className)}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="my-1.5 text-[22px] font-semibold tracking-tight tabular-nums" title={title}>
        {value}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {children}
        </div>
      )}
    </Card>
  );
}

/* ══════════════════════════ Baris daftar ══════════════════════════ */

type Tone = 'muted' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';

const TONE_MEDIA: Record<Tone, string> = {
  muted: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success-text',
  warning: 'bg-warning/10 text-warning-text',
  destructive: 'bg-destructive/10 text-destructive-text',
  info: 'bg-info/10 text-info-text',
};

/** Kotak ikon 40px — pengganti "blob" bulat lama. */
export function ItemMedia({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn('grid h-10 w-10 flex-none place-items-center rounded-xl', TONE_MEDIA[tone])}>
      {children}
    </span>
  );
}

export function Item({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', className)}>{children}</div>
  );
}

export function ItemContent({ title, desc }: { title: ReactNode; desc?: ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium">{title}</div>
      {desc && <div className="mt-0.5 text-[13px] text-muted-foreground">{desc}</div>}
    </div>
  );
}

/** Kartu berisi baris-baris `Item` dengan garis pemisah. */
export function ItemList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Card className={cn('divide-y divide-border overflow-hidden', className)}>{children}</Card>
  );
}

/* ══════════════════════════ Rincian label–nilai ══════════════════════════ */

export function DataList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border">{children}</div>;
}

export function DataListRow({
  label,
  hint,
  value,
}: {
  label: string;
  hint?: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">
        {label}
        {hint && <small className="mt-0.5 block text-xs">{hint}</small>}
      </span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

/* ══════════════════════════ Peringatan ══════════════════════════ */

type AlertVariant = 'warning' | 'destructive' | 'info' | 'success';

const ALERT_VARIANT: Record<AlertVariant, string> = {
  warning: 'border-warning/30 bg-warning/[0.07] text-warning-text',
  destructive: 'border-destructive/30 bg-destructive/[0.06] text-destructive-text',
  info: 'border-info/30 bg-info/[0.06] text-info-text',
  success: 'border-success/30 bg-success/[0.06] text-success-text',
};

export function Alert({
  variant = 'warning',
  icon,
  title,
  description,
  action,
  className,
}: {
  variant?: AlertVariant;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px]',
        ALERT_VARIANT[variant],
        className,
      )}
    >
      {icon && <span className="mt-px flex-none">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{title}</div>
        {description && <div className="mt-0.5 text-muted-foreground">{description}</div>}
      </div>
      {action && <span className="ml-auto flex-none self-center">{action}</span>}
    </div>
  );
}

/* ══════════════════════════ Keadaan halaman ══════════════════════════ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-muted', className)} />;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert
      variant="destructive"
      title={message}
      action={
        onRetry ? (
          <Button size="sm" onClick={onRetry}>
            Coba lagi
          </Button>
        ) : undefined
      }
    />
  );
}

export function EmptyBox({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="px-6 py-10 text-center">
      {icon && (
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="text-sm font-semibold">{title}</div>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

/* ══════════════════════════ Kepala halaman ══════════════════════════ */

/** Judul 22/600 + subjudul, aksi rata kanan. Breadcrumb-nya ada di topbar. */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/* ══════════════════════════ Avatar & bilah ══════════════════════════ */

/** Inisial toko/orang. `square` untuk entitas (toko), bulat untuk orang. */
export function Avatar({
  children,
  tone = 'muted',
  square,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  square?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'grid h-8 w-8 flex-none place-items-center text-xs font-semibold',
        square ? 'rounded-lg' : 'rounded-full',
        TONE_MEDIA[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Bilah progres. `tone` mengubah warna isian, bukan latarnya. */
export function Bar({
  percent,
  tone = 'primary',
  className,
}: {
  percent: number;
  tone?: 'primary' | 'faded' | 'warning' | 'destructive';
  className?: string;
}) {
  const fill =
    tone === 'faded'
      ? 'bg-primary/40'
      : tone === 'warning'
        ? 'bg-warning'
        : tone === 'destructive'
          ? 'bg-destructive'
          : 'bg-primary';
  return (
    <span className={cn('bilah', className)}>
      <i className={fill} style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
    </span>
  );
}
```


### `src/components/Logo.tsx`

```tsx
/**
 * Logo KanPOS — sumber tunggal: `frontend/design/logo/kanpos-icon.svg`.
 * Ikon mesin kasir putih di dalam kotak biru brand; ukuran & radius sudut
 * ikut `className`. Kalau master SVG berubah, salin ulang path-nya ke sini
 * (komponen ini sengaja inline supaya logo tidak menunggu request jaringan).
 */
export default function Logo({ className = 'h-[34px] w-[34px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="KanPOS">
      <rect width="512" height="512" rx="112" fill="#3554C1" />
      <g
        transform="translate(80 92) scale(25.14)"
        fill="none"
        stroke="#fff"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 11h1" />
        <path d="M10 5V3" />
        <path d="M12 1.75A1.25 1.25 0 0 1 10.75 3h-1.5a1.25 1.25 0 0 1 0-2.5h1.5A1.25 1.25 0 0 1 12 1.75Z" />
        <path d="M5.5 5V1.5h-3V5" />
        <rect x=".5" y="8.5" width="13" height="5" rx="1" />
        <path d="M12.5 8.5V6a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v2.5" />
      </g>
    </svg>
  );
}
```


### `src/components/RangeControls.tsx`

```tsx
import { useEffect, useRef, useState } from 'react';
import { Calendar, Download, RefreshCw } from 'lucide-react';
import { subDays, startOfMonth } from 'date-fns';
import { formatDate, toInputDate } from '@/lib/format';
import type { Range } from '@/lib/api';
import { Button } from './Common';
import { cn } from '@/lib/cn';

export interface Preset {
  id: string;
  label: string;
  build: () => Range;
}

const today = () => new Date();

export const PRESETS: Preset[] = [
  { id: 'hari-ini', label: 'Hari ini', build: () => ({ from: toInputDate(today()), to: toInputDate(today()) }) },
  { id: '7hari', label: '7 hari', build: () => ({ from: toInputDate(subDays(today(), 6)), to: toInputDate(today()) }) },
  { id: '30hari', label: '30 hari', build: () => ({ from: toInputDate(subDays(today(), 29)), to: toInputDate(today()) }) },
  { id: 'bulan-ini', label: 'Bulan ini', build: () => ({ from: toInputDate(startOfMonth(today())), to: toInputDate(today()) }) },
];

/** Menutup panel saat klik di luar atau tekan Esc. */
function useTutupOtomatis(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return ref;
}

/**
 * 1.4 — preset cepat + rentang bebas + ekspor. Rentang yang dipilih di sini
 * berlaku untuk seluruh halaman, jadi state-nya dipegang App.
 */
export function RangeControls({
  presetId,
  range,
  busy,
  onPreset,
  onRange,
  onRefresh,
  onExport,
}: {
  presetId: string | null;
  range: Range;
  busy: boolean;
  onPreset: (p: Preset) => void;
  onRange: (r: Range) => void;
  onRefresh: () => void;
  onExport: (dataset: 'daily' | 'transactions') => void;
}) {
  const [buka, setBuka] = useState<'tanggal' | 'ekspor' | null>(null);
  const ref = useTutupOtomatis(() => setBuka(null));

  const label =
    range.from && range.to ? `${formatDate(range.from)} – ${formatDate(range.to)}` : 'Pilih rentang';

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-2">
      <div className="seg">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPreset(p)}
            aria-pressed={presetId === p.id}
            className={cn('seg-item', presetId === p.id && 'seg-item-on')}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Button size="sm" onClick={() => setBuka((v) => (v === 'tanggal' ? null : 'tanggal'))}>
          <Calendar size={15} /> <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">Rentang</span>
        </Button>
        {buka === 'tanggal' && (
          <div className="absolute right-0 z-20 mt-1.5 w-[272px] rounded-xl border border-border bg-popover p-3.5 shadow-lg">
            <label className="block">
              <span className="label">Dari</span>
              <input
                type="date"
                value={range.from ?? ''}
                max={range.to}
                onChange={(e) => onRange({ ...range, from: e.target.value })}
                className="isian"
              />
            </label>
            <label className="mt-3 block">
              <span className="label">Sampai</span>
              <input
                type="date"
                value={range.to ?? ''}
                min={range.from}
                onChange={(e) => onRange({ ...range, to: e.target.value })}
                className="isian"
              />
            </label>
            <Button variant="primary" className="mt-4 w-full" onClick={() => setBuka(null)}>
              Terapkan
            </Button>
          </div>
        )}
      </div>

      <div className="relative">
        <Button size="sm" onClick={() => setBuka((v) => (v === 'ekspor' ? null : 'ekspor'))}>
          <Download size={15} /> Ekspor
        </Button>
        {buka === 'ekspor' && (
          <div className="absolute right-0 z-20 mt-1.5 w-[220px] rounded-xl border border-border bg-popover p-1 shadow-lg">
            {(
              [
                { id: 'daily', label: 'Rekap harian (CSV)' },
                { id: 'transactions', label: 'Daftar transaksi (CSV)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setBuka(null);
                  onExport(opt.id);
                }}
                className="block w-full rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-muted"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Button variant="primary" size="sm" onClick={onRefresh} disabled={busy}>
        <RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> Segarkan
      </Button>
    </div>
  );
}
```


### `src/components/AttentionChips.tsx`

```tsx
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, HardDrive, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Health } from '@/lib/types';
import { cn } from '@/lib/cn';

type Tone = 'warning' | 'destructive';

interface Chip {
  key: string;
  tone: Tone;
  icon: LucideIcon;
  label: string;
  to: string;
}

/** Tint 10% + border 25% + teks shade 700 — sama seperti Badge, ukuran tombol. */
const TONE: Record<Tone, string> = {
  warning: 'bg-warning/10 border-warning/25 text-warning-text hover:bg-warning/[0.15]',
  destructive:
    'bg-destructive/10 border-destructive/25 text-destructive-text hover:bg-destructive/[0.15]',
};

/**
 * Hal yang perlu ditindaklanjuti, diangkat ke paling atas halaman.
 * Sebelumnya semua ini hanya ada di seksi Status Data paling bawah — tempat
 * yang justru paling jarang dilihat. Kalau tidak ada masalah, baris ini hilang
 * sama sekali: ruang kosong lebih baik daripada chip hijau "semua aman".
 */
export function buildChips(health: Health | null): Chip[] {
  if (!health) return [];
  const chips: Chip[] = [];

  const basi = health.stores.filter((s) => s.stale || s.neverSynced);
  if (basi.length === 1) {
    const s = basi[0];
    chips.push({
      key: 'sync',
      tone: 'warning',
      icon: TriangleAlert,
      label: s.neverSynced ? `${s.name} belum pernah sinkron` : `${s.name} belum sinkron`,
      to: '/status',
    });
  } else if (basi.length > 1) {
    chips.push({
      key: 'sync',
      tone: 'warning',
      icon: TriangleAlert,
      label: `${basi.length} toko belum sinkron`,
      to: '/status',
    });
  }

  const pct = health.storage.usedPercent;
  if (pct >= 80) {
    chips.push({
      key: 'storage',
      tone: pct >= 90 ? 'destructive' : 'warning',
      icon: HardDrive,
      label: `Penyimpanan ${Math.round(pct)}% penuh`,
      to: '/pengaturan',
    });
  }

  const sisa = health.plan.daysLeft;
  if (sisa !== null && sisa <= 30) {
    chips.push({
      key: 'plan',
      tone: sisa <= 7 ? 'destructive' : 'warning',
      icon: Clock,
      label: sisa < 0 ? 'Langganan sudah berakhir' : `Langganan sisa ${sisa} hari`,
      to: '/pengaturan',
    });
  }

  return chips;
}

export function AttentionChips({ health }: { health: Health | null }) {
  const chips = buildChips(health);
  if (chips.length === 0) return null;

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {chips.map((c) => (
        <Link
          key={c.key}
          to={c.to}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors',
            TONE[c.tone],
          )}
        >
          <c.icon size={14} className="flex-none" />
          {c.label}
          <ChevronRight size={14} className="opacity-60" />
        </Link>
      ))}
    </div>
  );
}
```


### `src/components/TrendChart.tsx`

```tsx
import { useMemo, useState } from 'react';
import type { Trend, TrendPoint } from '@/lib/types';
import { formatMonthLabel, formatNumber, formatRp, formatRpShort } from '@/lib/format';
import { Card, Skeleton } from './Common';
import { cn } from '@/lib/cn';

type Metric = 'revenue' | 'netProfit' | 'transactions';

const METRICS: { id: Metric; label: string }[] = [
  { id: 'revenue', label: 'Omzet' },
  { id: 'netProfit', label: 'Laba' },
  { id: 'transactions', label: 'Transaksi' },
];

const W = 1000;
const H = 240;
const PAD_X = 40;
const TOP = 20;
const BOTTOM = 205;

/**
 * 1.3 — tren jangka panjang dengan pembanding periode yang sama tahun lalu.
 * Inilah bagian yang secara teknis tidak bisa disediakan aplikasi kasir lokal:
 * IndexedDB di HP tidak menyimpan riwayat sepanjang ini dan hilang saat ganti HP.
 *
 * Warna garis diambil dari token lewat kelas Tailwind (`stroke-chart-1`), bukan
 * atribut `stroke="#..."`, supaya grafiknya ikut berubah di mode gelap.
 */
export function TrendSection({ data, loading }: { data: Trend | null; loading: boolean }) {
  const [metric, setMetric] = useState<Metric>('revenue');
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (!data?.months.length) return null;
    const values = [...data.months, ...data.previousYear].map((p) => p[metric]);
    const max = Math.max(...values, 1);
    const step = data.months.length > 1 ? (W - PAD_X * 2) / (data.months.length - 1) : 0;
    const y = (v: number) => BOTTOM - (v / max) * (BOTTOM - TOP);
    const pts = (arr: TrendPoint[]) => arr.map((p, i) => `${PAD_X + i * step},${y(p[metric])}`);
    return { step, max, current: pts(data.months), previous: pts(data.previousYear) };
  }, [data, metric]);

  if (loading || !data) return <Skeleton className="h-[320px]" />;
  if (!geom || !data.months.length) return null;

  const fmt = (v: number) => (metric === 'transactions' ? formatNumber(v) : formatRpShort(v));
  const fmtFull = (v: number) => (metric === 'transactions' ? formatNumber(v) : formatRp(v));

  const last = data.months[data.months.length - 1];
  const lastPrev = data.previousYear[data.previousYear.length - 1];
  const yoy =
    lastPrev && lastPrev[metric]
      ? ((last[metric] - lastPrev[metric]) / Math.abs(lastPrev[metric])) * 100
      : null;

  const point = hover !== null ? data.months[hover] : null;
  const prevPoint = hover !== null ? data.previousYear[hover] : null;

  return (
    <Card className="p-4">
      <div className="mb-4 flex justify-end">
        <div className="seg">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              aria-pressed={metric === m.id}
              className={cn('seg-item', metric === m.id && 'seg-item-on')}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          className="w-full"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Grafik tren bulanan dibanding tahun lalu"
          onMouseLeave={() => setHover(null)}
        >
          <g className="stroke-border" strokeWidth={1}>
            {[TOP, 70, 120, 170, BOTTOM].map((y) => (
              <line key={y} x1={0} y1={y} x2={W} y2={y} strokeDasharray="2 4" />
            ))}
          </g>

          <polyline
            className="fill-none stroke-chart-4"
            strokeWidth={2}
            strokeDasharray="5 5"
            points={geom.previous.join(' ')}
          />
          <polygon
            className="fill-chart-1/[0.08]"
            points={`${geom.current.join(' ')} ${W - PAD_X},${BOTTOM} ${PAD_X},${BOTTOM}`}
          />
          <polyline
            className="fill-none stroke-chart-1"
            strokeWidth={2.5}
            strokeLinejoin="round"
            points={geom.current.join(' ')}
          />

          {data.months.map((p, i) => {
            const [x, y] = geom.current[i].split(',').map(Number);
            return (
              <g key={p.month}>
                <circle
                  cx={x}
                  cy={y}
                  r={hover === i ? 5 : 0}
                  className="fill-chart-1 stroke-card"
                  strokeWidth={2.5}
                />
                <rect
                  x={x - geom.step / 2}
                  y={0}
                  width={Math.max(geom.step, 10)}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
                <text
                  x={x}
                  y={228}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-muted-foreground"
                >
                  {formatMonthLabel(p.month)}
                </text>
              </g>
            );
          })}
        </svg>

        {point && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
            <div className="font-medium">{formatMonthLabel(point.month)}</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums">{fmtFull(point[metric])}</div>
            {prevPoint && (
              <div className="mt-0.5 tabular-nums text-muted-foreground">
                tahun lalu: {fmt(prevPoint[metric])}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>
          <i className="mr-1.5 inline-block h-[9px] w-[9px] rounded-xs bg-chart-1 align-middle" />
          {data.months.length} bulan terakhir
        </span>
        <span>
          <i className="mr-1.5 inline-block h-[9px] w-[9px] rounded-xs bg-chart-4 align-middle" />
          periode sama tahun lalu
        </span>
        <span className="ml-auto font-medium text-foreground tabular-nums">
          {formatMonthLabel(last.month)} berjalan: {fmt(last[metric])}
          {yoy !== null && ` · ${yoy >= 0 ? '+' : ''}${yoy.toFixed(0)}% YoY`}
        </span>
      </div>
    </Card>
  );
}
```


### `src/components/ProfitHero.tsx`

```tsx
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { Metrics, Delta } from '@/lib/types';
import { formatPercent, formatRp, formatRpShort } from '@/lib/format';
import { Badge, Card, Skeleton } from './Common';

function DeltaLaba({ value }: { value: number | null }) {
  if (value === null) return <Badge pill>—</Badge>;
  const naik = value >= 0;
  const Icon = naik ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge variant={naik ? 'success' : 'destructive'} pill className="tabular-nums">
      <Icon size={13} />
      {formatPercent(Math.abs(value))}
    </Badge>
  );
}

/**
 * Batang komposisi omzet: modal (HPP) + biaya operasional + laba bersih.
 *
 * `expenses` dan `grossProfit` sudah dikirim API sejak awal tapi tidak pernah
 * ditampilkan di level total — pemilik toko hanya melihat omzet dan laba, tanpa
 * tahu ke mana perginya selisihnya. Persentase dihitung terhadap jumlah ketiga
 * bagian, bukan terhadap `revenue`, supaya batangnya selalu penuh walau angka
 * dari server tidak persis berjumlah sama (diskon, pembulatan).
 */
function Komposisi({ m }: { m: Metrics }) {
  const modal = Math.max(0, m.revenue - m.grossProfit);
  const biaya = Math.max(0, m.expenses);
  const laba = Math.max(0, m.netProfit);
  const total = modal + biaya + laba;

  // Rugi, atau belum ada omzet sama sekali: batang bertumpuk jadi menyesatkan.
  if (total <= 0 || m.netProfit < 0) {
    return (
      <div className="rounded-xl bg-muted px-4 py-3.5 text-[13px] text-muted-foreground">
        {m.netProfit < 0 ? (
          <>
            Periode ini{' '}
            <span className="font-medium text-destructive-text">
              rugi {formatRp(Math.abs(m.netProfit))}
            </span>{' '}
            — biaya {formatRp(m.expenses)} melebihi laba kotor {formatRp(m.grossProfit)}.
          </>
        ) : (
          'Belum ada omzet pada periode ini.'
        )}
      </div>
    );
  }

  const bagian = [
    { key: 'modal', label: 'Modal (HPP)', nilai: modal, isi: 'bg-primary/25 text-primary', titik: 'bg-primary/25' },
    { key: 'biaya', label: 'Biaya operasional', nilai: biaya, isi: 'bg-warning text-warning-foreground', titik: 'bg-warning' },
    { key: 'laba', label: 'Laba bersih', nilai: laba, isi: 'bg-success text-success-foreground', titik: 'bg-success' },
  ];

  return (
    <>
      <div className="text-[13px] font-medium text-muted-foreground">
        Ke mana perginya omzet {formatRpShort(m.revenue)}
      </div>
      <div className="mt-2.5 flex h-8 overflow-hidden rounded-lg bg-muted">
        {bagian.map((b) => {
          const pct = (b.nilai / total) * 100;
          return (
            <span
              key={b.key}
              className={`grid place-items-center overflow-hidden whitespace-nowrap text-[11.5px] font-medium ${b.isi}`}
              style={{ width: `${pct}%` }}
              title={`${b.label}: ${formatRp(b.nilai)}`}
            >
              {pct >= 8 ? formatPercent(pct, 0) : ''}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        {bagian.map((b) => (
          <div key={b.key}>
            <span className={`mr-1.5 inline-block h-[9px] w-[9px] rounded-xs align-middle ${b.titik}`} />
            {b.label}
            <span className="ml-1.5 font-medium text-foreground tabular-nums" title={formatRp(b.nilai)}>
              {formatRpShort(b.nilai)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export function ProfitHero({
  current,
  previous,
  delta,
  loading,
  days,
}: {
  current: Metrics | null;
  previous: Metrics | null;
  delta: Delta | null;
  loading: boolean;
  days: number;
}) {
  if (loading || !current || !previous || !delta) {
    return <Skeleton className="h-[180px]" />;
  }

  return (
    <Card className="p-5">
      <div className="grid items-center gap-7 xl:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Laba bersih {days} hari</div>
          <div
            className="my-1.5 text-4xl font-semibold leading-tight tracking-tight tabular-nums"
            title={formatRp(current.netProfit)}
          >
            {formatRpShort(current.netProfit)}
          </div>
          <div className="text-xs text-muted-foreground">margin {formatPercent(current.margin)}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DeltaLaba value={delta.netProfit} />
            <span className="text-xs text-muted-foreground">
              dari {formatRpShort(previous.netProfit)} periode lalu
            </span>
          </div>
        </div>
        <div>
          <Komposisi m={current} />
        </div>
      </div>
    </Card>
  );
}
```


### `src/components/HealthPanel.tsx`

```tsx
import { CheckCircle2, Clock, Database, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Health } from '@/lib/types';
import { formatDate, formatDateTime, formatRelative, formatRp } from '@/lib/format';
import {
  Badge,
  Bar,
  buttonClass,
  Card,
  CardBody,
  CardHead,
  Item,
  ItemContent,
  ItemList,
  ItemMedia,
  Skeleton,
} from './Common';

type Tone = 'success' | 'warning' | 'destructive' | 'muted';

function Baris({
  tone,
  icon,
  title,
  desc,
  aksi,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  desc: string;
  aksi?: ReactNode;
}) {
  return (
    <Item>
      <ItemMedia tone={tone}>{icon}</ItemMedia>
      <ItemContent title={title} desc={desc} />
      {aksi}
    </Item>
  );
}

/**
 * 1.5 — status data & langganan. Panel ini merangkap dua fungsi: menjaga
 * kepercayaan pada angka (segar atau basi) sekaligus jadi kanal pengingat
 * perpanjangan yang tidak terasa seperti iklan.
 */
export function HealthSection({ data, loading }: { data: Health | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-[240px]" />
        <Skeleton className="h-[190px]" />
      </div>
    );
  }

  const stale = data.stores.filter((s) => s.stale);
  const fresh = data.stores.filter((s) => !s.stale);
  const { storage, plan } = data;

  const monthsLeft =
    storage.limitMb > 0 && storage.backupCount > 0 && storage.usedMb > 0
      ? Math.floor(((storage.limitMb - storage.usedMb) / storage.usedMb) * 12)
      : null;

  const langgananMendesak = plan.daysLeft !== null && plan.daysLeft <= 30;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
      <ItemList>
        {stale.map((s) => (
          <Baris
            key={s.id}
            tone="warning"
            icon={<TriangleAlert size={18} strokeWidth={1.75} />}
            title={
              s.neverSynced
                ? `${s.name} belum pernah sinkron`
                : `${s.name} belum sinkron ${formatRelative(s.lastSyncedAt).replace('yang lalu', '')}`
            }
            desc={
              s.lastSyncedAt
                ? `Terakhir ${formatDateTime(s.lastSyncedAt)} · buka aplikasi kasir dan pastikan Cloud aktif`
                : 'Aktifkan Cloud di aplikasi kasir toko ini'
            }
            aksi={
              <Badge variant="warning" size="sm">
                Basi
              </Badge>
            }
          />
        ))}

        {fresh.length > 0 && (
          <Baris
            tone="success"
            icon={<CheckCircle2 size={18} strokeWidth={1.75} />}
            title={`${fresh.length} toko tersinkron normal`}
            desc={fresh.map((s) => `${s.name} ${formatRelative(s.lastSyncedAt)}`).join(' · ')}
            aksi={
              <Badge variant="success" size="sm">
                Segar
              </Badge>
            }
          />
        )}

        {storage.latestBackupAt && (
          <Baris
            tone="muted"
            icon={<Database size={18} strokeWidth={1.75} />}
            title={`${storage.backupCount} berkas cadangan tersimpan`}
            desc={`Cadangan terbaru ${formatDateTime(storage.latestBackupAt)}`}
          />
        )}

        {plan.expiresAt && (
          <Baris
            tone={langgananMendesak ? 'destructive' : 'success'}
            icon={<Clock size={18} strokeWidth={1.75} />}
            title={
              plan.daysLeft !== null && plan.daysLeft >= 0
                ? `Langganan berakhir dalam ${plan.daysLeft} hari`
                : 'Langganan sudah berakhir'
            }
            desc={`${plan.name ?? 'Paket'}${plan.price ? ` · ${formatRp(plan.price)}/bln` : ''} · berakhir ${formatDate(plan.expiresAt)}`}
            aksi={
              <a
                href="https://dashboard.kankitu.com/langganan"
                className={buttonClass('primary', 'sm')}
              >
                Perpanjang
              </a>
            }
          />
        )}
      </ItemList>

      <Card>
        <CardHead title="Penyimpanan" />
        <CardBody>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[22px] font-semibold tabular-nums">{storage.usedMb} MB</span>
            <span className="text-xs text-muted-foreground">/ {storage.limitMb} MB</span>
          </div>
          <Bar
            percent={storage.usedPercent}
            tone={storage.usedPercent > 85 ? 'destructive' : 'primary'}
            className="my-3 h-2"
          />
          <div className="text-xs tabular-nums text-muted-foreground">
            {storage.usedPercent.toFixed(0)}% terpakai · {storage.backupCount} berkas cadangan
          </div>
          {monthsLeft !== null && (
            <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Pada laju sekarang, kuota cukup untuk sekitar{' '}
              <span className="font-medium text-foreground">{monthsLeft} bulan</span> lagi.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
```


### `src/components/StoreRanking.tsx`

```tsx
import { TriangleAlert } from 'lucide-react';
import type { StoreOverview } from '@/lib/types';
import { formatNumber, formatPercent, formatRelative, formatRp, formatRpShort } from '@/lib/format';
import { Avatar, Bar, DeltaBadge, Skeleton } from './Common';
import { initials } from './Sidebar';
import { cn } from '@/lib/cn';

/**
 * Peringkat toko — pengganti grid kartu "Per toko" yang lama.
 *
 * Kartu lama menampilkan angka *hari ini* sementara KPI di atasnya memakai
 * rentang terpilih; dua kerangka waktu dalam satu layar. Di sini semuanya
 * memakai rentang yang sama, jadi kontribusi antar cabang benar-benar bisa
 * dijumlahkan dan dibandingkan.
 */
export function StoreRanking({
  stores,
  totalRevenue,
  loading,
}: {
  stores: StoreOverview[];
  totalRevenue: number;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-[280px]" />;

  const urut = [...stores].sort((a, b) => b.current.revenue - a.current.revenue);

  return (
    <div className="overflow-x-auto">
      <table className="tabel min-w-[820px]">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Toko</th>
            <th className="w-[200px]">Kontribusi omzet</th>
            <th className="text-right">Omzet</th>
            <th className="text-right">Laba bersih</th>
            <th className="text-right">vs periode lalu</th>
          </tr>
        </thead>
        <tbody>
          {urut.map((s, i) => {
            const kontribusi = totalRevenue > 0 ? (s.current.revenue / totalRevenue) * 100 : 0;
            return (
              <tr key={s.id}>
                <td>
                  <span
                    className={cn(
                      'grid h-[22px] w-[22px] place-items-center rounded-md text-xs font-medium',
                      i === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {i + 1}
                  </span>
                </td>

                <td>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {s.logoUrl ? (
                      <img
                        src={s.logoUrl}
                        alt=""
                        className="h-8 w-8 flex-none rounded-lg object-cover"
                      />
                    ) : (
                      <Avatar square tone={s.stale ? 'warning' : i === 0 ? 'primary' : 'muted'}>
                        {initials(s.name)}
                      </Avatar>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span
                        className={cn(
                          'mt-0.5 flex items-center gap-1.5 text-xs',
                          s.stale ? 'text-warning-text' : 'text-success-text',
                        )}
                      >
                        {s.stale ? (
                          <TriangleAlert size={12} className="flex-none" />
                        ) : (
                          <i className="h-1.5 w-1.5 flex-none rounded-full bg-success" />
                        )}
                        <span className="truncate">
                          {s.lastSyncedAt
                            ? `Tersinkron ${formatRelative(s.lastSyncedAt)}`
                            : 'Belum pernah sinkron'}
                        </span>
                      </span>
                    </span>
                  </div>
                </td>

                <td>
                  <div className="flex items-center gap-2.5">
                    <Bar
                      percent={kontribusi}
                      tone={s.stale ? 'faded' : 'primary'}
                      className="min-w-[40px] flex-1"
                    />
                    <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                      {formatPercent(kontribusi, 0)}
                    </span>
                  </div>
                </td>

                <td className="text-right">
                  <div className="font-medium tabular-nums" title={formatRp(s.current.revenue)}>
                    {formatRpShort(s.current.revenue)}
                  </div>
                  <div className="sel-sub tabular-nums">
                    {formatNumber(s.current.transactions)} nota
                  </div>
                </td>

                <td className="text-right">
                  <div className="font-medium tabular-nums" title={formatRp(s.current.netProfit)}>
                    {formatRpShort(s.current.netProfit)}
                  </div>
                  <div className="sel-sub">margin {formatPercent(s.current.margin)}</div>
                </td>

                <td className="text-right">
                  <DeltaBadge value={s.delta.revenue} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```


### `src/components/Comparison.tsx`

```tsx
import { useState } from 'react';
import type { Comparison, CompareRow } from '@/lib/types';
import { formatNumber, formatPercent, formatRp, formatRpShort } from '@/lib/format';
import { Bar, Card, DeltaBadge, Skeleton } from './Common';
import { cn } from '@/lib/cn';

type SortKey = keyof Pick<
  CompareRow,
  'revenue' | 'transactions' | 'avgTicket' | 'netProfit' | 'margin' | 'contribution'
>;

const COLUMNS: { key: SortKey | 'name'; label: string }[] = [
  { key: 'name', label: 'Toko' },
  { key: 'revenue', label: 'Omzet' },
  { key: 'contribution', label: 'Kontribusi' },
  { key: 'transactions', label: 'Transaksi' },
  { key: 'avgTicket', label: 'Rata-rata nota' },
  { key: 'netProfit', label: 'Laba bersih' },
  { key: 'margin', label: 'Margin' },
];

/** 1.2 — perbandingan antar cabang. Kolom bisa diklik untuk mengurutkan. */
export function ComparisonSection({ data, loading }: { data: Comparison | null; loading: boolean }) {
  const [sort, setSort] = useState<SortKey>('revenue');

  if (loading || !data) return <Skeleton className="h-[260px]" />;
  if (!data.rows.length) return null;

  const rows = [...data.rows].sort((a, b) => b[sort] - a[sort]);
  const maxRevenue = Math.max(...rows.map((r) => r.revenue), 1);
  const totals = data.totals.current;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="tabel min-w-[900px]">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => c.key !== 'name' && setSort(c.key as SortKey)}
                  aria-sort={sort === c.key ? 'descending' : undefined}
                  className={cn(
                    c.key !== 'name' && 'cursor-pointer text-right hover:text-foreground',
                    sort === c.key && 'text-foreground',
                  )}
                >
                  {c.label}
                  {sort === c.key && <span aria-hidden="true"> ↓</span>}
                </th>
              ))}
              <th className="text-right">vs periode lalu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="font-medium">
                  <span className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'grid h-[22px] w-[22px] flex-none place-items-center rounded-md text-xs font-medium',
                        i === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                    {r.name}
                  </span>
                </td>
                <Cell title={formatRp(r.revenue)}>{formatRpShort(r.revenue)}</Cell>
                <td className="text-right tabular-nums">
                  <Bar
                    percent={(r.revenue / maxRevenue) * 100}
                    className="mr-2 inline-block w-[46px] align-middle"
                  />
                  {formatPercent(r.contribution)}
                </td>
                <Cell>{formatNumber(r.transactions)}</Cell>
                <Cell title={formatRp(r.avgTicket)}>{formatRpShort(r.avgTicket)}</Cell>
                <Cell title={formatRp(r.netProfit)}>{formatRpShort(r.netProfit)}</Cell>
                <Cell>{formatPercent(r.margin)}</Cell>
                <td className="text-right">
                  <DeltaBadge value={r.deltaRevenue} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <Cell title={formatRp(totals.revenue)}>{formatRpShort(totals.revenue)}</Cell>
              <Cell>100%</Cell>
              <Cell>{formatNumber(totals.transactions)}</Cell>
              <Cell title={formatRp(totals.avgTicket)}>{formatRpShort(totals.avgTicket)}</Cell>
              <Cell title={formatRp(totals.netProfit)}>{formatRpShort(totals.netProfit)}</Cell>
              <Cell>{formatPercent(totals.margin)}</Cell>
              <td className="text-right">
                <DeltaBadge value={data.totals.delta.revenue} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function Cell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <td title={title} className="text-right tabular-nums">
      {children}
    </td>
  );
}
```


### `src/components/ReportHeader.tsx`

```tsx
import { ApiError, downloadExport } from '@/lib/api';
import type { ReportFilter } from '@/hooks/use-report-filter';
import { PageHeader } from './Common';
import { RangeControls } from './RangeControls';

/**
 * Kepala halaman untuk ketiga laporan berkala. Dipakai bersama supaya judul,
 * subjudul, dan kontrol rentang berada di posisi yang sama di setiap halaman.
 * Kelompok halaman (Laporan/Akun) tidak lagi diulang di sini — sudah ada di
 * breadcrumb topbar.
 */
export function ReportHeader({
  title,
  subtitle,
  filter,
  busy,
  onError,
}: {
  title: string;
  subtitle: string;
  filter: ReportFilter;
  busy: boolean;
  onError: (message: string) => void;
}) {
  const onExport = async (dataset: 'daily' | 'transactions') => {
    try {
      await downloadExport(dataset, filter.range);
    } catch (err) {
      // 401 sudah memicu logout — memasang kotak error di sini hanya membuat
      // pesan merah berkelebat sepersekian detik sebelum layar login muncul.
      if (err instanceof ApiError && err.status === 401) return;
      onError(err instanceof Error ? err.message : 'Ekspor gagal');
    }
  };

  return (
    <PageHeader title={title} subtitle={subtitle}>
      <RangeControls
        presetId={filter.presetId}
        range={filter.range}
        busy={busy}
        onPreset={filter.setPreset}
        onRange={filter.setRange}
        onRefresh={filter.refresh}
        onExport={onExport}
      />
    </PageHeader>
  );
}
```

