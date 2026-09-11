import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

const rp = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** Rupiah penuh: Rp 1.234.567 */
export function formatRp(value: number): string {
  return `Rp ${rp.format(Math.round(value))}`;
}

/**
 * Rupiah ringkas untuk KPI: Rp 284,6 jt.
 * Angka penuh tetap ditaruh di `title` supaya bisa dibaca saat hover.
 */
export function formatRpShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  if (abs >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  if (abs >= 100_000) return `Rp ${(value / 1000).toFixed(0)} rb`;
  return formatRp(value);
}

export const formatNumber = (v: number) => rp.format(Math.round(v));

export const formatPercent = (v: number, digits = 1) =>
  `${v.toFixed(digits).replace('.', ',')}%`;

export function formatDelta(v: number | null): string {
  if (v === null) return '—';
  const sign = v > 0 ? '▲' : v < 0 ? '▼' : '';
  return `${sign} ${Math.abs(v).toFixed(1).replace('.', ',')}%`;
}

export const formatDate = (v: string | Date) =>
  format(typeof v === 'string' ? parseISO(v) : v, 'd MMM yyyy', { locale: id });

export const formatDateTime = (v: string | Date) =>
  format(typeof v === 'string' ? parseISO(v) : v, 'd MMM yyyy, HH:mm', { locale: id });

export function formatRelative(v: string | null): string {
  if (!v) return 'belum pernah';
  return formatDistanceToNow(parseISO(v), { locale: id, addSuffix: true });
}

/** `2026-08` → `Agu 26` untuk label sumbu grafik. */
export function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-');
  return format(new Date(Number(y), Number(m) - 1, 1), 'MMM yy', { locale: id });
}

export const toInputDate = (d: Date) => format(d, 'yyyy-MM-dd');
