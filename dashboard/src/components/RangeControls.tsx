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
