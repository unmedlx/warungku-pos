import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Pengenalan suara jalur Android.
 *
 * Berkas ini ada karena satu bug yang hanya muncul di perangkat sungguhan:
 * mikrofon berhenti menangkap apa pun setelah barang pertama masuk keranjang,
 * padahal pita di layar masih menyala "Mendengarkan".
 *
 * Penyebabnya urutan event Android. `onEndOfSpeech` dipancarkan LEBIH DULU
 * daripada `onResults`, sementara `beginListening` di plugin melakukan
 * `cancel()` lalu `destroy()`. Menyambung sesi tepat saat "stopped" berarti
 * menghancurkan recognizer persis sebelum hasil finalnya sampai — teks
 * terbaiknya hilang, sesi berikutnya ditolak ERROR_RECOGNIZER_BUSY, dan karena
 * `onError` plugin tidak memancarkan `listeningState`, tidak ada apa pun yang
 * memulihkan.
 */

const listeners = new Map<string, ((data: unknown) => void)[]>();
let startCalls = 0;
let startBehavior: () => Promise<void> = async () => {};
/** Apa yang dijawab `isListening()` — cara satu-satunya mendeteksi sesi mati. */
let alive = true;

const SpeechRecognition = {
  available: vi.fn(async () => ({ available: true })),
  checkPermissions: vi.fn(async () => ({ speechRecognition: 'granted' })),
  requestPermissions: vi.fn(async () => ({ speechRecognition: 'granted' })),
  stop: vi.fn(async () => {}),
  isListening: vi.fn(async () => ({ listening: alive })),
  start: vi.fn(async () => {
    startCalls += 1;
    await startBehavior();
    return {};
  }),
  addListener: vi.fn(async (event: string, fn: (data: unknown) => void) => {
    listeners.set(event, [...(listeners.get(event) ?? []), fn]);
    // Melepas beneran, supaya tes bisa membuktikan sesi mati tidak
    // meninggalkan pendengar yang masih menanggapi event.
    return {
      remove: async () => {
        listeners.set(event, (listeners.get(event) ?? []).filter((f) => f !== fn));
      },
    };
  }),
};

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor-community/speech-recognition', () => ({ SpeechRecognition }));

function fire(event: string, data: unknown) {
  for (const fn of listeners.get(event) ?? []) fn(data);
}

/** Android mengirim hasil — final maupun sementara — lewat kanal yang sama. */
const hear = (text: string) => fire('partialResults', { matches: [text] });
/** `onEndOfSpeech`: mesin berhenti karena penuturnya diam sejenak. */
const silence = () => fire('listeningState', { status: 'stopped' });

interface Captured {
  segments: string[];
  errors: string[];
  ended: string[];
  partials: string[];
}

async function startSession() {
  const { startSpeechSession } = await import('@/lib/speech-recognition');
  const captured: Captured = { segments: [], errors: [], ended: [], partials: [] };

  const session = await startSpeechSession({
    onTranscript: () => {},
    onPartial: (t) => captured.partials.push(t),
    onSegment: (t) => captured.segments.push(t),
    onEnd: (t) => captured.ended.push(t),
    onError: (c) => captured.errors.push(c),
  });

  return { session, captured };
}

beforeEach(() => {
  vi.useFakeTimers();
  listeners.clear();
  startCalls = 0;
  startBehavior = async () => {};
  alive = true;
  SpeechRecognition.start.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

describe('menyambung sesi setelah jeda bicara', () => {
  it('menunggu hasil final sebelum mengunci potongan', async () => {
    const { captured } = await startSession();

    // Tebakan sementara, lalu mesin berhenti karena kasir diam sejenak.
    hear('indomie goreng');
    silence();

    // Persis di sini bug lamanya: potongan dikunci sebelum hasil final datang.
    expect(captured.segments).toEqual([]);

    // Hasil final Android menyusul SESUDAH "stopped".
    hear('Indomie goreng dua');
    await vi.advanceTimersByTimeAsync(400);

    expect(captured.segments).toEqual(['Indomie goreng dua']);
  });

  it('tidak menghasilkan potongan ganda dari satu ucapan', async () => {
    const { captured } = await startSession();

    hear('teh gelas');
    silence();
    hear('Teh Gelas satu');
    await vi.advanceTimersByTimeAsync(400);

    // Dua kali kunci berarti satu barang masuk keranjang dua kali — persis
    // kegagalan yang tidak terlihat kasir sampai pembeli sudah pergi.
    expect(captured.segments).toEqual(['Teh Gelas satu']);
  });

  it('menjalankan sesi baru setelah jeda, bukan seketika', async () => {
    await startSession();
    expect(startCalls).toBe(1);

    hear('gula dua kilo');
    silence();
    // Menyambung sekarang akan menghancurkan recognizer yang belum selesai.
    expect(startCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(400);
    expect(startCalls).toBe(2);
  });

  it('diam tanpa suara tidak menghasilkan potongan kosong', async () => {
    const { captured } = await startSession();

    silence();
    await vi.advanceTimersByTimeAsync(400);

    expect(captured.segments).toEqual([]);
    expect(startCalls).toBe(2);
  });
});

describe('pemulihan kegagalan', () => {
  it('recognizer sibuk dicoba lagi, bukan diserahkan', async () => {
    let attempts = 0;
    startBehavior = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('RecognitionService busy');
    };

    const { captured } = await startSession();
    await vi.advanceTimersByTimeAsync(600);

    expect(captured.errors).toEqual([]);
    expect(startCalls).toBe(2);
  });

  it('jaringan putus sesaat tidak mematikan mikrofon', async () => {
    let attempts = 0;
    startBehavior = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Network error');
    };

    const { captured } = await startSession();
    await vi.advanceTimersByTimeAsync(600);

    // Jaringan warung putus-nyambung; menyerah pada kedipan pertama berarti
    // mikrofon mati diam-diam di tengah transaksi.
    expect(captured.errors).toEqual([]);
    expect(startCalls).toBe(2);
  });

  it('menyerah setelah gagal beruntun, dan mengabarkannya', async () => {
    startBehavior = async () => {
      throw new Error('RecognitionService busy');
    };

    const { captured } = await startSession();
    await vi.advanceTimersByTimeAsync(5000);

    // Yang penting bukan berhentinya, tapi kabarnya: tanpa ini pita terus
    // menyala padahal mesinnya sudah mati.
    expect(captured.errors.length).toBeGreaterThan(0);
    expect(startCalls).toBeLessThanOrEqual(4);
  });

  it('izin ditolak langsung dilaporkan tanpa dicoba ulang', async () => {
    startBehavior = async () => {
      throw new Error('Missing permission');
    };

    const { captured } = await startSession();
    await vi.advanceTimersByTimeAsync(2000);

    expect(captured.errors).toEqual(['denied']);
    expect(startCalls).toBe(1);
  });

  it('suara yang berhasil dikenali menyetel ulang hitungan kegagalan', async () => {
    let attempts = 0;
    startBehavior = async () => {
      attempts += 1;
      if (attempts <= 2) throw new Error('No match');
    };

    const { captured } = await startSession();
    await vi.advanceTimersByTimeAsync(1200);

    hear('Indomie goreng dua');
    silence();
    await vi.advanceTimersByTimeAsync(400);

    expect(captured.segments).toEqual(['Indomie goreng dua']);
    expect(captured.errors).toEqual([]);
  });
});

describe('berhenti atas permintaan kasir', () => {
  it('tidak menyambung sesi lagi setelah stop', async () => {
    const { session, captured } = await startSession();

    hear('Teh Gelas satu');
    await session.stop();
    await vi.advanceTimersByTimeAsync(1000);

    expect(captured.segments).toEqual(['Teh Gelas satu']);
    expect(startCalls).toBe(1);
  });

  it('batal tidak menyisakan potongan maupun sesi baru', async () => {
    const { session, captured } = await startSession();

    hear('Gula Pasir dua');
    await session.cancel();
    silence();
    await vi.advanceTimersByTimeAsync(1000);

    expect(captured.segments).toEqual([]);
    expect(captured.ended).toEqual([]);
    expect(startCalls).toBe(1);
  });
});

describe('sesi yang mati diam-diam', () => {
  /**
   * Galat di tengah sesi — ERROR_NO_MATCH saat kasir menyebut barang yang
   * tidak dikenali, misalnya — tidak memancarkan `listeningState` apa pun, dan
   * `call.reject()`-nya jatuh ke promise yang sudah selesai. Tidak ada satu
   * pun jalur event yang memberi tahu kita. Yang tersisa hanya bertanya.
   */
  it('dibangunkan lewat pemeriksaan denyut, tanpa event apa pun', async () => {
    await startSession();
    expect(startCalls).toBe(1);

    // Recognizer berhenti sendiri. Tidak ada "stopped", tidak ada penolakan.
    alive = false;
    await vi.advanceTimersByTimeAsync(1500);

    expect(startCalls).toBe(2);
  });

  it('tidak mengganggu sesi yang memang sedang disambung', async () => {
    await startSession();

    hear('Indomie goreng dua');
    silence();
    // Selama jeda 350 ms, `isListening()` memang false — itu keadaan sehat,
    // bukan kematian, dan pemantau tidak boleh ikut menyambung sesi kedua.
    alive = false;
    await vi.advanceTimersByTimeAsync(1500);

    expect(startCalls).toBe(2);
  });

  /**
   * Bug "mikrofon diam setelah teks pertama terbaca".
   *
   * Penyambungan setelah jeda meninggalkan `timer` berisi id pewaktu yang
   * sudah lewat, dan pemantau denyut menganggapnya "sedang disambung" untuk
   * selamanya. Recognizer baru yang kemudian mati karena hening (ERROR_NO_MATCH,
   * yang tidak memancarkan event apa pun) tidak pernah dibangunkan lagi,
   * sementara pita di layar tetap menyala.
   */
  it('sesi yang mati SETELAH disambung tetap dibangunkan', async () => {
    const { captured } = await startSession();

    hear('Indomie goreng jual tiga ribu');
    silence();
    await vi.advanceTimersByTimeAsync(400);
    expect(captured.segments).toEqual(['Indomie goreng jual tiga ribu']);
    expect(startCalls).toBe(2);

    // Pemilik toko diam mengambil barang berikutnya; recognizer baru menyerah.
    alive = false;
    await vi.advanceTimersByTimeAsync(3000);

    expect(startCalls).toBeGreaterThanOrEqual(3);
    expect(captured.errors).toEqual([]);
  });

  it('menyelamatkan ucapan yang sempat terdengar sebelum mesin mati', async () => {
    const { captured } = await startSession();

    hear('Teh Gelas satu');
    alive = false;
    await vi.advanceTimersByTimeAsync(1500);

    expect(captured.segments).toEqual(['Teh Gelas satu']);
  });

  it('bertahan sepanjang hening yang masuk akal, lalu berhenti', async () => {
    const { captured } = await startSession();

    /**
     * Batasnya diukur dengan WAKTU, bukan cacah percobaan — dan pembedaan itu
     * seluruh isi keluhannya.
     *
     * Dulu tujuh denyut kosong sudah cukup, yang berarti mikrofon kasir mati
     * setelah sekitar delapan detik diam. Padahal recognizer Android padam
     * sendiri tiap beberapa detik tanpa suara, lebih cepat daripada selang
     * pemeriksaan denyut, jadi delapan detik diam yang biasa saja sudah
     * menghabiskannya. Yang dialami kasir: ia bicara lagi, dan tidak ada
     * yang masuk.
     */
    alive = false;
    await vi.advanceTimersByTimeAsync(12_000);
    expect(captured.errors).toEqual([]);
    expect(startCalls).toBeGreaterThan(5);

    // Tapi ujungnya tetap ada: mikrofon tidak boleh menyala selamanya di meja
    // kasir yang sudah tutup.
    await vi.advanceTimersByTimeAsync(40_000);
    const afterGivingUp = startCalls;
    await vi.advanceTimersByTimeAsync(12_000);

    expect(startCalls).toBe(afterGivingUp);
    // Kodenya menentukan kalimat yang dibaca kasir: hening bisa dijelaskan dan
    // dinyalakan lagi dengan satu ketukan, `unknown` cuma bilang ada yang
    // rusak.
    expect(captured.errors).toEqual(['no-speech']);
  });

  it('tidak lagi memeriksa denyut setelah kasir menekan stop', async () => {
    const { session } = await startSession();

    await session.stop();
    alive = false;
    await vi.advanceTimersByTimeAsync(5000);

    expect(startCalls).toBe(1);
  });
});

describe('teks berjalan di pita kasir', () => {
  it('melaporkan ucapan berjalan tanpa menyertakan potongan lama', async () => {
    const { captured } = await startSession();

    hear('indomie');
    hear('indomie goreng dua');

    // Yang dilihat kasir adalah kalimat yang sedang ia ucapkan, bukan
    // gabungan seluruh transaksi.
    expect(captured.partials).toEqual(['indomie', 'indomie goreng dua']);
  });

  it('bersih begitu satu barang terkunci', async () => {
    const { captured } = await startSession();

    hear('Indomie goreng dua');
    silence();
    await vi.advanceTimersByTimeAsync(400);

    // Tanpa ini, kalimat menumpuk sampai barang yang baru disebut tenggelam
    // di antara ucapan-ucapan sebelumnya.
    expect(captured.partials.at(-1)).toBe('');
    expect(captured.segments).toEqual(['Indomie goreng dua']);
  });

  it('ucapan berikutnya mulai dari nol lagi', async () => {
    const { captured } = await startSession();

    hear('Indomie goreng dua');
    silence();
    await vi.advanceTimersByTimeAsync(400);
    hear('teh gelas satu');

    expect(captured.partials.at(-1)).toBe('teh gelas satu');
  });
});

describe('sesi yang menyerah tidak meninggalkan zombie', () => {
  /**
   * Kalau pendengar dibiarkan terdaftar, sesi berikutnya berbagi event dengan
   * sesi yang sudah mati. Keduanya memanggil `start()`, dan karena
   * `beginListening` melakukan `cancel()` lalu `destroy()`, keduanya saling
   * menghancurkan recognizer. Mikrofon tidak akan pernah bisa kembali.
   */
  const totalListeners = () =>
    [...listeners.values()].reduce((n, fns) => n + fns.length, 0);

  it('melepas seluruh pendengar saat menyerah', async () => {
    startBehavior = async () => {
      throw new Error('Some unrecoverable failure');
    };

    const { captured } = await startSession();
    await vi.advanceTimersByTimeAsync(100);

    expect(captured.errors).toEqual(['unknown']);
    expect(totalListeners()).toBe(0);
  });

  it('tidak menanggapi event apa pun setelah menyerah', async () => {
    startBehavior = async () => {
      throw new Error('Some unrecoverable failure');
    };

    await startSession();
    await vi.advanceTimersByTimeAsync(100);
    const afterFailure = startCalls;

    // Event yang datang belakangan milik sesi lain; yang mati harus diam.
    silence();
    alive = false;
    await vi.advanceTimersByTimeAsync(5000);

    expect(startCalls).toBe(afterFailure);
  });

  it('izin ditolak juga membersihkan pendengarnya', async () => {
    startBehavior = async () => {
      throw new Error('Missing permission');
    };

    await startSession();
    await vi.advanceTimersByTimeAsync(100);

    expect(totalListeners()).toBe(0);
  });
});

describe('hening bukan kegagalan', () => {
  it('ERROR_NO_MATCH berulang tidak mematikan mikrofon', async () => {
    startBehavior = async () => {
      throw new Error('No match');
    };

    const { captured } = await startSession();
    await vi.advanceTimersByTimeAsync(5000);

    // Kasir yang diam, atau menyebut sesuatu yang tidak dikenali, memicu ini
    // terus-menerus. Menyerah di situ berarti fitur mati justru pada
    // pemakaian yang paling normal.
    expect(captured.errors).toEqual([]);
    expect(startCalls).toBeGreaterThan(4);
  });
});

describe('jeda antar barang tidak menumpuk', () => {
  it('jam hening dihitung ulang dari kata terakhir', async () => {
    const { captured } = await startSession();

    // Recognizer tidak pernah tertangkap hidup — keadaan yang sebenarnya
    // terjadi, karena ia padam lebih cepat daripada selang pemeriksaannya.
    alive = false;
    // Sepuluh barang, masing-masing didahului jeda sepuluh detik. Totalnya
    // jauh melewati batas hening, tapi tidak ada satu jeda pun yang melewatinya.
    for (let i = 0; i < 10; i += 1) {
      await vi.advanceTimersByTimeAsync(10_000);
      hear(`barang ${i}`);
    }

    expect(captured.errors).toEqual([]);
  });

  it('ucapan setelah hening panjang tetap tertangkap', async () => {
    const { captured } = await startSession();

    hear('Indomie goreng dua');
    alive = false;
    await vi.advanceTimersByTimeAsync(20_000);
    hear('Teh Gelas satu');
    alive = false;
    await vi.advanceTimersByTimeAsync(1500);

    // Inti keluhannya, dan satu-satunya hal yang benar-benar harus dijamin.
    expect(captured.segments).toContain('Teh Gelas satu');
    expect(captured.errors).toEqual([]);
  });
});

describe('denyut dikabarkan ke layar', () => {
  it('mesin yang padam terlihat sebagai padam, bukan sebagai sepi', async () => {
    const { startSpeechSession } = await import('@/lib/speech-recognition');
    const pulses: boolean[] = [];
    await startSpeechSession({
      onTranscript: () => {},
      onEnd: () => {},
      onError: () => {},
      onPulse: (a) => pulses.push(a),
    });

    alive = false;
    await vi.advanceTimersByTimeAsync(1500);
    expect(pulses).toContain(false);

    alive = true;
    hear('Indomie goreng');
    expect(pulses.at(-1)).toBe(true);
  });
});
