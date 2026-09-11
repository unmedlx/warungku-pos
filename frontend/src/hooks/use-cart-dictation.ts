import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '@/lib/db';
import {
  isSpeechRecognitionAvailable,
  requestSpeechPermission,
  startSpeechSession,
  type SpeechErrorCode,
  type SpeechSession,
} from '@/lib/speech-recognition';
import { parseSpokenCart } from '@/lib/spoken-cart';

/**
 * Mikrofon yang menyala selama transaksi kasir.
 *
 * Berbeda dari `useSpeechDictation` yang mengumpulkan ucapan lalu mengirimnya
 * sekali di akhir, hook ini bertindak SAMBIL kasir bicara. Itu menuntut dua
 * hal yang tidak berlaku di sana:
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
 * Yang MEMINTA TINDAKAN — pilihan saat ambigu — harus menunggu kasir, jadi ia
 * bertahan sampai disentuh. Yang cuma MENGABARKAN — barang masuk, stok habis,
 * tidak ketemu — tidak boleh menumpuk: kasir sudah melihat hasilnya di
 * keranjang, dan tumpukan kartu justru mendorong grid produk keluar layar.
 *
 * Karena itu kabar hanya ditampilkan satu pada satu waktu, dan padam sendiri.
 */
const MAX_ACTIONABLE_CHIPS = 2;
const MAX_INFO_CHIPS = 1;

/**
 * Berapa lama chip kabar bertahan sebelum padam sendiri.
 *
 * Cukup lama untuk terbaca dan dibatalkan, cukup singkat supaya tidak menjadi
 * riwayat. Penolakan diberi waktu lebih panjang karena isinya perlu dibaca,
 * bukan sekadar dilirik.
 */
const DISMISS_AFTER: Record<Exclude<CartChipKind, 'unclear'>, number> = {
  added: 4000,
  blocked: 6000,
  notfound: 6000,
};

let chipSeq = 0;
const nextChipId = () => `chip-${(chipSeq += 1)}`;

export function useCartDictation({
  products,
  onAdd,
  onFallbackSearch,
}: UseCartDictationOptions): UseCartDictation {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [denied, setDenied] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<SpeechErrorCode | null>(null);
  const [liveText, setLiveText] = useState('');
  const [chips, setChips] = useState<CartChip[]>([]);

  const sessionRef = useRef<SpeechSession | null>(null);

  // Sesi dibuat sekali lalu hidup sepanjang transaksi, sementara katalog dan
  // penangan keranjang ikut berubah tiap render. Tanpa ref, penangan yang
  // dipegang sesi membeku di nilai saat mikrofon dinyalakan — barang yang baru
  // ditambahkan pemilik toko tidak akan pernah dikenali sampai mik dimatikan.
  const productsRef = useRef(products);
  productsRef.current = products;
  const addRef = useRef(onAdd);
  addRef.current = onAdd;
  const searchRef = useRef(onFallbackSearch);
  searchRef.current = onFallbackSearch;

  useEffect(() => {
    let alive = true;
    void isSpeechRecognitionAvailable().then((ok) => {
      if (!alive) return;
      setAvailable(ok);
      setUnsupported(!ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissChip = useCallback((chipId: string) => {
    const timer = dismissTimers.current.get(chipId);
    if (timer) clearTimeout(timer);
    dismissTimers.current.delete(chipId);
    setChips((prev) => prev.filter((c) => c.id !== chipId));
  }, []);

  const scheduleDismiss = useCallback(
    (chip: CartChip) => {
      if (chip.kind === 'unclear') return;
      const timer = setTimeout(() => dismissChip(chip.id), DISMISS_AFTER[chip.kind]);
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
        let actionable = 0;
        let info = 0;

        for (const c of merged) {
          if (c.kind === 'unclear') {
            if (actionable < MAX_ACTIONABLE_CHIPS) {
              keep.add(c.id);
              actionable += 1;
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

  const stop = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setListening(false);
    setLiveText('');
    setError(null);
    await session?.cancel();
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setStarting(true);
    setDenied(false);
    setError(null);

    const granted = await requestSpeechPermission();
    if (!granted) {
      setStarting(false);
      setDenied(true);
      return;
    }

    const session = await startSpeechSession({
      // Pita menampilkan ucapan yang SEDANG berjalan saja. Teks kumulatif
      // membuat kalimat menumpuk sampai barang yang baru disebut tenggelam.
      onTranscript: () => {},
      onPartial: setLiveText,
      onSegment: consumeSegment,
      // Mesin berhenti total hanya kalau perangkat menyerah; pita padam
      // sendiri supaya kasir tidak mengira HP-nya masih mendengarkan.
      onEnd: () => {
        sessionRef.current = null;
        setListening(false);
        setLiveText('');
      },
      /**
       * Galat apa pun yang sampai ke sini berarti sesi sudah menyerah —
       * pembungkusnya mencoba ulang sendiri selama masih ada harapan. Karena
       * itu pita WAJIB padam, tanpa kecuali.
       *
       * Membiarkannya menyala adalah kegagalan yang paling merugikan di
       * seluruh fitur ini: kasir terus bicara, tidak ada yang masuk, dan tidak
       * ada satu pun tanda di layar yang memberi tahu kenapa.
       */
      onError: (code) => {
        if (code === 'denied') setDenied(true);
        if (code === 'unsupported') setUnsupported(true);
        setError(code);
        sessionRef.current = null;
        setListening(false);
        setLiveText('');
      },
    });

    sessionRef.current = session;
    setStarting(false);
    setListening(true);
  }, [consumeSegment]);

  const toggle = useCallback(() => {
    if (sessionRef.current) void stop();
    else void start();
  }, [start, stop]);

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
          // Sudah bukan pertanyaan lagi, jadi ia ikut aturan kabar: padam sendiri.
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
      void sessionRef.current?.cancel();
    };
  }, []);

  return {
    available,
    listening,
    starting,
    denied,
    unsupported,
    error,
    liveText,
    chips,
    start,
    stop,
    toggle,
    resolveChip,
    dismissChip,
  };
}
