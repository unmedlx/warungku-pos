import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '@/lib/db';
import type { SpeechErrorCode } from '@/lib/speech-recognition';
import { useLiveDictation } from '@/hooks/use-live-dictation';
import { parseSpokenCart } from '@/lib/spoken-cart';

/**
 * Mikrofon yang menyala selama transaksi kasir.
 *
 * Siklus mikrofonnya dipinjam dari `useLiveDictation`; yang khas kasir ada di
 * sini. Dua aturannya:
 *
 * - hanya potongan FINAL yang boleh menambah barang. Hasil sementara sering
 *   berubah total sedetik kemudian, dan barang yang muncul lalu hilang sendiri
 *   dari keranjang jauh lebih meresahkan daripada barang yang telat muncul;
 * - seluruh pengurai berjalan lokal. Layar kasir wajib hidup tanpa internet,
 *   dan fitur yang mati di jam sibuk tidak akan pernah dipercaya lagi.
 */

export type CartChipKind = 'added' | 'unclear' | 'notfound' | 'blocked';

export interface CartChip {
  id: string;
  kind: CartChipKind;
  /** Potongan ucapan apa adanya, ditampilkan supaya kasir tahu apa yang didengar. */
  heard: string;
  qty: number;
  /** Terisi untuk `added` dan `blocked`. */
  product?: Product;
  /** Terisi untuk `unclear` — tawaran pilihan satu ketukan. */
  candidates?: Product[];
}

export interface UseCartDictationOptions {
  products: Product[];
  /**
   * Masukkan barang ke keranjang. Kembalikan `false` kalau ditolak — stok
   * habis, misalnya — supaya chip-nya berubah jadi penolakan yang terlihat
   * alih-alih hilang diam-diam.
   */
  onAdd: (product: Product, qty: number) => boolean;
  /** Ucapan yang tidak dikenali diserahkan ke kotak pencarian yang sudah ada. */
  onFallbackSearch?: (text: string) => void;
}

export interface UseCartDictation {
  /** null selama kemampuan perangkat masih diperiksa. */
  available: boolean | null;
  listening: boolean;
  starting: boolean;
  denied: boolean;
  unsupported: boolean;
  /**
   * Alasan mikrofon berhenti sendiri, kalau memang berhenti.
   *
   * Wajib ada di permukaan. Mikrofon yang padam tanpa keterangan adalah
   * kegagalan terburuk di fitur ini: kasir terus bicara, tidak ada yang masuk,
   * dan tidak ada satu pun tanda yang menjelaskan kenapa.
   */
  error: SpeechErrorCode | null;
  /** Teks berjalan untuk pita "sedang mendengarkan". */
  liveText: string;
  chips: CartChip[];
  start: () => Promise<void>;
  stop: () => Promise<void>;
  toggle: () => void;
  /** Kasir memilih salah satu kandidat untuk chip yang ambigu. */
  resolveChip: (chipId: string, product: Product) => void;
  dismissChip: (chipId: string) => void;
}

/**
 * Chip dibagi dua watak, dan keduanya diperlakukan berbeda.
 *
 * `added` hanya KABAR: barangnya sudah tampil di halaman Keranjang Suara, jadi
 * chip ini cuma dipakai untuk menyorot baris yang barusan masuk, lalu padam.
 *
 * Sisanya — ambigu, stok habis, tidak ketemu — PERLU DICEK. Ia bertahan sampai
 * disentuh kasir: kalau padam sendiri, ucapan yang gagal masuk hilang tanpa
 * jejak dan kasir mengira keranjangnya sudah lengkap.
 */
const MAX_ISSUE_CHIPS = 5;
const MAX_INFO_CHIPS = 1;

/** Berapa lama sorotan barang yang baru masuk bertahan. */
const HIGHLIGHT_FOR = 2500;

export const needsCheck = (chip: CartChip) => chip.kind !== 'added';

let chipSeq = 0;
const nextChipId = () => `chip-${(chipSeq += 1)}`;

export function useCartDictation({
  products,
  onAdd,
  onFallbackSearch,
}: UseCartDictationOptions): UseCartDictation {
  const [chips, setChips] = useState<CartChip[]>([]);

  // Katalog dan penangan keranjang berubah tiap render, sementara potongan
  // ucapan datang dari sesi yang hidup sepanjang transaksi.
  const productsRef = useRef(products);
  productsRef.current = products;
  const addRef = useRef(onAdd);
  addRef.current = onAdd;
  const searchRef = useRef(onFallbackSearch);
  searchRef.current = onFallbackSearch;

  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissChip = useCallback((chipId: string) => {
    const timer = dismissTimers.current.get(chipId);
    if (timer) clearTimeout(timer);
    dismissTimers.current.delete(chipId);
    setChips((prev) => prev.filter((c) => c.id !== chipId));
  }, []);

  const scheduleDismiss = useCallback(
    (chip: CartChip) => {
      if (needsCheck(chip)) return;
      const timer = setTimeout(() => dismissChip(chip.id), HIGHLIGHT_FOR);
      dismissTimers.current.set(chip.id, timer);
    },
    [dismissChip],
  );

  const pushChips = useCallback(
    (incoming: CartChip[]) => {
      if (incoming.length === 0) return;
      incoming.forEach(scheduleDismiss);

      setChips((prev) => {
        // Terbaru di atas, lalu tiap watak dibatasi sendiri-sendiri supaya
        // satu kabar baru tidak menggusur pertanyaan yang belum dijawab.
        const merged = [...incoming, ...prev];
        const keep = new Set<string>();
        let issues = 0;
        let info = 0;

        for (const c of merged) {
          if (needsCheck(c)) {
            if (issues < MAX_ISSUE_CHIPS) {
              keep.add(c.id);
              issues += 1;
            }
          } else if (info < MAX_INFO_CHIPS) {
            keep.add(c.id);
            info += 1;
          }
        }

        return merged.filter((c) => keep.has(c.id));
      });
    },
    [scheduleDismiss],
  );

  /** Satu potongan ucapan yang sudah final diubah jadi isi keranjang. */
  const consumeSegment = useCallback(
    (text: string) => {
      const { matches, unclear } = parseSpokenCart(text, productsRef.current);
      const produced: CartChip[] = [];

      for (const m of matches) {
        const accepted = addRef.current(m.product, m.qty);
        produced.push({
          id: nextChipId(),
          kind: accepted ? 'added' : 'blocked',
          heard: m.heard,
          qty: m.qty,
          product: m.product,
        });
      }

      for (const u of unclear) {
        if (u.candidates.length > 0) {
          produced.push({
            id: nextChipId(),
            kind: 'unclear',
            heard: u.heard,
            qty: u.qty,
            candidates: u.candidates,
          });
          continue;
        }

        /**
         * Tidak ada kandidat sama sekali. Dua kemungkinan yang harus
         * dibedakan: kasir menyebut barang yang belum terdaftar, atau ia
         * sedang bicara ke pembeli. Yang kedua jauh lebih sering, dan
         * memunculkan chip untuk tiap kalimat basa-basi akan membuat layar
         * penuh sampah. Karena itu hanya ucapan yang cukup panjang untuk
         * terdengar seperti nama barang yang dilaporkan.
         */
        const words = u.heard.split(' ').filter(Boolean);
        if (words.length === 0 || words.length > 5) continue;

        produced.push({ id: nextChipId(), kind: 'notfound', heard: u.heard, qty: u.qty });
        searchRef.current?.(u.heard);
      }

      pushChips(produced);
    },
    [pushChips],
  );

  const live = useLiveDictation({ onSegment: consumeSegment });

  // Di kasir, berhenti berarti berhenti SEKARANG: potongan yang belum final
  // tidak boleh menyusul masuk keranjang setelah kasir mematikan mikrofon.
  const { cancel, start } = live;
  const toggle = useCallback(() => {
    if (live.listening || live.starting) void cancel();
    else void start();
  }, [live.listening, live.starting, cancel, start]);

  const resolveChip = useCallback(
    (chipId: string, product: Product) => {
      setChips((prev) =>
        prev.map((c) => {
          if (c.id !== chipId) return c;
          const accepted = addRef.current(product, c.qty);
          const resolved: CartChip = {
            ...c,
            kind: accepted ? 'added' : 'blocked',
            product,
            candidates: undefined,
          };
          // Kalau berhasil masuk, ia jadi sorotan biasa dan padam sendiri.
          scheduleDismiss(resolved);
          return resolved;
        }),
      );
    },
    [scheduleDismiss],
  );

  useEffect(() => {
    const timers = dismissTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return {
    available: live.available,
    listening: live.listening,
    starting: live.starting,
    denied: live.denied,
    unsupported: live.unsupported,
    error: live.error,
    liveText: live.liveText,
    chips,
    start,
    stop: cancel,
    toggle,
    resolveChip,
    dismissChip,
  };
}
