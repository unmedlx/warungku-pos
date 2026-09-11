import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@/lib/db';

/**
 * Kebijakan chip di layar kasir.
 *
 * Yang diuji di sini bukan pengenalan suaranya, tapi seberapa banyak ruang
 * layar yang direbut hasilnya. Chip yang menumpuk mendorong grid produk keluar
 * layar — padahal grid itu tetap cara utama kasir bekerja, dan suara cuma
 * jalan pintas. Fitur yang menutupi jalan utamanya sendiri bukan bantuan.
 */

let handlers: Record<string, ((...args: never[]) => void) | undefined> = {};
const cancel = vi.fn(async () => {});

vi.mock('@/lib/speech-recognition', () => ({
  isSpeechRecognitionAvailable: async () => true,
  requestSpeechPermission: async () => true,
  startSpeechSession: async (h: Record<string, (...args: never[]) => void>) => {
    handlers = h;
    return { stop: async () => {}, cancel };
  },
}));

let nextId = 1;
const product = (name: string, extra: Partial<Product> = {}): Product => ({
  id: nextId++,
  name,
  sku: name,
  categoryId: 1,
  price: 3500,
  hpp: 3000,
  stock: 50,
  unit: 'pcs',
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: 0,
  deletedAt: null,
  ...extra,
});

const CATALOG = [
  product('Indomie Goreng'),
  product('Indomie Soto'),
  product('Teh Gelas'),
  product('Gula Pasir'),
];

/** Kirim satu potongan ucapan yang sudah final, seperti mesin sungguhan. */
const speak = async (text: string) => {
  await act(async () => {
    handlers.onSegment?.(text as never);
  });
};

async function setup(onAdd: (p: Product, q: number) => boolean = () => true) {
  const { useCartDictation } = await import('@/hooks/use-cart-dictation');
  const search = vi.fn();

  const view = renderHook(() =>
    useCartDictation({ products: CATALOG, onAdd, onFallbackSearch: search }),
  );

  await waitFor(() => expect(view.result.current.available).toBe(true));
  await act(async () => {
    await view.result.current.start();
  });

  return { ...view, search };
}

beforeEach(() => {
  handlers = {};
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

describe('chip kabar tidak menumpuk', () => {
  it('hanya satu kabar terlihat, sebanyak apa pun yang disebut', async () => {
    const { result } = await setup();

    await speak('indomie goreng dua');
    await speak('teh gelas satu');
    await speak('gula pasir tiga');

    const info = result.current.chips.filter((c) => c.kind !== 'unclear');
    expect(info).toHaveLength(1);
    // Yang bertahan adalah yang terbaru — barang yang barusan disebut.
    expect(info[0].product?.name).toBe('Gula Pasir');
  });

  it('kabar padam sendiri tanpa disentuh', async () => {
    const { result } = await setup();

    await speak('indomie goreng dua');
    expect(result.current.chips).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.chips).toHaveLength(0);
  });

  it('barang tetap masuk keranjang walau chipnya sudah padam', async () => {
    const added: string[] = [];
    const { result } = await setup((p, q) => {
      added.push(`${p.name} ×${q}`);
      return true;
    });

    await speak('indomie goreng dua');
    await speak('teh gelas satu');

    // Chip cuma kabar. Yang menentukan tetap isi keranjang.
    expect(added).toEqual(['Indomie Goreng ×2', 'Teh Gelas ×1']);
    expect(result.current.chips.length).toBeLessThanOrEqual(1);
  });
});

describe('chip yang meminta tindakan', () => {
  it('bertahan sampai kasir menjawabnya', async () => {
    const { result } = await setup();

    await speak('indomie dua');
    expect(result.current.chips[0].kind).toBe('unclear');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    // Pertanyaan tidak boleh padam sendiri — kalau hilang, jumlah yang sudah
    // terlanjur disebut kasir ikut hilang tanpa jejak.
    expect(result.current.chips[0].kind).toBe('unclear');
  });

  it('tidak digusur oleh kabar yang datang belakangan', async () => {
    const { result } = await setup();

    await speak('indomie dua');
    await speak('teh gelas satu');

    expect(result.current.chips.some((c) => c.kind === 'unclear')).toBe(true);
  });

  it('setelah dijawab ia jadi kabar biasa dan ikut padam', async () => {
    const added: string[] = [];
    const { result } = await setup((p, q) => {
      added.push(`${p.name} ×${q}`);
      return true;
    });

    await speak('indomie dua');
    const chipId = result.current.chips[0].id;

    await act(async () => {
      result.current.resolveChip(chipId, CATALOG[0]);
    });

    // Jumlah yang tadi disebut ikut terbawa, jadi kasir cukup satu ketukan.
    expect(added).toEqual(['Indomie Goreng ×2']);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current.chips).toHaveLength(0);
  });
});

describe('stok habis', () => {
  it('ditolak dengan kabar yang terlihat, bukan hilang diam-diam', async () => {
    const { result } = await setup(() => false);

    await speak('teh gelas satu');

    expect(result.current.chips[0].kind).toBe('blocked');
    expect(result.current.chips[0].product?.name).toBe('Teh Gelas');
  });
});
