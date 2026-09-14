import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveDictation, type UseLiveDictation } from '@/hooks/use-live-dictation';
import { buildDraftRows, type DraftContext, type DraftRow } from '@/lib/product-draft';
import { parseSpokenProducts } from '@/lib/spoken-product';
import type { CatalogHints, SpokenProduct } from '@/lib/vision-api';

/**
 * Pendaftaran produk yang menjadi kartu SAMBIL pemilik toko bicara.
 *
 * Kasir bisa bertindak per potongan karena satu barang keranjang selesai dalam
 * satu tarikan. Produk tidak: nama, modal, harga jual, dan stok disebut dengan
 * jeda di antaranya, dan pengenalan suara memotong di setiap jeda. Karena itu
 * potongan tidak diubah jadi kartu satu per satu. Seluruh ucapan final diurai
 * ulang tiap kali bertambah, dan sebuah produk baru DIKUNCI jadi kartu saat ada
 * bukti bahwa pemilik toko sudah pindah ke produk berikutnya:
 *
 * - pengurai menemukan produk sesudahnya (nama baru, atau kata "terus");
 * - hening cukup lama dan produknya sudah punya harga jual;
 * - mikrofon berhenti.
 *
 * Produk yang belum terkunci ditampilkan sebagai kartu "sedang disebut",
 * termasuk hasil sementara — itulah umpan balik yang dulu baru datang setelah
 * tombol proses ditekan.
 */

/**
 * Hening sepanjang ini mengunci produk yang sudah punya harga jual.
 *
 * Cukup panjang untuk jeda antara "modal" dan "jual", cukup singkat supaya
 * kartu tidak menggantung saat pemilik toko mengambil kardus berikutnya.
 */
export const SILENCE_LOCK_MS = 2500;

export interface UseProductDictationOptions extends DraftContext {
  hints: CatalogHints;
  sourceLabel: string;
}

export interface UseProductDictation
  extends Pick<
    UseLiveDictation,
    'available' | 'listening' | 'starting' | 'stopping' | 'denied' | 'unsupported' | 'error' | 'liveText' | 'start' | 'stop' | 'cancel'
  > {
  /** Kartu yang sudah terkunci. Milik pemilik toko: suntingannya tidak ditimpa. */
  rows: DraftRow[];
  setRows: (rows: DraftRow[]) => void;
  /** Produk yang sedang disebut dan belum terkunci. */
  building: DraftRow[];
  /** Seluruh ucapan final yang terkumpul, untuk dirapikan AI. */
  transcript: string;
  reset: () => void;
}

const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(' ');

export function useProductDictation({
  products,
  categories,
  units,
  hints,
  sourceLabel,
}: UseProductDictationOptions): UseProductDictation {
  const [rows, setRowsState] = useState<DraftRow[]>([]);
  /** Ucapan final; memicu pratinjau kartu yang sedang disebut. */
  const [finalText, setFinalText] = useState('');
  const [locked, setLocked] = useState(0);

  /** Teks dari nyala-nyala mikrofon sebelumnya di dialog yang sama. */
  const baseRef = useRef('');
  const segmentsRef = useRef<string[]>([]);
  const lockedRef = useRef(0);
  const rowsRef = useRef<DraftRow[]>([]);

  const ctxRef = useRef({ products, categories, units, hints, sourceLabel });
  ctxRef.current = { products, categories, units, hints, sourceLabel };

  const setRows = useCallback((next: DraftRow[]) => {
    rowsRef.current = next;
    setRowsState(next);
  }, []);

  /** Kunci kartu diberi nomor urut produk di dalam ucapan, bukan urutan di layar. */
  const toRows = useCallback((spoken: SpokenProduct[], offset: number, prefix: string): DraftRow[] => {
    const c = ctxRef.current;
    return buildDraftRows(
      spoken.map((p) => ({
        name: p.name,
        hpp: p.hpp,
        price: p.price,
        unit: p.unit,
        qty: p.qty,
        categoryHint: p.categoryHint,
        confidence: p.confidence,
        note: p.note,
        sourceLabel: c.sourceLabel,
        alternatives: p.alternatives.map((a) => ({
          field: a.field === 'qty' ? ('stock' as const) : a.field,
          value: a.value,
          label: a.label,
        })),
      })),
      c,
    ).map((r, i) => ({ ...r, key: `${prefix}-${offset + i}` }));
  }, []);

  const currentText = () => join(baseRef.current, ...segmentsRef.current);

  /**
   * Urai ulang ucapan final dan kunci produk yang sudah pasti selesai.
   *
   * `lockAll` mengunci juga produk terakhir — dipakai saat hening atau saat
   * mikrofon berhenti.
   */
  const settle = useCallback(
    (lockAll: boolean) => {
      const text = currentText();
      setFinalText(text);
      const parsed = parseSpokenProducts(text, ctxRef.current.hints).products;
      const upto = lockAll ? parsed.length : parsed.length - 1;

      let next = rowsRef.current;

      /**
       * Kartu yang sudah terkunci tetap boleh DILENGKAPI, tapi tidak diubah.
       *
       * "Gula pasir modal tiga belas ribu jual empat belas ribu" terkunci saat
       * hening, lalu pemilik toko menambahkan "stok dua karung". Kalimat itu
       * masih milik gula — tanpa ini ia hilang tanpa bekas. Yang tidak boleh
       * terjadi adalah angka yang sudah diketik pemilik toko tertimpa, jadi
       * hanya kolom yang masih kosong yang diisi.
       */
      const fresh = toRows(parsed.slice(0, Math.min(lockedRef.current, parsed.length)), 0, 'v');
      next = next.map((row) => {
        const update = fresh.find((f) => f.key === row.key);
        if (!update) return row;
        const patch: Partial<DraftRow> = {};
        for (const field of ['hpp', 'price', 'stock'] as const) {
          if (row[field] === '' && update[field] !== '') patch[field] = update[field];
        }
        return Object.keys(patch).length > 0 ? { ...row, ...patch } : row;
      });

      if (upto > lockedRef.current) {
        next = [...next, ...toRows(parsed.slice(lockedRef.current, upto), lockedRef.current, 'v')];
        lockedRef.current = upto;
        setLocked(upto);
      }

      if (next !== rowsRef.current) setRows(next);
    },
    [setRows, toRows],
  );

  const onSegment = useCallback(
    (text: string) => {
      segmentsRef.current = [...segmentsRef.current, text];
      settle(false);
    },
    [settle],
  );

  const onEnd = useCallback(
    (text: string) => {
      // Teks akhir dari mesin lebih lengkap kalau potongan terakhirnya belum
      // sempat datang sebagai `onSegment`; kalau kosong (galat, penjaga
      // waktu), potongan yang sudah terkumpul yang dipakai.
      const fromSegments = segmentsRef.current.join(' ');
      const session = text.trim().length >= fromSegments.trim().length ? text : fromSegments;
      baseRef.current = join(baseRef.current, session);
      segmentsRef.current = [];
      settle(true);
    },
    [settle],
  );

  const live = useLiveDictation({ onSegment, onEnd });

  // Hening mengunci produk yang sudah lengkap. Diukur dari perubahan terakhir
  // pada teks mana pun, supaya ucapan yang masih berjalan tidak dipotong.
  useEffect(() => {
    if (!live.listening || live.liveText.trim().length > 0) return;
    const timer = setTimeout(() => {
      const parsed = parseSpokenProducts(currentText(), ctxRef.current.hints).products;
      const last = parsed[parsed.length - 1];
      if (parsed.length > lockedRef.current && last?.price != null) settle(true);
    }, SILENCE_LOCK_MS);
    return () => clearTimeout(timer);
  }, [live.listening, live.liveText, finalText, settle]);

  const building = useMemo(() => {
    const text = join(finalText, live.liveText);
    if (text.length === 0) return [];
    const parsed = parseSpokenProducts(text, hints).products;
    return toRows(parsed.slice(locked), locked, 'b');
  }, [finalText, live.liveText, locked, hints, toRows]);

  const reset = useCallback(() => {
    baseRef.current = '';
    segmentsRef.current = [];
    lockedRef.current = 0;
    setLocked(0);
    setFinalText('');
    setRows([]);
  }, [setRows]);

  return {
    available: live.available,
    listening: live.listening,
    starting: live.starting,
    stopping: live.stopping,
    denied: live.denied,
    unsupported: live.unsupported,
    error: live.error,
    liveText: live.liveText,
    start: live.start,
    stop: live.stop,
    cancel: live.cancel,
    rows,
    setRows,
    building,
    transcript: finalText,
    reset,
  };
}
