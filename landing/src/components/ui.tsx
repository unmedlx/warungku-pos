import type { ReactNode } from "react";
import { Check } from "lucide-react";

/**
 * Kit komponen bergaya Shark UI untuk landing — padanan ringkas dari
 * `frontend/src/components/jokoui/*` (kasir) dan `Common.tsx` (dashboard/admin).
 * Semua seksi memakai komponen di file ini; jangan menulis ulang gaya
 * tombol/badge/kartu sendiri supaya radius, tinggi, dan tint warnanya satu.
 *
 * Aturan yang dipegang:
 *   radius  tombol 8px (`rounded-lg`), kartu 12px (`rounded-xl`), panel 16px
 *   bobot   600 untuk judul, 500 untuk tombol & label, 400 untuk body
 *   status  fill pekat hanya untuk tombol utama; TEKS memakai `*-text`
 */

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ══════════════════════════ Tombol ══════════════════════════ */

type ButtonVariant = "primary" | "outline" | "wa" | "terang" | "hantu";
type ButtonSize = "default" | "sm" | "xl";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-primary hover:brightness-110",
  outline: "border border-input bg-card shadow-xs hover:bg-muted",
  /** WhatsApp: outline dengan teks hijau — sekunder terhadap CTA utama. */
  wa: "border border-input bg-card text-wa-text shadow-xs hover:bg-wa/10",
  /** Di atas panel gradien gelap. */
  terang: "bg-white text-primary-dark shadow-sm hover:bg-white/90",
  hantu: "border border-white/30 bg-white/10 text-white hover:bg-white/20",
};

const SIZE: Record<ButtonSize, string> = {
  default: "h-10 px-4 text-sm",
  sm: "h-9 px-3 text-sm",
  xl: "h-11 px-5 text-[15px]",
};

/**
 * Hampir semua tombol di landing adalah tautan, jadi elemen dasarnya `<a>`.
 * `href` wajib supaya tidak ada tombol palsu yang tidak menuju ke mana pun.
 */
export function Tombol({
  href,
  variant = "outline",
  size = "default",
  blok,
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Lebar penuh — dipakai di mobile dan di dalam kartu harga. */
  blok?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className">) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent font-medium transition",
        VARIANT[variant],
        SIZE[size],
        blok && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}

/* ══════════════════════════ Badge ══════════════════════════ */

type BadgeVariant = "primary" | "success" | "warning" | "outline" | "terang";

/** Tint 10% + border ~22% + teks shade 700 — pola badge Shark. */
const BADGE: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 border-primary/20 text-primary",
  success: "bg-success/10 border-success/20 text-success-text",
  warning: "bg-warning/10 border-warning/25 text-warning-text",
  outline: "border-border bg-card text-muted-foreground",
  /** Di atas panel gradien gelap. */
  terang: "border-white/25 bg-white/15 text-white",
};

export function Badge({
  variant = "outline",
  size = "default",
  className,
  children,
}: {
  variant?: BadgeVariant;
  size?: "default" | "sm";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border font-medium",
        size === "sm" ? "h-5 px-1.5 text-[11px]" : "h-6 px-2.5 text-xs",
        BADGE[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ══════════════════════════ Kartu ══════════════════════════ */

export function Kartu({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-xs", className)}>
      {children}
    </div>
  );
}

/* ══════════════════════════ Kotak ikon ══════════════════════════ */

export type Tone = "primary" | "success" | "warning" | "info" | "destructive" | "netral";

const TONE: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success-text",
  warning: "bg-warning/10 text-warning-text",
  info: "bg-info/10 text-info-text",
  destructive: "bg-destructive/10 text-destructive-text",
  netral: "bg-muted text-muted-foreground",
};

/** Kotak 40px ber-radius 12 — pengganti "blob" bulat lama. */
export function IkonKotak({
  tone = "primary",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 flex-none place-items-center rounded-xl",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ══════════════════════════ Daftar centang ══════════════════════════ */

/** `terang` untuk daftar di atas panel gradien gelap. */
export function DaftarCek({
  items,
  terang,
}: {
  items: readonly string[];
  terang?: boolean;
}) {
  return (
    <ul className="mt-4 grid list-none gap-2 p-0">
      {items.map((it) => (
        <li
          key={it}
          className={cn(
            "flex gap-2.5 text-sm leading-snug",
            terang ? "text-white/85" : "text-muted-foreground",
          )}
        >
          <Check
            className={cn("mt-0.5 h-4 w-4 flex-none", terang ? "text-white" : "text-primary")}
            strokeWidth={2.5}
          />
          {it}
        </li>
      ))}
    </ul>
  );
}

/* ══════════════════════════ Kepala seksi ══════════════════════════ */

export function JudulSeksi({
  judul,
  ket,
}: {
  judul: string;
  ket?: string;
}) {
  return (
    <div className="mx-auto mb-8 max-w-[620px] text-center desktop:mb-10">
      <h2 className="text-2xl font-semibold tracking-tight desktop:text-[28px]">{judul}</h2>
      {ket && <p className="mt-2.5 text-base text-muted-foreground">{ket}</p>}
    </div>
  );
}
