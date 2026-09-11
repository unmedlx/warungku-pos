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
