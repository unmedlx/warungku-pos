import { Lock, type IconComponent } from '@/components/icons';
import { Badge } from '@/components/jokoui/badge';
import { type ItemTone } from '@/components/jokoui/item';
import { type TileTone } from '@/components/jokoui/service-tile';
import { TONE_SURFACE } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

/**
 * Nada warna kategori pengaturan. Namanya dipertahankan karena dipakai di
 * `SETTINGS_CATEGORIES`, tapi nilainya sekarang memetakan ke sistem pengenal
 * enam warna di `lib/tones` — warna yang sama yang dipakai ubin Beranda,
 * pita kategori Kasir, dan thumbnail produk.
 */
export type SettingsTone = 'blue' | 'purple' | 'green' | 'amber' | 'red' | 'gray';

const TONE_NUMBER: Record<SettingsTone, TileTone> = {
  blue: 1,
  green: 2,
  amber: 3,
  red: 4,
  purple: 5,
  gray: 6,
};

/** Kelas tint + tinta untuk sebuah nada — dipakai juga oleh baris "Cepat". */
export const TONE_CLASS: Record<SettingsTone, string> = {
  blue: TONE_SURFACE[1],
  green: TONE_SURFACE[2],
  amber: TONE_SURFACE[3],
  red: TONE_SURFACE[4],
  purple: TONE_SURFACE[5],
  gray: TONE_SURFACE[6],
};

/** Pemetaan nada lama ke `tone` milik `ItemMedia`. */
export const TONE_TO_ITEM: Record<SettingsTone, ItemTone> = {
  blue: 'primary',
  purple: 'info',
  green: 'success',
  amber: 'warning',
  red: 'destructive',
  gray: 'muted',
};

interface SettingsTileProps {
  to: string;
  icon: IconComponent;
  tone: SettingsTone;
  label: string;
  /** Diterima demi kompatibilitas pemanggil; ubin tidak menggambarnya. */
  description?: string;
  /** Titik merah kecil: ada sesuatu di dalam kategori ini yang perlu perhatian. */
  attention?: boolean;
  /** Terkunci = tetap terlihat tapi diredupkan, agar karyawan tahu fitur itu ada. */
  locked?: boolean;
  lockedHint?: string;
}

/**
 * Ubin kategori di hub Pengaturan.
 *
 * Sebelumnya ini kartu horizontal berisi ikon + judul + deskripsi, dua
 * kolom — persis susunan yang membuat setiap halaman pengaturan terlihat
 * sama, dan pada lebar HP ia tidak bekerja: "Karyawan & Akses" patah dua
 * baris, dan setiap deskripsi terpotong di tengah kata ("Jenis usaha,
 * kategori,…"). Deskripsi yang tidak pernah selesai dibaca bukan informasi,
 * ia hanya kebisingan yang menaikkan tinggi kartu.
 *
 * Sekarang bentuknya sama persis dengan ubin menu di Beranda: piktogram
 * tebal di atas label pendek, empat kolom, warna dari sistem pengenal yang
 * sama. Pengaturan adalah layar untuk MEMILIH, jadi ia memakai tata bahasa
 * ubin — satu sistem di seluruh app, bukan dua yang mirip.
 */
export function SettingsTile({
  to,
  icon: Icon,
  tone,
  label,
  attention,
  locked,
  lockedHint,
}: SettingsTileProps) {
  const glyph = (
    <span
      className={cn(
        'relative flex h-12 w-12 items-center justify-center rounded-2xl',
        locked ? 'bg-muted text-muted-foreground' : TONE_SURFACE[TONE_NUMBER[tone]],
      )}
    >
      {locked ? <Lock className="h-5.5 w-5.5" /> : <Icon className="h-5.5 w-5.5" />}
      {attention && !locked && (
        <span
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-destructive"
          aria-hidden="true"
        />
      )}
    </span>
  );

  const caption = (
    <span className="flex min-h-[2.1rem] items-start justify-center text-center text-2xs font-semibold leading-tight tracking-[-0.01em]">{label}</span>
  );

  if (locked) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-2xl px-1 py-3 opacity-50"
        aria-disabled="true"
        title={lockedHint}
      >
        {glyph}
        {caption}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl px-1 py-3',
        'text-foreground no-underline transition-colors active:bg-accent',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'motion-reduce:transition-none',
      )}
    >
      {glyph}
      {caption}
    </Link>
  );
}

interface SettingsTileGridProps {
  children: React.ReactNode;
}

export function SettingsTileGrid({ children }: SettingsTileGridProps) {
  return <div className="grid grid-cols-4 gap-x-1.5 gap-y-2 md:grid-cols-6 lg:grid-cols-8">{children}</div>;
}

interface CountPillProps {
  children: React.ReactNode;
}

/** Nilai/jumlah di ujung kanan baris — dipindai sekilas tanpa membaca deskripsi. */
export function CountPill({ children }: CountPillProps) {
  return (
    <Badge variant="secondary" size="sm" className="tabular-nums">
      {children}
    </Badge>
  );
}
