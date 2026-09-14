import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';

// Ikon SVG `?react` tidak ikut dirakit di jsdom; bentuknya tidak diuji di sini.
vi.mock('@/components/icons', () => {
  const Icon = () => null;
  return Object.fromEntries(
    ['AlertTriangle', 'ArrowLeft', 'Loader2', 'Mic', 'MicOff', 'Minus', 'Package', 'Plus', 'Search', 'ShoppingCart', 'X'].map((n) => [n, Icon]),
  );
});
import VoiceCartPage from '@/components/cashier/VoiceCartPage';
import type { CartItem } from '@/components/cashier/CartPanel';
import type { CartChip, UseCartDictation } from '@/hooks/use-cart-dictation';
import type { Product } from '@/lib/db';

/**
 * Halaman Keranjang Suara harus menjawab satu pertanyaan kasir dengan sekali
 * lirik: barang apa saja yang sudah masuk, dan berapa jumlahnya.
 */

const product = (id: number, name: string, price: number): Product => ({
  id, name, sku: name, categoryId: 1, price, hpp: 0, stock: 99, unit: 'pcs',
  createdAt: new Date(), updatedAt: new Date(), isDeleted: 0, deletedAt: null,
});

const kopi = product(1, 'Kopi Susu', 18000);
const roti = product(2, 'Roti Bakar', 15000);
const item = (p: Product, qty: number): CartItem => ({ product: p, qty, discountType: null, discountValue: 0, fromVoice: true });

function setup(chips: CartChip[]) {
  const dictation = {
    available: true, listening: true, starting: false, denied: false, unsupported: false, error: null,
    liveText: '', chips, start: vi.fn(), stop: vi.fn(), toggle: vi.fn(), resolveChip: vi.fn(), dismissChip: vi.fn(),
  } satisfies UseCartDictation;
  const cart = [item(kopi, 3), item(roti, 1)];
  const props = {
    onUpdateQty: vi.fn(), onRemove: vi.fn(), onClear: vi.fn(), onClose: vi.fn(), onPay: vi.fn(), onSearchManual: vi.fn(),
  };
  render(
    <VoiceCartPage
      dictation={dictation}
      cart={cart}
      total={69000}
      rp={(n) => `Rp ${n}`}
      unitPriceOf={(i) => i.product.price}
      subtotalOf={(i) => i.product.price * i.qty}
      {...props}
    />,
  );
  return { dictation, props };
}

describe('VoiceCartPage', () => {
  it('menampilkan tiap barang dengan qty dan subtotalnya', () => {
    setup([]);
    expect(screen.getByText('Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Rp 54000')).toBeTruthy();
    expect(screen.getByText('Rp 15000')).toBeTruthy();
  });

  it('barang yang barusan masuk disorot dan naik ke atas', () => {
    setup([{ id: 'c1', kind: 'added', heard: 'kopi susu dua', qty: 2, product: kopi }]);
    const names = screen.getAllByText(/Kopi Susu|Roti Bakar/).map((n) => n.textContent);
    expect(names[0]).toBe('Kopi Susu');
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('ucapan ragu tampil di "perlu dicek" dan bisa dijawab sekali ketuk', () => {
    const { dictation } = setup([{ id: 'c2', kind: 'unclear', heard: 'roti dua', qty: 2, candidates: [roti] }]);
    fireEvent.click(screen.getByRole('button', { name: /Roti Bakar/ }));
    expect(dictation.resolveChip).toHaveBeenCalledWith('c2', roti);
  });

  it('qty 1 dikurangi berarti hapus baris', () => {
    const { props } = setup([]);
    const rotiRow = screen.getByText('Roti Bakar').closest('div.relative') as HTMLElement;
    fireEvent.click(rotiRow.querySelector('button')!);
    expect(props.onRemove).toHaveBeenCalledWith(expect.objectContaining({ product: roti }));
  });
});
