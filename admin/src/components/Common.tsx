import { useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { inisial } from '@/lib/format';

/**
 * Kit komponen bergaya Shark UI untuk panel admin — kembar dengan
 * `dashboard/src/components/Common.tsx`, ditambah beberapa komponen yang hanya
 * dipakai di sini (Dialog, Pager, IdentitasPengguna, KotakKuota). Semua layar
 * memakai komponen di file ini; jangan menulis ulang gaya kartu/tombol/badge
 * sendiri, supaya radius, tinggi, dan tint warnanya tetap satu.
 *
 * Aturan yang dipegang di sini:
 *   radius  tombol/input 8px (`rounded-lg`), kartu 12px (`rounded-xl`), dialog 16px
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
  description?: string;
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
      {description && (
        <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted-foreground">{description}</p>
      )}
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

/**
 * Inisial orang/toko. Kotak (`rounded-lg`) dipakai untuk baris tabel dan header
 * profil supaya sebaris dengan `ItemMedia`; bulat hanya untuk foto orang di
 * audit log dan footer sidebar.
 */
export function Avatar({
  nama,
  tone = 'primary',
  bulat,
  size = 'default',
  className,
}: {
  nama: string;
  tone?: Tone;
  bulat?: boolean;
  size?: 'default' | 'lg';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'grid flex-none place-items-center font-semibold uppercase',
        size === 'lg' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs',
        bulat ? 'rounded-full' : size === 'lg' ? 'rounded-xl' : 'rounded-lg',
        TONE_MEDIA[tone],
        className,
      )}
      aria-hidden="true"
    >
      {inisial(nama)}
    </span>
  );
}

/**
 * Nama + email dalam satu sel tabel. Dipakai di Pengguna dan Transaksi; kedua
 * kolom itu harus terlihat sama supaya mata tidak perlu menyesuaikan lagi.
 */
export function IdentitasPengguna({
  nama,
  email,
  tone = 'primary',
}: {
  nama: string;
  email: string;
  tone?: Tone;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar nama={nama} tone={tone} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{nama}</div>
        <div className="truncate text-xs text-muted-foreground">{email}</div>
      </div>
    </div>
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

/* ══════════════════════════ Bilah kuota ══════════════════════════ */

/**
 * Pemakaian storage satu pengguna. Ambang warnanya sama dengan yang dipakai
 * backend saat menolak sinkron, jadi baris kuning di panel berarti pengguna
 * memang sudah mendekati batas — bukan sekadar isyarat visual.
 */
export function BilahKuota({ ratio, className }: { ratio: number; className?: string }) {
  const tone = ratio >= 0.97 ? 'destructive' : ratio >= 0.85 ? 'warning' : 'primary';
  return <Bar percent={ratio * 100} tone={tone} className={cn('w-14', className)} />;
}

/** Warna teks yang sepadan dengan `BilahKuota`, untuk angka di sebelahnya. */
export function warnaKuota(ratio: number): string {
  if (ratio >= 0.97) return 'text-destructive-text';
  if (ratio >= 0.85) return 'text-warning-text';
  return '';
}

/* ══════════════════════════ Pager ══════════════════════════ */

export function Pager({
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <span>
        Halaman {page} dari {totalPages} · {totalItems.toLocaleString('id-ID')} baris
      </span>
      <span className="flex gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Sebelumnya
        </Button>
        <Button size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Berikutnya
        </Button>
      </span>
    </div>
  );
}

/* ══════════════════════════ Dialog ══════════════════════════ */

/**
 * Berapa dialog yang sedang terbuka. Kunci gulir latar dipasang oleh yang
 * pertama dan baru dilepas oleh yang terakhir; tanpa hitungan ini, dialog kedua
 * yang menutup akan mengembalikan `overflow` ke nilai "hidden" milik dialog
 * pertama dan halaman terkunci selamanya.
 */
let dialogTerbuka = 0;
let overflowSemula = '';

/**
 * Dialog sederhana tanpa Radix — panel admin hanya punya empat dialog dan
 * semuanya dibuka dari tombol, jadi portal dan focus-trap penuh belum sepadan.
 * Yang tetap dipenuhi: Esc menutup, klik latar menutup, `role="dialog"`, dan
 * fokus pindah ke isi dialog saat dibuka.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
  footer,
  className,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Latar belakang tidak boleh ikut bergulir selagi dialog terbuka.
    if (dialogTerbuka === 0) overflowSemula = document.body.style.overflow;
    dialogTerbuka += 1;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      dialogTerbuka -= 1;
      if (dialogTerbuka === 0) document.body.style.overflow = overflowSemula;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/35 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'w-full max-w-[460px] rounded-2xl border border-border bg-popover p-5 shadow-lg outline-none',
          className,
        )}
      >
        <h3 className="text-base font-semibold">{title}</h3>
        {description && <div className="mt-1 text-[13px] text-muted-foreground">{description}</div>}
        {children}
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════ Kolom form ══════════════════════════ */

/** Label + kontrol + hint. Kontrolnya diserahkan sebagai anak, bukan prop. */
export function Kolom({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/* ══════════════════════════ Kontrol penyaring ══════════════════════════ */

/**
 * Deretan penyaring (Semua / Berbayar / Disuspend …). Bukan `.seg` bergaya pil
 * seperti di dashboard: pilihannya sampai tujuh dan harus bisa membungkus ke
 * baris berikutnya, jadi tiap butir dibuat tombol tersendiri. Yang terpilih
 * memakai warna foreground pekat — kontras tertinggi tanpa menabrak makna
 * warna status di tabel yang sama.
 */
export function FilterGroup<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((f) => {
        const aktif = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={aktif}
            onClick={() => onChange(f.id)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors',
              aktif
                ? 'border-foreground bg-foreground text-background'
                : 'border-input bg-card text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground',
            )}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className="text-[11px] tabular-nums opacity-70">{f.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════ Kotak pencarian ══════════════════════════ */

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'className'>) {
  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="isian pl-8"
        {...props}
      />
    </div>
  );
}
