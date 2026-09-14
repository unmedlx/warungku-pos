import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isSpeechRecognitionAvailable,
  requestSpeechPermission,
  startSpeechSession,
  type SpeechErrorCode,
  type SpeechSession,
} from '@/lib/speech-recognition';

/**
 * Mikrofon yang bertindak SAMBIL pengguna bicara.
 *
 * Fondasi bersama layar kasir dan pendaftaran produk lewat suara. Keduanya
 * butuh hal yang sama dari mesin pengenalan — izin, status yang tidak mungkin
 * salah dibaca, potongan final, teks berjalan — dan berbeda hanya pada apa
 * yang dilakukan dengan potongan itu. Selama siklus sesinya ditulis dua kali,
 * perbaikan seperti "galat wajib memadamkan pita" hanya sampai ke salah satunya.
 */

export interface UseLiveDictationOptions {
  /** Satu potongan ucapan yang sudah FINAL. */
  onSegment?: (text: string) => void;
  /** Mesin berhenti total; `text` adalah seluruh ucapan sesi itu. */
  onEnd?: (text: string) => void;
}

export interface UseLiveDictation {
  /** null selama kemampuan perangkat masih diperiksa. */
  available: boolean | null;
  listening: boolean;
  starting: boolean;
  /** Permintaan berhenti sudah dikirim, hasil finalnya belum datang. */
  stopping: boolean;
  denied: boolean;
  unsupported: boolean;
  /**
   * Alasan mikrofon berhenti sendiri, kalau memang berhenti.
   *
   * Wajib ada di permukaan. Mikrofon yang padam tanpa keterangan adalah
   * kegagalan terburuk di fitur suara: pengguna terus bicara, tidak ada yang
   * masuk, dan tidak ada satu pun tanda yang menjelaskan kenapa.
   */
  error: SpeechErrorCode | null;
  /** Teks sesi yang sedang berjalan saja, tanpa potongan yang sudah terkunci. */
  liveText: string;
  start: () => Promise<void>;
  /** Berhenti dan tunggu hasil final — `onSegment`/`onEnd` masih akan datang. */
  stop: () => Promise<void>;
  /** Berhenti seketika dan buang apa pun yang belum final. */
  cancel: () => Promise<void>;
  toggle: () => void;
}

/**
 * Sepanjang apa permintaan berhenti ditunggu sebelum dipaksa selesai.
 *
 * Lebih panjang dari tenggat di lapisan pembungkus, supaya jalur yang normal
 * selalu menang: hasil final Android memang datang belakangan, dan memotongnya
 * terlalu cepat membuang kata terakhir yang justru sering berisi harganya.
 */
export const STOP_GUARD_MS = 3500;

export function useLiveDictation({ onSegment, onEnd }: UseLiveDictationOptions = {}): UseLiveDictation {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [denied, setDenied] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<SpeechErrorCode | null>(null);
  const [liveText, setLiveText] = useState('');

  const sessionRef = useRef<SpeechSession | null>(null);
  const guardRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sesi dibuat sekali lalu hidup lama, sementara penangan pemakainya ikut
  // berubah tiap render. Tanpa ref, penangan yang dipegang sesi membeku di
  // nilai saat mikrofon dinyalakan.
  const segmentRef = useRef(onSegment);
  segmentRef.current = onSegment;
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

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

  const clearGuard = useCallback(() => {
    if (guardRef.current) clearTimeout(guardRef.current);
    guardRef.current = null;
  }, []);

  /** Satu-satunya jalan pita padam, apa pun sebabnya. */
  const settle = useCallback(() => {
    clearGuard();
    sessionRef.current = null;
    setListening(false);
    setStarting(false);
    setStopping(false);
    setLiveText('');
  }, [clearGuard]);

  const cancel = useCallback(async () => {
    const session = sessionRef.current;
    settle();
    setError(null);
    await session?.cancel().catch(() => {});
  }, [settle]);

  const stop = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || guardRef.current) return;
    setStopping(true);

    /**
     * Berhenti dijamin dari sisi ini, bukan diminta.
     *
     * `onEnd` bisa saja tidak pernah sampai — plugin yang mati bersama
     * sesinya, WebView yang membuang event. Yang dilihat pengguna kalau itu
     * terjadi adalah tombol stop yang seolah tidak berfungsi.
     */
    guardRef.current = setTimeout(() => {
      const stuck = sessionRef.current;
      settle();
      void stuck?.cancel().catch(() => {});
      endRef.current?.('');
    }, STOP_GUARD_MS);

    await session.stop().catch(() => {
      settle();
      endRef.current?.('');
    });
  }, [settle]);

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

    /**
     * Galat bisa datang SEBELUM `startSpeechSession` selesai — recognizer yang
     * menolak menyala memanggil `onError` di dalam pembangunan sesi. Tanpa
     * penanda ini baris setelah `await` menyalakan kembali pita yang baru saja
     * dipadamkan, padahal tidak ada yang mendengarkan.
     */
    let failedEarly = false;

    const session = await startSpeechSession({
      onTranscript: () => {},
      onPartial: setLiveText,
      onSegment: (text) => segmentRef.current?.(text),
      onEnd: (text) => {
        settle();
        endRef.current?.(text);
      },
      /**
       * Galat apa pun yang sampai ke sini berarti sesi sudah menyerah —
       * pembungkusnya mencoba ulang sendiri selama masih ada harapan. Karena
       * itu pita WAJIB padam, tanpa kecuali.
       */
      onError: (code) => {
        failedEarly = true;
        if (code === 'denied') setDenied(true);
        if (code === 'unsupported') setUnsupported(true);
        setError(code);
        settle();
        endRef.current?.('');
      },
    });

    if (failedEarly) {
      await session.cancel().catch(() => {});
      return;
    }

    sessionRef.current = session;
    setStarting(false);
    setListening(true);
  }, [settle]);

  const toggle = useCallback(() => {
    if (sessionRef.current) void stop();
    else void start();
  }, [start, stop]);

  useEffect(
    () => () => {
      if (guardRef.current) clearTimeout(guardRef.current);
      void sessionRef.current?.cancel();
    },
    [],
  );

  return {
    available,
    listening,
    starting,
    stopping,
    denied,
    unsupported,
    error,
    liveText,
    start,
    stop,
    cancel,
    toggle,
  };
}
