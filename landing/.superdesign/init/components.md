<!-- Superdesign init — generated for `landing` -->

# Components — `landing`

Kankitu marketing landing page + download page (Vite + React + TS, Tailwind)

Shared UI primitives with FULL source. 6 files.

### `src/components/ui.tsx`

```tsx
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
```


### `src/components/icons.tsx`

```tsx
// Ikon khusus yang tidak ada padanan langsung di lucide-react.
// Ikon WhatsApp mengikuti bentuk asli mockup.

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.5-1.2-2.9s.7-2 .9-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.1.3.7 1.2 1.5 1.9 1 .9 1.8 1.1 2.1 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l2 1c.2.1.4.2.4.3.1.2.1.6-.1 1.2z" />
    </svg>
  );
}

// Ikon sinyal bar (status bar HP) — 4 batang menaik
export function SignalBarsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2 17h3v4H2zM7 13h3v8H7zM12 9h3v12h-3z" />
      <path d="M17 4h3v17h-3z" opacity=".3" />
    </svg>
  );
}

// Ikon wifi-putus (sinyal hilang) — wifi + garis serong
export function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

// Ikon baterai (status bar HP)
export function BatteryIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="7" width="18" height="10" rx="3" />
      <rect x="4" y="9" width="12" height="6" rx="1.6" fill="currentColor" />
      <path d="M22 11v2" />
    </svg>
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


### `src/components/PhoneMockup.tsx`

```tsx
import { Clock, LayoutGrid, Package, Receipt, Search } from "lucide-react";

/**
 * Layar kasir di dalam bingkai HP untuk hero.
 *
 * Sebelumnya isinya layar beranda bergaya dashboard (kartu angka + grafik
 * kapsul). Sekarang yang ditampilkan layar kasir — pekerjaan yang benar-benar
 * dilakukan pengunjung setiap hari — dan digambar dengan komponen yang sama
 * seperti aplikasi aslinya: kartu produk bergaris, bar keranjang mengambang,
 * bottom nav. Jadi apa yang dilihat di landing sama dengan yang didapat.
 */

const produk = [
  { emoji: "🍚", nama: "Beras 5 kg", harga: "Rp 68.000", stok: "Stok 12" },
  { emoji: "🍜", nama: "Mie instan", harga: "Rp 3.500", stok: "Stok 48" },
  { emoji: "🥚", nama: "Telur 1 kg", harga: "Rp 28.000", stok: "Stok 9" },
  { emoji: "🧴", nama: "Minyak 1 L", harga: "Rp 17.500", stok: "Stok 20" },
];

const kategori = ["Semua", "Sembako", "Minuman", "Rokok", "Rumah"];

const nav = [
  { icon: LayoutGrid, label: "Kasir", aktif: true },
  { icon: Clock, label: "Riwayat" },
  { icon: Package, label: "Barang" },
  { icon: Receipt, label: "Laporan" },
];

export default function PhoneMockup() {
  return (
    <div
      aria-hidden="true"
      className="w-[264px] shrink-0 overflow-hidden rounded-[36px] border-8 border-foreground bg-foreground shadow-hp desktop:w-[300px]"
    >
      <div className="flex h-[500px] flex-col bg-background text-xs desktop:h-[560px]">
        {/* kepala toko */}
        <div className="flex items-center justify-between border-b border-border bg-card px-3.5 pb-2.5 pt-3.5">
          <span className="text-sm font-semibold">Warung Bu Sri</span>
          <span className="inline-flex h-5 items-center rounded-md border border-success/20 bg-success/10 px-1.5 text-[11px] font-medium text-success-text">
            Offline OK
          </span>
        </div>

        {/* cari */}
        <div className="mx-3 mt-2.5 flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-muted-foreground shadow-xs">
          <Search className="h-3.5 w-3.5 flex-none" />
          Cari barang atau scan…
        </div>

        {/* kategori */}
        <div className="flex gap-1.5 overflow-hidden px-3 pt-2.5">
          {kategori.map((k, i) => (
            <span
              key={k}
              className={`flex h-[26px] flex-none items-center rounded-lg px-2.5 text-[11px] font-medium ${
                i === 0
                  ? "border border-primary bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {k}
            </span>
          ))}
        </div>

        {/* grid produk */}
        <div className="grid grid-cols-2 gap-2 px-3 py-2.5">
          {produk.map((p) => (
            <div key={p.nama} className="rounded-xl border border-border bg-card p-2 shadow-xs">
              <div className="mb-1.5 grid h-11 place-items-center rounded-lg bg-muted text-xl">
                {p.emoji}
              </div>
              <div className="truncate text-[11.5px] font-medium">{p.nama}</div>
              <div className="text-xs font-semibold tabular-nums">{p.harga}</div>
              <div className="text-[10.5px] text-muted-foreground">{p.stok}</div>
            </div>
          ))}
        </div>

        {/* keranjang mengambang */}
        <div className="mx-2.5 mb-2.5 mt-auto flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 pl-3 shadow-lg">
          <span className="flex-1">
            <small className="block text-[10.5px] text-muted-foreground">4 barang</small>
            <b className="text-[13px] font-semibold tabular-nums">Rp 78.500</b>
          </span>
          <span className="flex h-[34px] items-center rounded-lg bg-primary px-3.5 text-[12.5px] font-medium text-primary-foreground">
            Bayar
          </span>
        </div>

        {/* bottom nav */}
        <div className="flex justify-around border-t border-border bg-card px-1.5 py-2 text-[10px] text-muted-foreground">
          {nav.map(({ icon: Icon, label, aktif }) => (
            <span
              key={label}
              className={`flex flex-col items-center gap-0.5 ${aktif ? "font-medium text-primary" : ""}`}
            >
              <Icon className="h-[15px] w-[15px]" strokeWidth={1.9} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```


### `src/components/MiniLayar.tsx`

```tsx
import type { ReactNode } from "react";

/**
 * Layar contoh kecil di dalam kartu langkah. Digambar dengan bahasa yang sama
 * seperti aplikasi: kartu bergaris radius 12, kepala berlatar abu, baris
 * berpembatas. Kepala layar memakai huruf biasa — bukan uppercase-tracking
 * seperti versi sebelumnya, yang tidak ada di Shark.
 */

export function LayarKecil({
  tulisan,
  children,
}: {
  tulisan: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card text-[12.5px] shadow-xs">
      <div className="border-b border-border bg-background px-3 py-2 text-[11px] font-medium text-muted-foreground">
        {tulisan}
      </div>
      {children}
    </div>
  );
}

export function KeranjangBaris({
  emoji,
  nama,
  sub,
  nilai,
}: {
  emoji?: string;
  nama: string;
  sub?: string;
  nilai: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-b-0">
      <span className="min-w-0">
        {emoji && (
          <span className="mr-1.5" aria-hidden="true">
            {emoji}
          </span>
        )}
        {nama}
        {sub && <small className="block text-[11px] text-muted-foreground">{sub}</small>}
      </span>
      <span className="whitespace-nowrap tabular-nums">{nilai}</span>
    </div>
  );
}

/** Baris penutup: berlatar abu dan tebal, hijau kalau angkanya untung. */
export function KeranjangTotal({
  nama,
  nilai,
  hijau,
}: {
  nama: string;
  nilai: string;
  hijau?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 bg-background px-3 py-2 font-semibold ${
        hijau ? "text-success-text" : ""
      }`}
    >
      <span>{nama}</span>
      <span className="whitespace-nowrap tabular-nums">{nilai}</span>
    </div>
  );
}

/** Struk teks monospace untuk langkah ketiga. */
export function Struk() {
  return (
    <div className="px-3 py-2.5 font-mono text-[11px] leading-[1.8] text-muted-foreground">
      <div className="text-center font-semibold text-foreground">WARUNG BU SRI</div>
      <div className="text-center">13 Agt 2026 · 19:24</div>
      <div className="my-1.5 border-t border-dashed border-border" />
      <div className="flex justify-between">
        <span>Beras 5kg ×1</span>
        <span>68.000</span>
      </div>
      <div className="flex justify-between">
        <span>Mie instan ×3</span>
        <span>10.500</span>
      </div>
      <div className="my-1.5 border-t border-dashed border-border" />
      <div className="flex justify-between font-semibold text-foreground">
        <span>TOTAL</span>
        <span>78.500</span>
      </div>
    </div>
  );
}
```


### `src/components/Strip.tsx`

```tsx
import { Banknote, MonitorSmartphone, UserRound, WifiOff } from "lucide-react";
import { IkonKotak } from "./ui";

const items = [
  { icon: Banknote, title: "Rp 0 selamanya", desc: "Bukan masa coba 14 hari" },
  { icon: WifiOff, title: "Sinyal hilang, tetap jalan", desc: "Kasir nggak ikut mati" },
  { icon: UserRound, title: "Nggak perlu daftar akun", desc: "Akun Google cuma buat cloud & AI" },
  // "HP lama pun kuat" pindah ke FAQ ("HP saya jadul, kuat nggak?") supaya slot
  // ini bisa dipakai menyebut installer Windows, yang tadinya tidak muncul
  // sama sekali di paruh atas halaman.
  { icon: MonitorSmartphone, title: "Android & Windows", desc: "Atau langsung dari browser" },
];

/** Empat janji utama, dipasang tepat di bawah hero sebelum orang menggulir jauh. */
export default function Strip() {
  return (
    <section className="seksi-alt py-7 desktop:py-9">
      <div className="bungkus grid grid-cols-1 gap-5 desktop:grid-cols-4 desktop:gap-6">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3">
            <IkonKotak>
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </IkonKotak>
            <span>
              <b className="block text-sm font-semibold">{title}</b>
              <span className="text-[13px] text-muted-foreground">{desc}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

