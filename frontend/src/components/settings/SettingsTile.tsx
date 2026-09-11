import { Lock, type IconComponent } from '@/components/icons';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle, type ItemTone } from '@/components/jokoui/item';
import { Badge } from '@/components/jokoui/badge';
import { Link } from 'react-router-dom';

/**
 * Nada warna kartu kategori. Sengaja dipetakan ke token semantik (bukan hex)
 * supaya ikut mode gelap dan tema aksen yang dipilih pengguna.
 */
export type SettingsTone = 'blue' | 'purple' | 'green' | 'amber' | 'red' | 'gray';

export const TONE_CLASS: Record<SettingsTone, string> = {
  blue: 'bg-primary/10 text-primary',
  purple: 'bg-info/10 text-info-text',
  green: 'bg-success/10 text-success-text',
  amber: 'bg-warning/10 text-warning-text',
  red: 'bg-destructive/10 text-destructive-text',
  gray: 'bg-muted text-muted-foreground',
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
  description: string;
  /** Titik merah kecil: ada sesuatu di dalam kategori ini yang perlu perhatian. */
  attention?: boolean;
  /** Terkunci = tetap terlihat tapi diredupkan, agar karyawan tahu fitur itu ada. */
  locked?: boolean;
  lockedHint?: string;
}

/**
 * Kartu kategori di hub Pengaturan — Item outline horizontal (media + judul +
 * deskripsi), dua kolom. Menggantikan baris list datar supaya kategori
 * dikenali lewat warna & bentuk, bukan dengan membaca ~25 label yang setara.
 */
export function SettingsTile({
  to,
  icon: Icon,
  tone,
  label,
  description,
  attention,
  locked,
  lockedHint,
}: SettingsTileProps) {
  const body = (
    <>
      {attention && !locked && (
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
      )}
      <ItemMedia tone={locked ? 'muted' : TONE_TO_ITEM[tone]}>
        {locked ? <Lock /> : <Icon />}
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="line-clamp-2 whitespace-normal">{label}</ItemTitle>
        <ItemDescription className="line-clamp-2">{locked ? (lockedHint ?? description) : description}</ItemDescription>
      </ItemContent>
    </>
  );

  if (locked) {
    return (
      <Item className="relative opacity-50" aria-disabled="true">
        {body}
      </Item>
    );
  }

  return (
    <Item asChild interactive className="relative">
      <Link to={to}>{body}</Link>
    </Item>
  );
}

interface SettingsTileGridProps {
  children: React.ReactNode;
}

export function SettingsTileGrid({ children }: SettingsTileGridProps) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
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
