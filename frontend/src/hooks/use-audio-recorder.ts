import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Perekam suara berbasis `MediaRecorder` bawaan WebView.
 *
 * Sengaja tanpa plugin Capacitor: Android WebView dan Electron sudah
 * menyediakan `MediaRecorder`, dan menambah plugin native berarti satu lagi
 * hal yang bisa gagal saat rilis Play Store demi kemampuan yang sudah ada.
 */

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'denied' | 'unsupported';

export interface Recording {
  blob: Blob;
  mimeType: string;
  durationSec: number;
  /** URL objek untuk diputar ulang di layar tinjauan. Dibebaskan oleh pemanggil. */
  url: string;
}

/**
 * Codec yang tersedia berbeda-beda antar perangkat, dan `MediaRecorder` akan
 * melempar kalau diberi tipe yang tidak didukung. Urutannya dari yang paling
 * hemat: opus jauh lebih kecil pada durasi yang sama, dan ukuran unggahan
 * adalah bagian paling lambat dari fitur ini di jaringan warung.
 */
const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/aac',
  'audio/webm',
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const t of PREFERRED_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  // Sebagian WebView mendukung perekaman tapi menolak semua tipe yang ditanya.
  // Membiarkan browser memilih sendiri lebih baik daripada menyerah.
  return '';
}

export interface UseAudioRecorder {
  state: RecorderState;
  /** Detik berjalan, diperbarui ~10x per detik supaya angkanya terasa hidup. */
  elapsedSec: number;
  /** Level mikrofon 0–1, untuk gelombang suara. */
  level: number;
  /** Riwayat level terakhir, untuk menggambar batang gelombang. */
  levels: number[];
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  reset: () => void;
  recording: Recording | null;
}

export function useAudioRecorder(maxSeconds: number): UseAudioRecorder {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsedSec, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [recording, setRecording] = useState<Recording | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Rekaman yang dibatalkan tetap memicu `onstop`; tanpa penanda ini hasilnya
  // ikut tersimpan dan pemilik toko mendapati rekaman yang dia buang muncul lagi.
  const discardRef = useRef(false);
  const maxRef = useRef(maxSeconds);
  maxRef.current = maxSeconds;

  const teardown = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const cancel = useCallback(() => {
    discardRef.current = true;
    stop();
    setState('idle');
    setElapsed(0);
    setLevels([]);
  }, [stop]);

  const reset = useCallback(() => {
    setRecording((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setElapsed(0);
    setLevels([]);
    setState('idle');
  }, []);

  const start = useCallback(async () => {
    const mimeType = pickMimeType();
    if (mimeType === null || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }

    setState('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      // Android tidak membedakan "baru ditolak" dan "ditolak permanen" lewat
      // error ini. UI menanganinya sebagai satu keadaan dan mengarahkan ke
      // Pengaturan, karena dari sisi pemilik toko jalan keluarnya sama.
      const name = err instanceof DOMException ? err.name : '';
      setState(name === 'NotFoundError' || name === 'NotReadableError' ? 'unsupported' : 'denied');
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    discardRef.current = false;

    let rec: MediaRecorder;
    try {
      rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      teardown();
      setState('unsupported');
      return;
    }
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    rec.onstop = () => {
      const durationSec = (Date.now() - startedAtRef.current) / 1000;
      const type = rec.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      teardown();
      setState('idle');

      if (discardRef.current || blob.size === 0) return;
      setRecording({
        blob,
        mimeType: type,
        // Dibulatkan ke atas: rekaman 0,4 detik yang dikirim sebagai 0 detik
        // ditolak validasi server, dan pesan galatnya tidak akan masuk akal
        // bagi orang yang memang cuma menekan tombolnya sekejap.
        durationSec: Math.max(0.5, Math.round(durationSec * 10) / 10),
        url: URL.createObjectURL(blob),
      });
    };

    // Level mikrofon dibaca terpisah dari perekaman. Tanpa ini layar merekam
    // hanya menampilkan angka yang berjalan, dan pertanyaan pertama pemilik
    // toko — "ini kedengeran nggak?" — tidak terjawab sampai hasilnya keluar.
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
    } catch {
      /* gelombang mati, perekaman jalan terus */
    }

    startedAtRef.current = Date.now();
    rec.start(250);
    setElapsed(0);
    setLevels([]);
    setState('recording');

    const buf = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 0);
    let lastPush = 0;
    const tick = () => {
      const secs = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(secs);

      const analyser = analyserRef.current;
      if (analyser) {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i += 1) {
          peak = Math.max(peak, Math.abs(buf[i] - 128) / 128);
        }
        const v = Math.min(1, peak * 1.8);
        setLevel(v);
        if (Date.now() - lastPush > 90) {
          lastPush = Date.now();
          setLevels((prev) => [...prev.slice(-39), v]);
        }
      }

      if (secs >= maxRef.current) {
        stop();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stop, teardown]);

  return { state, elapsedSec, level, levels, start, stop, cancel, reset, recording };
}
