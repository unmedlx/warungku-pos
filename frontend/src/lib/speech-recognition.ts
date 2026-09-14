/**
 * Pengenalan suara di perangkat.
 *
 * Membungkus dua mesin yang perilakunya berbeda jauh:
 * - Android lewat `@capacitor-community/speech-recognition` (SpeechRecognizer
 *   bawaan sistem);
 * - `webkitSpeechRecognition` untuk Electron dan browser saat pengembangan.
 *
 * Yang membuat pembungkus ini tidak sekadar penerus panggilan adalah masalah
 * JEDA. Kedua mesin berhenti sendiri begitu penuturnya diam sesaat — perilaku
 * yang masuk akal untuk perintah suara ("putar lagu"), tapi merusak untuk
 * mendikte daftar produk, karena pemilik toko memang berhenti sejenak di
 * antara barang. Tanpa penanganan, "Indomie goreng tiga ribu ... terus Aqua
 * lima ribu" berhenti setelah kata "ribu" yang pertama dan sisanya hilang.
 *
 * Karena itu sesi disambung sendiri: setiap kali mesin berhenti padahal
 * pemilik toko belum menekan stop, hasil sesi itu dikunci sebagai segmen dan
 * sesi baru langsung dijalankan. Yang dilihat pengguna adalah satu perekaman
 * panjang yang utuh.
 */

import { Capacitor } from '@capacitor/core';

export type SpeechState = 'idle' | 'unsupported' | 'denied' | 'starting' | 'listening';

export interface SpeechSessionHandlers {
  /** Dipanggil tiap kali teks bertambah, termasuk hasil sementara. */
  onTranscript: (text: string) => void;
  /**
   * Dipanggil sekali untuk tiap potongan yang sudah FINAL.
   *
   * Dipisah dari `onTranscript` karena dua pemakainya butuh hal yang
   * berlawanan. Pendaftaran produk mengumpulkan semuanya lalu mengirim sekali
   * di akhir, jadi teks kumulatif sudah cukup. Kasir bertindak sambil kasir
   * bicara — dan bertindak atas teks sementara berbahaya, karena hasil
   * sementara sering berubah total sedetik kemudian. Hanya potongan final yang
   * boleh menambah barang ke keranjang.
   */
  onSegment?: (text: string) => void;
  /**
   * Teks sesi yang sedang berjalan SAJA, tanpa potongan yang sudah terkunci.
   *
   * Dipisah dari `onTranscript` karena dua layar butuh hal yang berbeda.
   * Pendaftaran produk mengumpulkan satu dikte panjang, jadi teks kumulatif
   * memang yang ingin dilihat. Kasir sebaliknya: begitu satu barang masuk,
   * kalimat yang menghasilkannya sudah selesai tugasnya, dan membiarkannya
   * menumpuk di layar justru menyamarkan barang yang sedang disebut sekarang.
   */
  onPartial?: (text: string) => void;
  /** Mesin berhenti total dan tidak akan disambung lagi. */
  onEnd: (finalText: string) => void;
  onError: (code: SpeechErrorCode) => void;
  /**
   * Denyut mesin pengenalan: masih mendengarkan atau tidak.
   *
   * Satu-satunya hal yang bisa membedakan "mikrofon hidup tapi ruangannya
   * sepi" dari "mikrofon sudah mati" di layar. Tanpa kabar ini keduanya
   * terlihat persis sama — pewaktu berjalan dan teksnya kosong — dan pemilik
   * toko terus bicara ke mesin yang sudah berhenti. Jalur rekam punya meter
   * suara untuk ini; jalur dikte tidak bisa membuka mikrofon kedua karena
   * recognizer Android memegangnya eksklusif, jadi denyutnya yang dipakai.
   */
  onPulse?: (alive: boolean) => void;
}

export type SpeechErrorCode = 'denied' | 'unsupported' | 'no-speech' | 'network' | 'unknown';

export interface SpeechSession {
  /** Hentikan atas permintaan pengguna; `onEnd` akan menyusul. */
  stop: () => Promise<void>;
  /** Hentikan tanpa memanggil `onEnd` — dipakai saat dialog ditutup. */
  cancel: () => Promise<void>;
}

/** Bahasa pengenalan. Dikunci ke Indonesia: seluruh prompt server juga begitu. */
const LANGUAGE = 'id-ID';

type WebSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

function webSpeechCtor(): (new () => WebSpeechRecognition) | null {
  const w = window as unknown as Record<string, unknown>;
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof ctor === 'function' ? (ctor as new () => WebSpeechRecognition) : null;
}

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Apakah perangkat ini bisa mengenali suara sendiri.
 *
 * Dipanggil sebelum tombol suara ditampilkan. Android tanpa layanan pengenalan
 * suara terpasang — HP murah tanpa Google App lengkap — mengembalikan false,
 * dan di situlah aplikasi jatuh ke jalur rekam-lalu-kirim.
 */
export async function isSpeechRecognitionAvailable(): Promise<boolean> {
  if (isNative()) {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      const { available } = await SpeechRecognition.available();
      return available;
    } catch {
      return false;
    }
  }
  return webSpeechCtor() !== null;
}

/**
 * Minta izin mikrofon.
 *
 * Di Android izin yang diminta plugin adalah `RECORD_AUDIO` yang sama dengan
 * perekam, jadi pengguna yang sudah mengizinkan untuk satu jalur tidak ditanya
 * dua kali.
 */
export async function requestSpeechPermission(): Promise<boolean> {
  if (!isNative()) return true; // Browser meminta izin sendiri saat start().
  try {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
    const current = await SpeechRecognition.checkPermissions();
    if (current.speechRecognition === 'granted') return true;
    const asked = await SpeechRecognition.requestPermissions();
    return asked.speechRecognition === 'granted';
  } catch {
    return false;
  }
}

/**
 * Gabungkan segmen yang sudah dikunci dengan hasil sementara sesi berjalan.
 *
 * Dipisah jadi fungsi sendiri karena ini sumber cacat yang halus: kalau segmen
 * disambung tanpa spasi, "tiga ribu" + "terus" jadi "tiga ributerus" dan model
 * di server kehilangan batas antar produk yang justru paling sulit ditebak.
 */
function joinSegments(committed: string[], partial: string): string {
  return [...committed, partial]
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(' ');
}

/**
 * Jeda sebelum sesi disambung, dalam milidetik.
 *
 * Bukan angka hiasan. Android memancarkan `onEndOfSpeech` LEBIH DULU daripada
 * `onResults`, sementara `beginListening` di plugin melakukan `cancel()` lalu
 * `destroy()` pada recognizer yang sedang berjalan. Menyambung sesi tepat saat
 * "stopped" berarti menghancurkan recognizer persis sebelum hasil finalnya
 * sempat sampai — teks terbaik hilang, dan sesi berikutnya sering ditolak
 * dengan ERROR_RECOGNIZER_BUSY.
 *
 * Jeda ini memberi hasil final kesempatan menyusul, lalu barulah potongan itu
 * dikunci dan sesi baru dijalankan.
 */
const RESTART_GRACE_MS = 350;

/** Jeda sebelum mencoba lagi setelah kegagalan yang masih bisa dipulihkan. */
const RETRY_BACKOFF_MS = 500;

/**
 * Berapa kali kegagalan beruntun ditoleransi sebelum menyerah.
 *
 * Harus ada batasnya: tanpa ini, perangkat yang layanan pengenalannya benar
 * benar rusak akan dicoba ulang selamanya, memanaskan HP kasir tanpa pernah
 * menghasilkan satu kata pun.
 */
const MAX_CONSECUTIVE_FAILURES = 4;

/**
 * Sepanjang apa mikrofon dibiarkan menyala tanpa satu kata pun tertangkap.
 *
 * Satu-satunya ujung sesi selain permintaan pengguna, dan sengaja diukur
 * dengan WAKTU, bukan cacah penyambungan.
 *
 * Cacah penyambunganlah yang dulu dipakai, dan itu salah mengukur. Yang
 * dihitungnya adalah seberapa sering Android menyerah, bukan seberapa lama
 * penuturnya diam — dan keduanya tidak berhubungan. Recognizer padam sendiri
 * tiap beberapa detik tanpa suara, sering lebih cepat daripada selang
 * pemeriksaan denyut, jadi tujuh kepadaman terkumpul dalam sekitar delapan
 * detik. Akibatnya mikrofon kasir mati setelah delapan detik diam, dan ucapan
 * sesudahnya tidak pernah tertangkap lagi sampai tombolnya ditekan ulang.
 * Delapan detik diam di antara pembeli bukan kerusakan; itu hari kerja yang
 * biasa.
 *
 * Sepanjang jendela ini sesi disambung berapa kali pun diperlukan, dan
 * jendelanya dihitung ulang dari kata TERAKHIR yang terdengar — jadi jeda
 * antar barang tidak pernah menumpuk. Ujungnya tetap ada karena mikrofon yang
 * tertinggal menyala di meja kasir yang sudah tutup memakan baterai tanpa ada
 * yang menunggunya, dan habisnya dilaporkan sebagai `no-speech`: keadaan yang
 * bisa dijelaskan dan dinyalakan lagi dengan satu ketukan, bukan kerusakan
 * tanpa nama.
 */
const MAX_SILENT_MS = 45_000;

/**
 * Selang pemeriksaan denyut, dalam milidetik.
 *
 * Ada karena plugin menutupi seluruh galat yang terjadi SETELAH sesi berjalan.
 * Dengan `partialResults: true`, plugin memanggil `call.resolve()` seketika
 * saat mulai mendengarkan — jadi `call.reject()` yang dipanggil `onError`
 * kemudian jatuh ke promise yang sudah selesai dan hilang tanpa bekas.
 * `onError` juga tidak memancarkan `listeningState`, hanya `onEndOfSpeech`
 * yang melakukannya.
 *
 * Akibatnya ERROR_NO_MATCH, ERROR_SPEECH_TIMEOUT, dan galat jaringan
 * menghentikan recognizer tanpa satu pun tanda: kasir terus bicara ke
 * mikrofon yang sudah mati. Satu-satunya sinyal yang tersisa adalah bertanya
 * langsung lewat `isListening()`.
 */
const WATCHDOG_MS = 1200;

/**
 * Recognizer yang baru dinyalakan tidak diperiksa denyutnya dulu.
 *
 * Plugin menyalakannya lewat `post()` ke thread UI, jadi `isListening()` masih
 * false sesaat sesudah `start()` selesai. Memeriksanya terlalu cepat membuat
 * sesi sehat disambung dua kali — dan `beginListening` menghancurkan
 * recognizer yang baru saja mulai mendengar.
 */
const START_GRACE_MS = 1000;

/**
 * Kegagalan yang wajar terjadi di tengah dikte dan layak dicoba lagi.
 *
 * "No match" dan "speech timeout" adalah cara Android bilang penuturnya diam —
 * itu bukan kerusakan. "Busy" dan "client side error" muncul saat recognizer
 * belum selesai dibereskan; sedetik kemudian biasanya sudah bisa.
 */
/**
 * Cara Android bilang "penuturnya diam", bukan "ada yang rusak".
 *
 * Wajib dibedakan dari kerusakan sungguhan. Kasir yang berhenti sejenak atau
 * menyebut sesuatu yang tidak dikenali memicu ini terus-menerus — kalau ikut
 * dihitung sebagai kegagalan, mikrofon akan menyerah justru pada pemakaian
 * yang paling normal.
 */
const SILENCE_ERROR = /no match|speech timeout|no speech input|didn't understand/i;

/** Kerusakan sesaat: recognizer belum selesai dibereskan, atau jaringan kedip. */
const TRANSIENT_ERROR = /busy|client side|audio recording|network/i;

/**
 * Sepanjang apa permintaan berhenti ditunggu sebelum diselesaikan sendiri.
 *
 * `SpeechRecognition.stop()` tidak selalu menjawab. Di sebagian Android ia
 * menggantung kalau recognizer sudah dibereskan sistem, dan karena seluruh
 * ekor `stop()` — pembersihan listener sampai `onEnd` — menunggu di belakang
 * `await` itu, yang terlihat pemilik toko adalah tombol stop yang tidak
 * melakukan apa-apa sementara pewaktu terus berjalan. Menekan lagi cuma
 * menambah satu penantian yang sama.
 *
 * Karena itu jawabannya tidak lagi ditunggu tanpa batas: lewat tenggat ini
 * sesi diselesaikan dengan teks yang sudah terkumpul.
 */
const STOP_TIMEOUT_MS = 2000;

/** Tunggu `p`, tapi menyerah setelah `ms`. Tidak pernah menolak. */
function settleWithin(p: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    void Promise.resolve(p).then(done, done);
  });
}

async function startNativeSession(handlers: SpeechSessionHandlers): Promise<SpeechSession> {
  const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');

  const committed: string[] = [];
  let partial = '';
  let stopping = false;
  let cancelled = false;
  let failures = 0;
  /**
   * `onEnd` sudah dikabarkan.
   *
   * Wajib ada karena dua jalur bisa mengakhiri sesi yang sama. Saat pemilik
   * toko menekan stop, `listeningState` biasanya memancarkan "stopped" lalu
   * `finish()` mengabarkan hasilnya — dan ekor `stop()` yang menunggu di
   * belakang `await` kemudian mengabarkannya sekali lagi. Bagi pemakai, dikte
   * yang sama selesai dua kali.
   */
  let ended = false;
  /** Kapan terakhir ada kata yang benar-benar tertangkap. */
  let heardAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let watchdog: ReturnType<typeof setInterval> | null = null;
  let probing = false;
  /** Kapan recognizer terakhir dinyalakan; lihat `START_GRACE_MS`. */
  let startedAt = 0;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const clearWatchdog = () => {
    if (watchdog) clearInterval(watchdog);
    watchdog = null;
  };

  const emit = () => {
    handlers.onTranscript(joinSegments(committed, partial));
    handlers.onPartial?.(partial);
  };

  /** Kabarkan akhir sesi tepat sekali, dari jalur mana pun ia datang. */
  const emitEnd = () => {
    if (ended) return;
    ended = true;
    handlers.onEnd(joinSegments(committed, ''));
  };

  /**
   * Akhiri sesi karena kegagalan yang tidak bisa dipulihkan.
   *
   * Pembersihan HARUS terjadi sebelum kabar dikirim, dan ini bukan kerapian.
   * Listener yang ditinggalkan tetap terdaftar di plugin, sementara pemanggil
   * sudah membuang referensi sesinya — jadi tidak ada lagi yang bisa
   * melepasnya. Saat kasir menyalakan mikrofon lagi, sesi baru dan sesi mati
   * sama-sama menanggapi event yang sama dan saling menghancurkan recognizer
   * (`beginListening` di plugin melakukan `cancel()` lalu `destroy()`).
   * Hasilnya mikrofon tidak pernah bisa kembali sampai aplikasi ditutup.
   */
  const fail = (code: SpeechErrorCode) => {
    if (stopping || cancelled) return;
    stopping = true;
    // Kegagalan sudah dikabarkan lewat `onError`; `onEnd` tidak boleh menyusul
    // kalau pemakai kemudian memanggil `stop()` pada sesi yang sudah mati.
    ended = true;
    void teardown();
    handlers.onPulse?.(false);
    handlers.onError(code);
  };

  const partialListener = await SpeechRecognition.addListener('partialResults', (data) => {
    if (cancelled) return;
    const best = data.matches?.[0];
    if (typeof best !== 'string') return;
    // Ada suara yang benar-benar dikenali: rangkaian kegagalan sebelumnya
    // tidak relevan lagi.
    failures = 0;
    heardAt = Date.now();
    handlers.onPulse?.(true);
    partial = best;
    emit();
  });

  /** Kunci hasil sesi berjalan supaya tidak tertimpa sesi berikutnya. */
  const commit = () => {
    const text = partial.trim();
    partial = '';
    if (text.length === 0) return;
    committed.push(text);
    // Potongan ini sudah jadi barang di keranjang; layar kasir dikosongkan
    // supaya ucapan berikutnya berdiri sendiri.
    handlers.onPartial?.('');
    handlers.onSegment?.(text);
  };

  const finish = () => {
    clearTimer();
    commit();
    emitEnd();
  };

  const runSession = async () => {
    if (cancelled || stopping) return;
    startedAt = Date.now();
    try {
      await SpeechRecognition.start({
        language: LANGUAGE,
        // `popup: false` wajib: dialog bawaan Android menutupi layar, dan
        // `partialResults` tidak jalan kalau popup menyala.
        popup: false,
        partialResults: true,
        maxResults: 1,
      });
    } catch (err) {
      if (cancelled || stopping) return;
      const message = err instanceof Error ? err.message : String(err);

      if (/permission|denied/i.test(message)) {
        fail('denied');
        return;
      }

      /**
       * Kegagalan jaringan tidak mematikan sesi.
       *
       * Pengenalan suara Android sering butuh jaringan, dan jaringan warung
       * putus-nyambung. Menyerah pada kedipan pertama berarti mikrofon mati
       * diam-diam di tengah transaksi — kegagalan yang justru paling
       * membingungkan kasir karena tidak ada yang berubah di layar.
       */
      if (SILENCE_ERROR.test(message) || TRANSIENT_ERROR.test(message)) {
        // Hening tidak dihitung sebagai kegagalan: ia justru tanda fitur ini
        // dipakai sebagaimana mestinya.
        if (!SILENCE_ERROR.test(message)) failures += 1;

        if (failures >= MAX_CONSECUTIVE_FAILURES) {
          fail(/network/i.test(message) ? 'network' : 'unknown');
          return;
        }
        clearTimer();
        timer = setTimeout(() => {
          timer = null;
          void runSession();
        }, RETRY_BACKOFF_MS);
        return;
      }

      fail('unknown');
    }
  };

  const stateListener = await SpeechRecognition.addListener('listeningState', (data) => {
    if (data.status !== 'stopped' || cancelled) return;

    if (stopping) {
      finish();
      return;
    }

    /**
     * Jangan mengunci teks sekarang.
     *
     * Hasil final Android datang SESUDAH "stopped". Mengunci di sini berarti
     * yang tersimpan adalah tebakan setengah jadi, lalu hasil finalnya masuk
     * sebagai potongan baru — barang yang sama masuk keranjang dua kali.
     * Menunggu sebentar membuat keduanya jadi satu potongan yang benar.
     */
    clearTimer();
    timer = setTimeout(() => {
      // Wajib dikosongkan. Pemantau denyut membaca `timer != null` sebagai
      // "penyambungan sedang dijadwalkan"; id pewaktu yang sudah lewat membuat
      // pemantau itu diam selamanya, dan recognizer yang mati karena hening
      // sesudah ini tidak pernah dibangunkan lagi.
      timer = null;
      if (cancelled || stopping) return;
      commit();
      void runSession();
    }, RESTART_GRACE_MS);
  });

  /**
   * Bangunkan sesi yang mati diam-diam.
   *
   * Hanya bertindak kalau tidak ada penyambungan yang memang sedang dijadwalkan
   * — jeda 350 ms setelah "stopped" adalah keadaan sehat, bukan kematian.
   */
  const checkPulse = async () => {
    if (cancelled || stopping || probing || timer != null) return;
    if (Date.now() - startedAt < START_GRACE_MS) return;
    probing = true;
    try {
      const { listening } = await SpeechRecognition.isListening();
      handlers.onPulse?.(listening);
      if (listening) {
        // Sehat. Riwayat kegagalan sebelumnya tidak boleh menumpuk sampai
        // sebuah hiccup jauh di kemudian hari melewati batas.
        failures = 0;
        return;
      }
      if (cancelled || stopping || timer != null) return;

      /**
       * Denyut yang hilang paling sering berarti ERROR_NO_MATCH atau
       * ERROR_SPEECH_TIMEOUT: penuturnya diam, atau menyebut sesuatu yang
       * tidak dikenali. Itu bukan kerusakan, dan jawabannya selalu sama —
       * sambung lagi, berapa kali pun diperlukan.
       */
      if (Date.now() - heardAt >= MAX_SILENT_MS) {
        // Hening yang sangat panjang: bukan jeda antar barang lagi, melainkan
        // mikrofon yang tertinggal menyala.
        fail('no-speech');
        return;
      }

      // Apa pun yang sempat terdengar sebelum mesin berhenti tetap dipakai.
      commit();
      await runSession();
    } catch {
      /**
       * Perangkat tidak menjawab. Bukan alasan menyerah — percobaan berikutnya
       * yang menentukan — tapi layar wajib tahu, karena diamnya `isListening()`
       * adalah satu-satunya gejala yang tersisa saat layanan pengenalan
       * menggantung.
       */
      handlers.onPulse?.(false);
    } finally {
      probing = false;
    }
  };

  const teardown = async () => {
    clearTimer();
    clearWatchdog();
    await partialListener.remove().catch(() => {});
    await stateListener.remove().catch(() => {});
  };

  void runSession();
  watchdog = setInterval(() => void checkPulse(), WATCHDOG_MS);

  return {
    stop: async () => {
      stopping = true;
      clearTimer();
      clearWatchdog();
      handlers.onPulse?.(false);
      // Jawaban plugin tidak ditunggu tanpa batas: sebagian Android tidak
      // pernah menjawab, dan seluruh ekor di bawah ini yang menunggunya.
      await settleWithin(
        Promise.resolve()
          .then(() => SpeechRecognition.stop())
          .catch(() => {}),
        STOP_TIMEOUT_MS,
      );
      await settleWithin(teardown(), STOP_TIMEOUT_MS);
      // `listeningState` sudah memanggil `onEnd` di jalur normal. Ini jaring
      // pengaman untuk perangkat yang tidak mengirim event itu saat di-stop.
      commit();
      emitEnd();
    },
    cancel: async () => {
      cancelled = true;
      stopping = true;
      ended = true;
      clearWatchdog();
      handlers.onPulse?.(false);
      await settleWithin(
        Promise.resolve()
          .then(() => SpeechRecognition.stop())
          .catch(() => {}),
        STOP_TIMEOUT_MS,
      );
      await settleWithin(teardown(), STOP_TIMEOUT_MS);
    },
  };
}

async function startWebSession(handlers: SpeechSessionHandlers): Promise<SpeechSession> {
  const Ctor = webSpeechCtor();
  if (!Ctor) {
    handlers.onError('unsupported');
    return { stop: async () => {}, cancel: async () => {} };
  }

  const recognition = new Ctor();
  recognition.lang = LANGUAGE;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  const committed: string[] = [];
  let partial = '';
  let stopping = false;
  let cancelled = false;
  /**
   * Sesi sudah menyerah karena galat yang tidak bisa dipulihkan.
   *
   * Terpisah dari `stopping` karena keduanya berakhir berbeda: berhenti atas
   * permintaan pengguna wajib memancarkan `onEnd` dengan teks yang terkumpul,
   * sedangkan kegagalan sudah dikabarkan lewat `onError` dan tidak boleh
   * dikabarkan dua kali.
   *
   * Wajib ada karena browser SELALU memancarkan `onend` setelah `onerror`.
   * Tanpa penanda ini `onend` melihat sesi yang masih dianggap sehat lalu
   * menyalakan ulang recognizer — padahal pemanggil sudah membuang
   * referensinya saat menerima `onError`. Yang tersisa adalah mikrofon yang
   * menyala tanpa ada lagi yang bisa mematikannya sampai aplikasi ditutup.
   */
  let failed = false;
  let ended = false;
  /** Penjaga kalau `onend` tidak pernah datang setelah `stop()`. */
  let stopTimer: ReturnType<typeof setTimeout> | null = null;

  const clearStopTimer = () => {
    if (stopTimer) clearTimeout(stopTimer);
    stopTimer = null;
  };

  /** Kabarkan akhir sesi tepat sekali, dari jalur mana pun ia datang. */
  const emitEnd = () => {
    if (ended) return;
    ended = true;
    clearStopTimer();
    handlers.onEnd(joinSegments(committed, partial));
  };

  /** Akhiri sesi untuk selamanya dan kabarkan sekali. */
  const fail = (code: SpeechErrorCode) => {
    if (failed || cancelled) return;
    failed = true;
    ended = true;
    clearStopTimer();
    handlers.onPulse?.(false);
    handlers.onError(code);
  };

  recognition.onstart = () => {
    if (cancelled || failed) return;
    handlers.onPulse?.(true);
  };

  recognition.onresult = (e: unknown) => {
    const ev = e as { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
    partial = '';
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const result = ev.results[i];
      const text = result[0]?.transcript ?? '';
      if (result.isFinal) {
        const finalText = text.trim();
        if (finalText.length > 0) {
          committed.push(finalText);
          handlers.onSegment?.(finalText);
        }
      } else partial += text;
    }
    handlers.onPulse?.(true);
    handlers.onTranscript(joinSegments(committed, partial));
    handlers.onPartial?.(partial);
  };

  recognition.onerror = (e: unknown) => {
    const code = (e as { error?: string }).error ?? '';
    if (cancelled) return;
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      fail('denied');
      return;
    }
    if (code === 'network') {
      fail('network');
      return;
    }
    // `no-speech` dan `aborted` normal terjadi di sela dikte; `onend` yang
    // memutuskan apakah sesinya perlu disambung.
    if (code !== 'no-speech' && code !== 'aborted') fail('unknown');
  };

  recognition.onend = () => {
    if (cancelled || failed) return;
    if (stopping) {
      emitEnd();
      return;
    }
    try {
      recognition.start();
    } catch {
      emitEnd();
    }
  };

  try {
    recognition.start();
  } catch {
    fail('unknown');
  }

  return {
    stop: async () => {
      stopping = true;
      handlers.onPulse?.(false);
      /**
       * `stop()` pada recognizer yang sudah berhenti tidak memancarkan `onend`.
       *
       * Celahnya nyata: sesi ini menyalakan ulang recognizer sendiri tiap kali
       * penuturnya diam, dan stop yang jatuh tepat di sela itu tidak dijawab
       * siapa pun. Tanpa penjaga ini pewaktu terus berjalan dan tombolnya
       * terasa mati.
       */
      clearStopTimer();
      stopTimer = setTimeout(emitEnd, STOP_TIMEOUT_MS);
      try {
        recognition.stop();
      } catch {
        emitEnd();
      }
    },
    cancel: async () => {
      cancelled = true;
      stopping = true;
      ended = true;
      clearStopTimer();
      handlers.onPulse?.(false);
      recognition.abort();
    },
  };
}

/**
 * Mulai mendikte. Pemanggil bertanggung jawab memanggil `stop` atau `cancel`.
 */
export async function startSpeechSession(
  handlers: SpeechSessionHandlers,
): Promise<SpeechSession> {
  return isNative() ? startNativeSession(handlers) : startWebSession(handlers);
}
