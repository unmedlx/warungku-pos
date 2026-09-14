import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Pengenalan suara di perangkat, jalur web/Electron.
 *
 * Yang diuji di sini hampir seluruhnya soal JEDA. Mesin pengenalan berhenti
 * sendiri begitu penuturnya diam sesaat, sementara pemilik toko justru
 * berhenti sejenak di antara barang. Kalau sesi tidak disambung — atau
 * disambung tapi teksnya menempel — daftar produknya rusak persis di tempat
 * yang paling sulit ditebak server: batas antar produk.
 */

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

interface FakeResult {
  isFinal: boolean;
  0: { transcript: string };
}

/** Tiruan `webkitSpeechRecognition` yang bisa dikemudikan dari tes. */
class FakeRecognition {
  static last: FakeRecognition | null = null;

  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  startCount = 0;
  running = false;

  onstart: (() => void) | null = null;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeRecognition.last = this;
  }

  start() {
    this.startCount += 1;
    this.running = true;
    this.onstart?.();
  }

  stop() {
    // Browser sungguhan diam saja kalau mesinnya sudah berhenti: `onend` cuma
    // dipancarkan untuk sesi yang memang sedang berjalan.
    if (!this.running) return;
    this.running = false;
    this.onend?.();
  }

  abort() {
    this.running = false;
  }

  /** Kirim hasil seperti mesin sungguhan: sebagian final, sebagian sementara. */
  emit(results: { text: string; final: boolean }[], resultIndex = 0) {
    const list = results.map(
      (r) => ({ isFinal: r.final, 0: { transcript: r.text } }) as FakeResult,
    );
    this.onresult?.({ resultIndex, results: Object.assign(list, { length: list.length }) });
  }

  /** Mesin berhenti sendiri karena hening, bukan karena diminta. */
  endBySilence() {
    this.running = false;
    this.onend?.();
  }

  /**
   * Galat seperti browser sungguhan memancarkannya.
   *
   * Urutan ini yang menentukan: `onend` SELALU menyusul `onerror`. Tes yang
   * memanggil `onerror` saja tidak akan pernah melihat cacat yang paling
   * merugikan di jalur ini — recognizer yang menyalakan dirinya kembali lewat
   * `onend` setelah pemanggilnya sudah membuang sesinya.
   */
  failWith(code: string) {
    this.running = false;
    this.onerror?.({ error: code });
    this.onend?.();
  }
}

async function loadModule() {
  vi.resetModules();
  return import('@/lib/speech-recognition');
}

beforeEach(() => {
  FakeRecognition.last = null;
  (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
});

describe('ketersediaan', () => {
  it('tersedia kalau browser menyediakan mesin pengenalan', async () => {
    const { isSpeechRecognitionAvailable } = await loadModule();
    await expect(isSpeechRecognitionAvailable()).resolves.toBe(true);
  });

  it('tidak tersedia kalau mesinnya tidak ada', async () => {
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    const { isSpeechRecognitionAvailable } = await loadModule();
    await expect(isSpeechRecognitionAvailable()).resolves.toBe(false);
  });
});

describe('dikte', () => {
  it('meminta bahasa Indonesia dan hasil sementara', async () => {
    const { startSpeechSession } = await loadModule();
    await startSpeechSession({ onTranscript: () => {}, onEnd: () => {}, onError: () => {} });

    const rec = FakeRecognition.last!;
    expect(rec.lang).toBe('id-ID');
    expect(rec.interimResults).toBe(true);
    expect(rec.startCount).toBe(1);
  });

  it('melaporkan teks sementara selagi pemilik toko bicara', async () => {
    const { startSpeechSession } = await loadModule();
    const seen: string[] = [];
    await startSpeechSession({
      onTranscript: (t) => seen.push(t),
      onEnd: () => {},
      onError: () => {},
    });

    const rec = FakeRecognition.last!;
    rec.emit([{ text: 'indomie goreng', final: false }]);
    rec.emit([{ text: 'indomie goreng tiga ribu', final: false }]);

    expect(seen).toEqual(['indomie goreng', 'indomie goreng tiga ribu']);
  });

  it('menyambung sesi yang berhenti karena jeda, dengan spasi di sambungannya', async () => {
    const { startSpeechSession } = await loadModule();
    let latest = '';
    await startSpeechSession({
      onTranscript: (t) => {
        latest = t;
      },
      onEnd: () => {},
      onError: () => {},
    });

    const rec = FakeRecognition.last!;
    rec.emit([{ text: 'Indomie goreng tiga ribu', final: true }]);

    // Pemilik toko berhenti sejenak untuk mengingat barang berikutnya.
    rec.endBySilence();
    expect(rec.startCount).toBe(2); // disambung, bukan diakhiri

    // Sesi baru memulai daftar hasilnya dari nol lagi — begitulah mesin
    // sungguhan berperilaku setelah `start()` dipanggil ulang.
    rec.emit([{ text: 'Aqua lima ribu', final: true }]);

    // Inilah cacat yang dijaga: tanpa spasi hasilnya "tiga ribuAqua" dan
    // server kehilangan batas antar produk.
    expect(latest).toBe('Indomie goreng tiga ribu Aqua lima ribu');
  });

  it('berhenti sungguhan saat pengguna menekan stop, tanpa menyambung lagi', async () => {
    const { startSpeechSession } = await loadModule();
    const ended: string[] = [];
    const session = await startSpeechSession({
      onTranscript: () => {},
      onEnd: (t) => ended.push(t),
      onError: () => {},
    });

    const rec = FakeRecognition.last!;
    rec.emit([{ text: 'Teh Pucuk lima ribu', final: true }]);
    await session.stop();

    expect(ended).toEqual(['Teh Pucuk lima ribu']);
    expect(rec.startCount).toBe(1);
  });

  it('membuang hasil dan tidak memanggil onEnd saat dibatalkan', async () => {
    const { startSpeechSession } = await loadModule();
    const ended: string[] = [];
    const session = await startSpeechSession({
      onTranscript: () => {},
      onEnd: (t) => ended.push(t),
      onError: () => {},
    });

    const rec = FakeRecognition.last!;
    rec.emit([{ text: 'batal saja', final: true }]);
    await session.cancel();
    rec.endBySilence();

    expect(ended).toEqual([]);
    expect(rec.startCount).toBe(1);
  });
});

describe('kegagalan', () => {
  it('izin mikrofon ditolak dilaporkan sebagai denied', async () => {
    const { startSpeechSession } = await loadModule();
    const errors: string[] = [];
    await startSpeechSession({
      onTranscript: () => {},
      onEnd: () => {},
      onError: (c) => errors.push(c),
    });

    FakeRecognition.last!.onerror?.({ error: 'not-allowed' });
    expect(errors).toEqual(['denied']);
  });

  it('hening bukan kegagalan — sesi tetap disambung', async () => {
    const { startSpeechSession } = await loadModule();
    const errors: string[] = [];
    await startSpeechSession({
      onTranscript: () => {},
      onEnd: () => {},
      onError: (c) => errors.push(c),
    });

    const rec = FakeRecognition.last!;
    rec.onerror?.({ error: 'no-speech' });
    rec.endBySilence();

    expect(errors).toEqual([]);
    expect(rec.startCount).toBe(2);
  });
});

/**
 * Sesi yang sudah menyerah harus benar-benar berhenti.
 *
 * Ini bukan kerapian. Begitu `onError` dipancarkan, pemanggil membuang
 * referensi sesinya — jadi recognizer yang menyalakan dirinya sendiri lewat
 * `onend` tidak bisa dimatikan oleh siapa pun lagi sampai aplikasi ditutup.
 * Mikrofon tinggal menyala dan prompt izin muncul berulang.
 */
describe('galat fatal mengakhiri sesi', () => {
  it('izin ditolak tidak menyalakan ulang recognizer', async () => {
    const { startSpeechSession } = await loadModule();
    const errors: string[] = [];
    const ends: string[] = [];
    await startSpeechSession({
      onTranscript: () => {},
      onEnd: (t) => ends.push(t),
      onError: (c) => errors.push(c),
    });

    const rec = FakeRecognition.last!;
    rec.failWith('not-allowed');

    expect(errors).toEqual(['denied']);
    expect(rec.startCount).toBe(1);
    expect(rec.running).toBe(false);
    // Sudah dikabarkan lewat `onError`; mengabarkan lagi lewat `onEnd` akan
    // membuat layar berpindah ke "siap dikirim" untuk sesi yang gagal.
    expect(ends).toEqual([]);
  });

  it('galat jaringan tidak menyalakan ulang recognizer', async () => {
    const { startSpeechSession } = await loadModule();
    const errors: string[] = [];
    await startSpeechSession({
      onTranscript: () => {},
      onEnd: () => {},
      onError: (c) => errors.push(c),
    });

    const rec = FakeRecognition.last!;
    rec.failWith('network');

    expect(errors).toEqual(['network']);
    expect(rec.startCount).toBe(1);
  });

  it('galat dilaporkan sekali saja walau datang beruntun', async () => {
    const { startSpeechSession } = await loadModule();
    const errors: string[] = [];
    await startSpeechSession({
      onTranscript: () => {},
      onEnd: () => {},
      onError: (c) => errors.push(c),
    });

    const rec = FakeRecognition.last!;
    rec.failWith('network');
    rec.failWith('network');

    expect(errors).toEqual(['network']);
  });

  it('hening tetap menyambung sesi — bukan kegagalan', async () => {
    const { startSpeechSession } = await loadModule();
    const errors: string[] = [];
    await startSpeechSession({
      onTranscript: () => {},
      onEnd: () => {},
      onError: (c) => errors.push(c),
    });

    const rec = FakeRecognition.last!;
    rec.failWith('no-speech');

    expect(errors).toEqual([]);
    expect(rec.startCount).toBe(2);
  });

  it('teks yang sudah terkumpul tetap utuh saat sesi gagal di tengah', async () => {
    const { startSpeechSession } = await loadModule();
    const seen: string[] = [];
    await startSpeechSession({
      onTranscript: (t) => seen.push(t),
      onEnd: () => {},
      onError: () => {},
    });

    const rec = FakeRecognition.last!;
    rec.emit([{ text: 'indomie goreng tiga ribu', final: true }]);
    rec.failWith('network');

    expect(seen.at(-1)).toBe('indomie goreng tiga ribu');
  });
});

describe('berhenti atas permintaan pemilik toko', () => {
  it('selalu diakhiri sekali, walau mesin ikut memancarkan `onend`', async () => {
    const { startSpeechSession } = await loadModule();
    const ends: string[] = [];
    const session = await startSpeechSession({
      onTranscript: () => {},
      onEnd: (t) => ends.push(t),
      onError: () => {},
    });

    const rec = FakeRecognition.last!;
    rec.emit([{ text: 'indomie goreng tiga ribu', final: true }]);
    await session.stop();

    // Dua jalur bisa mengakhiri sesi yang sama; bagi layar yang memakainya,
    // dikte yang selesai dua kali berarti satu dikte yang ditimpa dirinya
    // sendiri.
    expect(ends).toEqual(['indomie goreng tiga ribu']);
  });

  it('stop di sela penyambungan sesi tetap dijawab', async () => {
    vi.useFakeTimers();
    const { startSpeechSession } = await loadModule();
    const ends: string[] = [];
    const session = await startSpeechSession({
      onTranscript: () => {},
      onEnd: (t) => ends.push(t),
      onError: () => {},
    });

    const rec = FakeRecognition.last!;
    rec.emit([{ text: 'teh gelas seribu', final: true }]);
    // Mesin sedang berhenti sendiri karena hening. Stop yang jatuh tepat di
    // celah ini tidak dijawab `onend` siapa pun — dan tanpa penjaganya,
    // pewaktu di layar berjalan terus dengan tombol yang terasa mati.
    rec.running = false;
    await session.stop();

    expect(ends).toEqual([]);
    await vi.advanceTimersByTimeAsync(2500);
    expect(ends).toEqual(['teh gelas seribu']);
    vi.useRealTimers();
  });

  it('mengabarkan mikrofonnya padam saat berhenti', async () => {
    const { startSpeechSession } = await loadModule();
    const pulses: boolean[] = [];
    const session = await startSpeechSession({
      onTranscript: () => {},
      onEnd: () => {},
      onError: () => {},
      onPulse: (alive) => pulses.push(alive),
    });

    expect(pulses).toEqual([true]);
    await session.stop();
    expect(pulses.at(-1)).toBe(false);
  });
});
