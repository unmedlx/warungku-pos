import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isSpeechRecognitionAvailable,
  requestSpeechPermission,
  startSpeechSession,
  type SpeechErrorCode,
  type SpeechSession,
} from '@/lib/speech-recognition';

/**
 * Dikte produk memakai pengenalan suara di perangkat.
 *
 * Sengaja dibentuk semirip mungkin dengan `useAudioRecorder`: keduanya adalah
 * dua cara menangkap ucapan yang sama, dan layar yang memakainya seharusnya
 * tidak perlu ditulis dua kali hanya karena mesin di baliknya berbeda.
 *
 * Perbedaan yang tidak bisa disembunyikan cuma satu, tapi penting: di sini
 * hasilnya sudah berupa teks yang bisa dibaca pemilik toko selagi dia bicara.
 * Itu keunggulan nyata jalur ini — salah dengar terlihat saat itu juga, bukan
 * setelah kuota terpakai.
 */

export type DictationState =
  | 'checking'
  | 'idle'
  | 'unsupported'
  | 'denied'
  | 'starting'
  | 'listening'
  | 'done';

export interface UseSpeechDictation {
  state: DictationState;
  /** Detik berjalan sejak mulai mendikte. */
  elapsedSec: number;
  /** Teks berjalan, termasuk hasil sementara sesi yang belum selesai. */
  transcript: string;
  /**
   * Suntingan manual sebelum dikirim.
   *
   * Salah dengar satu kata tidak sepadan dengan mengulang seluruh dikte, dan
   * membetulkannya di sini juga menghemat kuota: perbaikan terjadi sebelum
   * server dipanggil, bukan sesudah.
   */
  setTranscript: (text: string) => void;
  /** null selama masih diperiksa. */
  available: boolean | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

export function useSpeechDictation(maxSeconds: number): UseSpeechDictation {
  const [state, setState] = useState<DictationState>('checking');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [elapsedSec, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');

  const sessionRef = useRef<SpeechSession | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const maxRef = useRef(maxSeconds);
  maxRef.current = maxSeconds;

  // Dibaca oleh pengatur waktu, yang tidak ikut render ulang saat state
  // berubah dan karenanya tidak boleh menutup nilai `state` yang basi.
  const listeningRef = useRef(false);

  useEffect(() => {
    let alive = true;
    void isSpeechRecognitionAvailable().then((ok) => {
      if (!alive) return;
      setAvailable(ok);
      setState(ok ? 'idle' : 'unsupported');
    });
    return () => {
      alive = false;
    };
  }, []);

  const clearTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);

  const finish = useCallback(
    (text: string) => {
      listeningRef.current = false;
      clearTick();
      sessionRef.current = null;
      setTranscript(text);
      // Dikte yang berakhir tanpa satu kata pun tidak dianggap selesai:
      // menampilkan "siap dikirim" untuk teks kosong hanya akan membuat
      // pemilik toko menekan tombol proses lalu ditolak server.
      setState(text.trim().length > 0 ? 'done' : 'idle');
    },
    [clearTick],
  );

  const stop = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    await session.stop();
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setState('starting');
    setTranscript('');
    setElapsed(0);

    const granted = await requestSpeechPermission();
    if (!granted) {
      setState('denied');
      return;
    }

    const handleError = (code: SpeechErrorCode) => {
      listeningRef.current = false;
      clearTick();
      sessionRef.current = null;
      setState(code === 'denied' ? 'denied' : code === 'unsupported' ? 'unsupported' : 'idle');
    };

    const session = await startSpeechSession({
      onTranscript: setTranscript,
      onEnd: finish,
      onError: handleError,
    });

    sessionRef.current = session;
    listeningRef.current = true;
    startedAtRef.current = Date.now();
    setState('listening');

    clearTick();
    tickRef.current = setInterval(() => {
      const secs = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(secs);
      // Batas waktu ditegakkan di sini, bukan di mesin pengenalan: keduanya
      // menyambung sesi sendiri saat ada jeda, jadi tanpa penghenti ini dikte
      // bisa berjalan tanpa ujung.
      if (listeningRef.current && secs >= maxRef.current) void stop();
    }, 200);
  }, [clearTick, finish, stop]);

  const cancel = useCallback(async () => {
    listeningRef.current = false;
    clearTick();
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.cancel();
  }, [clearTick]);

  const reset = useCallback(() => {
    setTranscript('');
    setElapsed(0);
    setState(available === false ? 'unsupported' : 'idle');
  }, [available]);

  useEffect(() => () => void sessionRef.current?.cancel(), []);

  return { state, elapsedSec, transcript, setTranscript, available, start, stop, cancel, reset };
}
