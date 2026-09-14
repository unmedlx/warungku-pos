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
  /**
   * Alasan dikte berhenti sendiri, kalau memang berhenti.
   *
   * Wajib ada di permukaan. `state` memetakan `no-speech`, `network`, dan
   * `unknown` ke `'idle'` yang sama persis dengan layar awal — tanpa kolom ini
   * pemilik toko menekan mik, layar berkedip kembali seperti semula, dan tidak
   * ada satu pun keterangan kenapa. Itu persis yang terbaca sebagai "fiturnya
   * tidak jalan".
   */
  error: SpeechErrorCode | null;
  /**
   * Permintaan berhenti sudah dikirim dan jawabannya belum datang.
   *
   * Dipisahkan dari `state` supaya tombolnya bisa langsung membalas tekanan.
   * Berhenti bukan tindakan seketika — mesin pengenalan masih menyelesaikan
   * hasil finalnya, dan di Android itu bisa satu sampai dua detik. Tanpa
   * keadaan ini tidak ada apa pun yang berubah di layar saat tombol ditekan,
   * dan yang sedang berjalan normal terbaca sebagai tombol yang rusak.
   */
  stopping: boolean;
  /**
   * Mesin pengenalan masih benar-benar mendengarkan.
   *
   * `false` berarti mikrofonnya bisu — bukan ruangannya. Bedanya wajib sampai
   * ke layar: pewaktu yang berjalan di atas teks yang kosong terlihat sama
   * saja untuk keduanya, padahal yang satu cuma perlu ditunggu dan yang lain
   * perlu ditekan ulang.
   */
  alive: boolean;
  /** Detik sejak kata terakhir tertangkap. 0 selama belum ada yang terdengar. */
  silentSec: number;
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

/**
 * Sepanjang apa permintaan berhenti ditunggu sebelum dipaksa selesai.
 *
 * Lebih panjang dari tenggat di lapisan pembungkus, supaya jalur yang normal
 * selalu menang: hasil final Android memang datang belakangan, dan memotongnya
 * terlalu cepat membuang kata terakhir yang justru sering berisi harganya.
 */
const STOP_GUARD_MS = 3500;

/**
 * Berapa lama sunyi sebelum layar mempertanyakan mikrofonnya.
 *
 * Cukup panjang untuk jeda wajar saat pemilik toko mengambil barang
 * berikutnya, cukup singkat untuk tidak membiarkannya bicara satu menit ke
 * mesin yang tidak mendengar.
 */
export const SILENCE_WARN_SEC = 6;

export function useSpeechDictation(maxSeconds: number): UseSpeechDictation {
  const [state, setState] = useState<DictationState>('checking');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [elapsedSec, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<SpeechErrorCode | null>(null);
  const [stopping, setStopping] = useState(false);
  const [alive, setAlive] = useState(true);
  const [silentSec, setSilent] = useState(0);

  const sessionRef = useRef<SpeechSession | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  /** Kapan kata terakhir tertangkap; 0 selama belum ada satu pun. */
  const heardAtRef = useRef(0);
  /** Dibaca penjaga waktu yang berjalan di luar render. */
  const transcriptRef = useRef('');
  /**
   * Teks dari dikte-dikte sebelumnya dalam satu sesi layar yang sama.
   *
   * Ada karena satu dikte sering tidak selesai dalam sekali nyala: mesin
   * pengenalan berhenti sendiri, atau pemilik toko berhenti untuk mengambil
   * kardus berikutnya lalu menekan mikrofon lagi. Tanpa basis ini, tekanan
   * kedua mengosongkan semua yang sudah terkumpul — dan yang dialami pemilik
   * toko adalah setengah daftar produknya hilang tanpa pernah diberi tahu.
   *
   * Hanya "Rekam Ulang" yang boleh membuangnya, karena hanya di situ pemilik
   * toko benar-benar meminta mulai dari nol.
   */
  const baseRef = useRef('');
  const stoppingRef = useRef(false);
  const guardRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const clearGuard = useCallback(() => {
    if (guardRef.current) clearTimeout(guardRef.current);
    guardRef.current = null;
  }, []);

  /** Catat teks di satu tempat supaya penjaga waktu tidak membaca nilai basi. */
  const applyTranscript = useCallback((text: string) => {
    transcriptRef.current = text;
    setTranscript(text);
  }, []);

  /** Sambung hasil sesi berjalan ke teks yang sudah terkumpul sebelumnya. */
  const withBase = useCallback(
    (text: string) => [baseRef.current, text].map((p) => p.trim()).filter(Boolean).join(' '),
    [],
  );

  const finish = useCallback(
    (text: string) => {
      listeningRef.current = false;
      clearTick();
      clearGuard();
      stoppingRef.current = false;
      setStopping(false);
      sessionRef.current = null;
      applyTranscript(text);
      // Dikte yang berakhir tanpa satu kata pun tidak dianggap selesai:
      // menampilkan "siap dikirim" untuk teks kosong hanya akan membuat
      // pemilik toko menekan tombol proses lalu ditolak server.
      setState(text.trim().length > 0 ? 'done' : 'idle');
    },
    [applyTranscript, clearGuard, clearTick],
  );

  const stop = useCallback(async () => {
    const session = sessionRef.current;
    // Tekanan kedua diabaikan, bukan ditumpuk. Dua permintaan berhenti yang
    // berjalan bersamaan membuat mesin dimatikan dua kali dan hasil finalnya
    // ikut terbuang.
    if (!session || stoppingRef.current) return;
    stoppingRef.current = true;
    setStopping(true);

    /**
     * Jaring pengaman terakhir, di lapisan yang paling luar.
     *
     * Lapisan di bawahnya sudah punya tenggatnya sendiri, tapi di sini ada
     * satu hal yang tidak bisa dijamin dari sana: `onEnd` bisa saja tidak
     * pernah sampai — plugin yang mati bersama sesinya, WebView yang membuang
     * event, perangkat yang membekukan mikrofon. Yang dilihat pemilik toko
     * kalau itu terjadi cuma satu, dan itu yang terburuk: pewaktu jalan terus
     * dan tombol stop yang seolah tidak berfungsi.
     *
     * Karena itu berhenti dijamin dari sisi ini, bukan diminta. Teks yang
     * sudah terkumpul tetap dipakai — dikte setengah jadi masih bisa disunting
     * di kotak teks, sedangkan layar yang membeku tidak menyisakan apa pun.
     */
    clearGuard();
    guardRef.current = setTimeout(() => {
      if (!stoppingRef.current) return;
      const stuck = sessionRef.current;
      sessionRef.current = null;
      void stuck?.cancel().catch(() => {});
      finish(transcriptRef.current);
    }, STOP_GUARD_MS);

    await session.stop().catch(() => {
      // Kegagalan menghentikan mesin bukan alasan layar ikut tertahan.
      finish(transcriptRef.current);
    });
  }, [clearGuard, finish]);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setState('starting');
    // Teks yang sudah ada jadi basis, bukan korban. Dikte yang disambung
    // melanjutkan daftarnya alih-alih menimpanya.
    baseRef.current = transcriptRef.current.trim();
    setElapsed(0);
    setError(null);
    setSilent(0);
    setAlive(true);
    stoppingRef.current = false;
    setStopping(false);
    heardAtRef.current = 0;

    const granted = await requestSpeechPermission();
    if (!granted) {
      setError('denied');
      setState('denied');
      return;
    }

    /**
     * Galat bisa datang SEBELUM `startSpeechSession` selesai.
     *
     * `recognition.start()` yang melempar seketika, atau plugin Android yang
     * menolak menyalakan recognizer, memanggil `onError` di dalam pembangunan
     * sesi itu sendiri. Tanpa penanda ini, baris-baris setelah `await` menimpa
     * kembali apa yang baru saja dibereskan `handleError`: layar menyala merah
     * dengan pewaktu berjalan, padahal tidak ada yang mendengarkan — dan
     * tombol stop menghentikan sesi yang sudah mati.
     */
    let failedEarly = false;

    const handleError = (code: SpeechErrorCode) => {
      failedEarly = true;
      listeningRef.current = false;
      clearTick();
      clearGuard();
      stoppingRef.current = false;
      setStopping(false);
      setAlive(false);
      sessionRef.current = null;
      setError(code);
      /**
       * Dikte yang gagal di tengah tetap menyisakan hasil.
       *
       * Dulu keadaannya jatuh ke `'idle'` — layar awal, tempat kotak teks dan
       * tombol proses belum ada. Artinya seluruh produk yang sudah tertangkap
       * ikut lenyap bersama galatnya, padahal teksnya masih utuh di memori dan
       * masih bisa disunting. Kegagalan mesin tidak boleh jadi kehilangan
       * pekerjaan pemilik toko.
       */
      if (code === 'denied') setState('denied');
      else if (code === 'unsupported') setState('unsupported');
      else setState(transcriptRef.current.trim().length > 0 ? 'done' : 'idle');
    };

    const session = await startSpeechSession({
      onTranscript: (text) => {
        const next = withBase(text);
        // Teks yang bertambah adalah bukti terkuat mesin masih bekerja —
        // lebih dipercaya daripada denyut, karena ia hasil, bukan laporan.
        if (next.trim() !== transcriptRef.current.trim()) {
          heardAtRef.current = Date.now();
          setSilent(0);
          setAlive(true);
        }
        applyTranscript(next);
      },
      onPulse: setAlive,
      onEnd: (text) => finish(withBase(text)),
      onError: handleError,
    });

    if (failedEarly) {
      // Sesi sudah gagal; lepaskan supaya mikrofon tidak tertinggal menyala.
      await session.cancel().catch(() => {});
      return;
    }

    sessionRef.current = session;
    listeningRef.current = true;
    startedAtRef.current = Date.now();
    setState('listening');

    clearTick();
    tickRef.current = setInterval(() => {
      const secs = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(secs);
      // Diukur dari kata terakhir, atau dari awal kalau belum ada satu pun —
      // dikte yang sejak awal tidak menangkap apa-apa justru kasus yang paling
      // perlu diberi tahu.
      setSilent((Date.now() - (heardAtRef.current || startedAtRef.current)) / 1000);
      // Batas waktu ditegakkan di sini, bukan di mesin pengenalan: keduanya
      // menyambung sesi sendiri saat ada jeda, jadi tanpa penghenti ini dikte
      // bisa berjalan tanpa ujung.
      if (listeningRef.current && secs >= maxRef.current) void stop();
    }, 200);
  }, [applyTranscript, clearGuard, clearTick, finish, stop, withBase]);

  const cancel = useCallback(async () => {
    listeningRef.current = false;
    clearTick();
    clearGuard();
    stoppingRef.current = false;
    setStopping(false);
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.cancel();
  }, [clearGuard, clearTick]);

  const reset = useCallback(() => {
    baseRef.current = '';
    applyTranscript('');
    setElapsed(0);
    setError(null);
    setSilent(0);
    setAlive(true);
    heardAtRef.current = 0;
    setState(available === false ? 'unsupported' : 'idle');
  }, [applyTranscript, available]);

  useEffect(
    () => () => {
      if (guardRef.current) clearTimeout(guardRef.current);
      void sessionRef.current?.cancel();
    },
    [],
  );

  return {
    state,
    error,
    stopping,
    alive,
    silentSec,
    elapsedSec,
    transcript,
    setTranscript: applyTranscript,
    available,
    start,
    stop,
    cancel,
    reset,
  };
}
