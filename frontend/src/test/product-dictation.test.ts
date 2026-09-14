import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category, Product, Unit } from '@/lib/db';
import type { CatalogHints } from '@/lib/vision-api';

/**
 * Kapan ucapan menjadi kartu produk.
 *
 * Yang diuji adalah aturan KUNCI, bukan pengurai angkanya (itu tugas
 * `spoken-product.test.ts`). Kartu yang terkunci terlalu cepat memotong
 * produk di tengah kalimat; kartu yang tidak pernah terkunci membuat pemilik
 * toko tidak bisa menyimpan apa pun.
 */

type Handlers = {
  onSegment?: (t: string) => void;
  onPartial?: (t: string) => void;
  onEnd: (t: string) => void;
  onError: (c: string) => void;
};

let handlers: Handlers | null = null;

vi.mock('@/lib/speech-recognition', () => ({
  isSpeechRecognitionAvailable: async () => true,
  requestSpeechPermission: async () => true,
  startSpeechSession: async (h: Handlers) => {
    handlers = h;
    return { stop: async () => h.onEnd(''), cancel: async () => {} };
  },
}));

const { useProductDictation, SILENCE_LOCK_MS } = await import('@/hooks/use-product-dictation');

const categories = [{ id: 1, name: 'Umum' }] as unknown as Category[];
const units = [{ id: 1, name: 'pcs' }] as unknown as Unit[];
const products = [] as Product[];
const hints: CatalogHints = { productNames: [], units: ['pcs'], categories: [], businessMode: 'retail' };

async function setup() {
  const view = renderHook(() =>
    useProductDictation({ products, categories, units, hints, sourceLabel: 'Dari ucapan' }),
  );
  await waitFor(() => expect(view.result.current.available).toBe(true));
  await act(async () => {
    await view.result.current.start();
  });
  return view;
}

const segment = async (text: string) => {
  await act(async () => {
    handlers?.onSegment?.(text);
  });
};

beforeEach(() => {
  handlers = null;
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useProductDictation', () => {
  it('produk yang terpotong jeda tetap satu kartu yang sedang disebut', async () => {
    const { result } = await setup();
    await segment('indomie goreng modal dua ribu lima ratus');
    await segment('jual tiga ribu');

    expect(result.current.rows).toHaveLength(0);
    expect(result.current.building).toHaveLength(1);
    expect(result.current.building[0]).toMatchObject({ name: 'Indomie Goreng', hpp: '2500', price: '3000' });
  });

  it('nama produk berikutnya mengunci produk sebelumnya', async () => {
    const { result } = await setup();
    await segment('indomie goreng modal dua ribu lima ratus jual tiga ribu');
    await segment('aqua botol jual lima ribu');

    expect(result.current.rows.map((r) => r.name)).toEqual(['Indomie Goreng']);
    expect(result.current.building.map((r) => r.name)).toEqual(['Aqua Botol']);
  });

  it('hening mengunci produk yang sudah punya harga jual', async () => {
    const { result } = await setup();
    await segment('teh pucuk jual empat ribu');

    await act(async () => {
      vi.advanceTimersByTime(SILENCE_LOCK_MS + 50);
    });

    expect(result.current.rows.map((r) => r.name)).toEqual(['Teh Pucuk']);
    expect(result.current.building).toHaveLength(0);
  });

  it('hening TIDAK mengunci produk yang harga jualnya belum disebut', async () => {
    const { result } = await setup();
    await segment('gula pasir modal tiga belas ribu');

    await act(async () => {
      vi.advanceTimersByTime(SILENCE_LOCK_MS + 50);
    });

    expect(result.current.rows).toHaveLength(0);
    expect(result.current.building).toHaveLength(1);
  });

  it('berhenti mengunci produk terakhir walaupun belum lengkap', async () => {
    const { result } = await setup();
    await segment('gula pasir modal tiga belas ribu');
    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.listening).toBe(false);
    expect(result.current.rows.map((r) => r.name)).toEqual(['Gula Pasir']);
  });

  it('kartu terkunci dilengkapi kolom kosongnya, tanpa menimpa suntingan', async () => {
    const { result } = await setup();
    await segment('gula pasir jual empat belas ribu');
    await act(async () => {
      vi.advanceTimersByTime(SILENCE_LOCK_MS + 50);
    });
    act(() => {
      result.current.setRows([{ ...result.current.rows[0], price: '14500' }]);
    });

    await segment('modal tiga belas ribu');

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]).toMatchObject({ price: '14500', hpp: '13000' });
  });

  it('mikrofon yang dinyalakan lagi melanjutkan daftar, bukan mengulang', async () => {
    const { result } = await setup();
    await segment('teh pucuk jual empat ribu');
    await act(async () => {
      await result.current.stop();
    });
    await act(async () => {
      await result.current.start();
    });
    await segment('aqua botol jual lima ribu');
    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.rows.map((r) => r.name)).toEqual(['Teh Pucuk', 'Aqua Botol']);
    expect(new Set(result.current.rows.map((r) => r.key)).size).toBe(2);
  });
});
