import { useCallback, useMemo, useState } from 'react';
import type { Range } from '@/lib/api';
import { PRESETS, type Preset } from '@/components/RangeControls';

const DEFAULT_PRESET = PRESETS[2]; // 30 hari

export interface ReportFilter {
  presetId: string | null;
  range: Range;
  /** Dinaikkan tiap "Muat ulang" ditekan; halaman memakainya sebagai pemicu fetch ulang. */
  nonce: number;
  setPreset: (p: Preset) => void;
  setRange: (r: Range) => void;
  refresh: () => void;
}

/**
 * Rentang tanggal dipegang di layout, bukan di masing-masing halaman laporan.
 * Kalau tiap halaman memegang sendiri, pindah dari Ringkasan ke Bandingkan
 * akan mengembalikan rentang ke default — dan itu terasa seperti kehilangan
 * pekerjaan, bukan seperti pindah halaman.
 */
export function useReportFilter(): ReportFilter {
  const [presetId, setPresetId] = useState<string | null>(DEFAULT_PRESET.id);
  const [range, setRangeState] = useState<Range>(() => DEFAULT_PRESET.build());
  const [nonce, setNonce] = useState(0);

  const setPreset = useCallback((p: Preset) => {
    setPresetId(p.id);
    setRangeState(p.build());
  }, []);

  const setRange = useCallback((r: Range) => {
    setPresetId(null);
    setRangeState(r);
  }, []);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return useMemo(
    () => ({ presetId, range, nonce, setPreset, setRange, refresh }),
    [presetId, range, nonce, setPreset, setRange, refresh],
  );
}
