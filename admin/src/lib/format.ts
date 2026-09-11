const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const angka = new Intl.NumberFormat('id-ID');

export const formatRupiah = (v: number) => rupiah.format(v);
export const formatAngka = (v: number) => angka.format(v);

/** Rupiah ringkas untuk kartu KPI: 14.768.000 → "Rp 14,8 jt". */
export function formatRupiahRingkas(v: number) {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return rupiah.format(v);
}

export function formatMb(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} GB`;
  return `${mb.toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
}

export function formatBytes(bytes: number) {
  return formatMb(bytes / (1024 * 1024));
}

export function formatTanggal(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatWaktu(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "12 menit lalu", "3 hari lalu" — dipakai untuk kolom aktivitas terakhir. */
export function formatSejak(iso: string | null) {
  if (!iso) return 'Belum pernah';
  const detik = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return 'Baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86_400) return `${Math.floor(detik / 3600)} jam lalu`;
  const hari = Math.floor(detik / 86_400);
  if (hari < 30) return `${hari} hari lalu`;
  if (hari < 365) return `${Math.floor(hari / 30)} bulan lalu`;
  return `${Math.floor(hari / 365)} tahun lalu`;
}

export function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? '')
    .join('');
}
