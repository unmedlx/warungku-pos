import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Dikte produk, dari sudut pandang layar yang memakainya.
 *
 * Yang diuji di sini adalah satu hal: apa yang dilihat pemilik toko saat
 * mikrofonnya GAGAL. Jalur suksesnya sudah ditutup `speech-recognition.test.ts`;
 * yang tidak pernah diperiksa — dan yang paling sering dilaporkan sebagai
 * "fiturnya tidak jalan" — adalah kegagalan yang berakhir di layar yang persis
 * sama dengan keadaan awal, tanpa satu pun keterangan.
 */

type Handlers = {
  onTranscript: (t: string) => void;
  onEnd: (t: string) => void;
  onError: (c: string) => void;
  onPulse?: (alive: boolean) => void;
};

let handlers: Handlers | null = null;
let cancelCount = 0;
let stopCount = 0;
/** Galat yang dipancarkan SEBELUM `startSpeechSession` selesai, kalau diisi. */
let failDuringStart: string | null = null;
/**
 * Mesin yang tidak pernah menjawab permintaan berhenti.
 *
 * Bukan kasus buatan: `SpeechRecognition.stop()` di sebagian Android
 * menggantung kalau recognizer sudah dibereskan sistem, dan `onEnd` tidak
 * pernah datang. Inilah bentuk kegagalan yang dilaporkan pemilik toko sebagai
 * "tombol stop-nya tidak berfungsi".
 */
let stopHangs = false;

vi.mock('@/lib/speech-recognition', () => ({
  isSpeechRecognitionAvailable: async () => true,
  requestSpeechPermission: async () => true,
  startSpeechSession: async (h: Handlers) => {
    handlers = h;
    // Mesin sungguhan bisa gagal di dalam pembangunan sesi: `recognition.start()`
    // yang melempar seketika, atau plugin Android yang menolak menyalakan
    // recognizer. Galatnya sampai ke pemanggil sebelum sesinya sendiri ada.
    if (failDuringStart) h.onError(failDuringStart);
    return {
      stop: async () => {
        stopCount += 1;
        if (stopHangs) await new Promise(() => {});
      },
      cancel: async () => {
        cancelCount += 1;
      },
    };
  },
}));

const { useSpeechDictation } = await import('@/hooks/use-speech-dictation');

beforeEach(() => {
  handlers = null;
  cancelCount = 0;
  stopCount = 0;
  failDuringStart = null;
  stopHangs = false;
  vi.useRealTimers();
});

/** Nyalakan mikrofon dan tunggu sampai keadaannya mengendap. */
async function startDictation() {
  const hook = renderHook(() => useSpeechDictation(60));
  await waitFor(() => expect(hook.result.current.state).toBe('idle'));
  await act(async () => {
    await hook.result.current.start();
  });
  return hook;
}

describe('kegagalan mikrofon terlihat', () => {
  it('galat jaringan meninggalkan alasan, bukan layar kosong', async () => {
    const hook = await startDictation();

    act(() => handlers!.onError('network'));

    // `state` jatuh ke 'idle' yang identik dengan layar awal — justru karena
    // itu `error` wajib ada, supaya layar punya sesuatu untuk ditampilkan.
    expect(hook.result.current.state).toBe('idle');
    expect(hook.result.current.error).toBe('network');
  });

  it('izin ditolak dilaporkan di dua tempat sekaligus', async () => {
    const hook = await startDictation();

    act(() => handlers!.onError('denied'));

    expect(hook.result.current.state).toBe('denied');
    expect(hook.result.current.error).toBe('denied');
  });

  it('alasan dibersihkan saat dikte diulang', async () => {
    const hook = await startDictation();
    act(() => handlers!.onError('network'));
    expect(hook.result.current.error).toBe('network');

    act(() => hook.result.current.reset());

    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.state).toBe('idle');
  });
});

describe('gagal sebelum sesi sempat ada', () => {
  /**
   * Cacat urutan yang paling menyesatkan di seluruh alur ini.
   *
   * `onError` bisa dipancarkan sebelum `startSpeechSession` selesai. Baris
   * setelah `await` kemudian menimpa kembali apa yang baru dibereskan penangan
   * galat: tombol menyala merah dan pewaktu berjalan, padahal tidak ada yang
   * mendengarkan. Pemilik toko bicara satu menit penuh ke mikrofon mati.
   */
  it('layar tidak pernah bilang "mendengarkan" untuk sesi yang sudah mati', async () => {
    failDuringStart = 'unknown';
    const hook = await startDictation();

    expect(hook.result.current.state).toBe('idle');
    expect(hook.result.current.error).toBe('unknown');
  });

  it('izin ditolak saat start tetap sampai ke layar izin', async () => {
    failDuringStart = 'denied';
    const hook = await startDictation();

    expect(hook.result.current.state).toBe('denied');
  });

  it('sesi yang gagal dilepas, bukan ditinggalkan menyala', async () => {
    failDuringStart = 'unknown';
    await startDictation();

    expect(cancelCount).toBe(1);
  });

  it('mikrofon masih bisa dinyalakan lagi setelah gagal', async () => {
    failDuringStart = 'unknown';
    const hook = await startDictation();

    // Sesi yang gagal tapi masih tersimpan akan membuat `start()` berikutnya
    // keluar lebih awal — mikrofon tidak pernah hidup lagi sampai dialog
    // ditutup dan dibuka ulang.
    failDuringStart = null;
    await act(async () => {
      await hook.result.current.start();
    });

    expect(hook.result.current.state).toBe('listening');
    expect(hook.result.current.error).toBeNull();
  });
});


describe('tombol stop selalu menjawab', () => {
  it('tekanan pertama langsung terlihat di layar', async () => {
    const hook = await startDictation();
    act(() => handlers!.onTranscript('indomie goreng'));

    act(() => void hook.result.current.stop());

    // Berhenti butuh waktu di mesin sungguhan — hasil final Android menyusul
    // belakangan. Yang tidak boleh adalah layar yang tidak berubah sama
    // sekali, karena itulah yang terbaca sebagai tombol rusak.
    await waitFor(() => expect(hook.result.current.stopping).toBe(true));
    expect(hook.result.current.state).toBe('listening');
  });

  it('tekanan kedua tidak menumpuk permintaan berhenti', async () => {
    const hook = await startDictation();

    await act(async () => {
      void hook.result.current.stop();
      void hook.result.current.stop();
      void hook.result.current.stop();
    });

    // Mematikan mesin berkali-kali ikut membuang hasil finalnya.
    expect(stopCount).toBe(1);
  });

  it('mesin yang tidak menjawab tidak menahan layar selamanya', async () => {
    stopHangs = true;
    vi.useFakeTimers();
    const hook = renderHook(() => useSpeechDictation(60));
    await vi.waitFor(() => expect(hook.result.current.state).toBe('idle'));
    await act(async () => {
      await hook.result.current.start();
    });
    act(() => handlers!.onTranscript('indomie goreng dua ribu'));

    act(() => void hook.result.current.stop());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    // Dikte diselesaikan dari sisi ini, dengan teks yang sudah terkumpul —
    // masih bisa disunting, sedangkan layar yang membeku tidak menyisakan apa
    // pun.
    expect(hook.result.current.state).toBe('done');
    expect(hook.result.current.stopping).toBe(false);
    expect(hook.result.current.transcript).toBe('indomie goreng dua ribu');
    // Mikrofon tidak ditinggalkan menyala di belakang layar yang sudah beres.
    expect(cancelCount).toBe(1);
  });

  it('pewaktu berhenti begitu dikte selesai', async () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useSpeechDictation(60));
    await vi.waitFor(() => expect(hook.result.current.state).toBe('idle'));
    await act(async () => {
      await hook.result.current.start();
    });

    await act(async () => {
      await hook.result.current.stop();
    });
    act(() => handlers!.onEnd('teh gelas seribu'));
    const frozen = hook.result.current.elapsedSec;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(hook.result.current.elapsedSec).toBe(frozen);
  });
});

describe('tanda hidup mikrofon', () => {
  it('denyut yang hilang membedakan mik mati dari ruangan yang sepi', async () => {
    const hook = await startDictation();
    expect(hook.result.current.alive).toBe(true);

    act(() => handlers!.onPulse?.(false));
    expect(hook.result.current.alive).toBe(false);

    // Satu kata yang tertangkap membatalkan kecurigaan: hasil lebih dipercaya
    // daripada laporan.
    act(() => handlers!.onTranscript('aqua'));
    expect(hook.result.current.alive).toBe(true);
  });

  it('sunyi dihitung sejak kata terakhir, bukan sejak awal', async () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useSpeechDictation(60));
    await vi.waitFor(() => expect(hook.result.current.state).toBe('idle'));
    await act(async () => {
      await hook.result.current.start();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(hook.result.current.silentSec).toBeGreaterThanOrEqual(4);

    act(() => handlers!.onTranscript('gula pasir'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    // Jeda wajar saat mengambil barang berikutnya tidak boleh menuduh
    // mikrofonnya rusak.
    expect(hook.result.current.silentSec).toBeLessThan(2);
  });
});

describe('dikte yang terputus tidak menghapus pekerjaan', () => {
  it('teks yang sudah terkumpul tetap ada setelah mesin gagal di tengah', async () => {
    const hook = await startDictation();
    act(() => handlers!.onTranscript('indomie goreng modal dua ribu'));

    act(() => handlers!.onError('unknown'));

    // `'idle'` adalah layar awal: kotak teks dan tombol proses belum ada di
    // sana. Kegagalan mesin tidak boleh memakan daftar yang sudah tertangkap.
    expect(hook.result.current.state).toBe('done');
    expect(hook.result.current.transcript).toBe('indomie goreng modal dua ribu');
  });

  it('dikte kosong yang gagal tetap jatuh ke layar awal', async () => {
    const hook = await startDictation();

    act(() => handlers!.onError('unknown'));

    // Tidak ada apa pun untuk ditawarkan, jadi jangan berpura-pura ada.
    expect(hook.result.current.state).toBe('idle');
  });

  it('menyalakan mikrofon lagi melanjutkan daftar, bukan menimpanya', async () => {
    const hook = await startDictation();
    act(() => handlers!.onTranscript('indomie goreng dua ribu'));
    act(() => handlers!.onEnd('indomie goreng dua ribu'));

    await act(async () => {
      await hook.result.current.start();
    });
    act(() => handlers!.onTranscript('aqua botol lima ribu'));

    expect(hook.result.current.transcript).toBe('indomie goreng dua ribu aqua botol lima ribu');
  });

  it('suntingan manual ikut terbawa saat dikte disambung', async () => {
    const hook = await startDictation();
    act(() => handlers!.onEnd('indomie goreng'));
    act(() => hook.result.current.setTranscript('Indomie Goreng modal 2500'));

    await act(async () => {
      await hook.result.current.start();
    });
    act(() => handlers!.onTranscript('teh gelas seribu'));

    expect(hook.result.current.transcript).toBe('Indomie Goreng modal 2500 teh gelas seribu');
  });

  it('"rekam ulang" adalah satu-satunya yang membuang teks', async () => {
    const hook = await startDictation();
    act(() => handlers!.onEnd('indomie goreng dua ribu'));

    act(() => hook.result.current.reset());
    await act(async () => {
      await hook.result.current.start();
    });
    act(() => handlers!.onTranscript('gula pasir'));

    expect(hook.result.current.transcript).toBe('gula pasir');
  });
});
