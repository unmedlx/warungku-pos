import { describe, it, expect } from 'vitest';
import type { Transaction } from '@/lib/db';
import { deriveTableSlots, tableLabel } from '@/lib/tables';

const NOW = new Date('2026-08-19T12:00:00Z').getTime();

function bill(over: Partial<Transaction>): Transaction {
  return {
    subtotal: 0,
    discountType: null,
    discountValue: 0,
    discountAmount: 0,
    total: 0,
    paymentMethodId: 0,
    paymentAmount: 0,
    change: 0,
    profit: 0,
    date: new Date(NOW),
    receiptNumber: 'TX1',
    status: 'open',
    ...over,
  };
}

describe('tableLabel', () => {
  it('memberi nomor dua digit', () => {
    expect(tableLabel(0)).toBe('01');
    expect(tableLabel(11)).toBe('12');
  });
});

describe('deriveTableSlots', () => {
  it('menghasilkan daftar kosong bila jumlah meja belum diatur', () => {
    expect(deriveTableSlots([], 0, NOW)).toEqual([]);
  });

  it('menandai meja tanpa bill sebagai kosong', () => {
    const slots = deriveTableSlots([], 3, NOW);
    expect(slots).toHaveLength(3);
    expect(slots.every((slot) => slot.occupied === undefined)).toBe(true);
  });

  it('menghitung umur bill dalam menit dari openedAt', () => {
    const slots = deriveTableSlots(
      [bill({ tableNumber: '02', total: 78000, openedAt: new Date(NOW - 24 * 60_000) })],
      3,
      NOW,
    );
    expect(slots[1].occupied).toEqual({ total: 78000, minutes: 24, requested: false });
  });

  it('jatuh ke `date` bila openedAt tidak ada', () => {
    const slots = deriveTableSlots(
      [bill({ tableNumber: '01', total: 5000, date: new Date(NOW - 10 * 60_000) })],
      1,
      NOW,
    );
    expect(slots[0].occupied?.minutes).toBe(10);
  });

  it('menjumlahkan nominal dan mengambil umur terlama saat satu meja punya beberapa bill', () => {
    const slots = deriveTableSlots(
      [
        bill({ tableNumber: '01', total: 30000, openedAt: new Date(NOW - 5 * 60_000) }),
        bill({ tableNumber: '01', total: 20000, openedAt: new Date(NOW - 41 * 60_000) }),
      ],
      1,
      NOW,
    );
    expect(slots[0].occupied).toEqual({ total: 50000, minutes: 41, requested: false });
  });

  it('cukup satu bill yang minta bill untuk menandai mejanya', () => {
    const slots = deriveTableSlots(
      [
        bill({ tableNumber: '01', total: 30000, openedAt: new Date(NOW) }),
        bill({ tableNumber: '01', total: 20000, openedAt: new Date(NOW), billRequestedAt: new Date(NOW) }),
      ],
      1,
      NOW,
    );
    expect(slots[0].occupied?.requested).toBe(true);
  });

  it('mengabaikan bill tanpa nomor meja', () => {
    const slots = deriveTableSlots(
      [bill({ total: 9000 }), bill({ tableNumber: '   ', total: 9000 })],
      2,
      NOW,
    );
    expect(slots.every((slot) => slot.occupied === undefined)).toBe(true);
  });

  it('mengabaikan bill yang nomor mejanya di luar jumlah meja', () => {
    const slots = deriveTableSlots([bill({ tableNumber: '09', total: 9000 })], 3, NOW);
    expect(slots).toHaveLength(3);
    expect(slots.every((slot) => slot.occupied === undefined)).toBe(true);
  });

  it('tidak menghasilkan menit negatif untuk bill bertanggal masa depan', () => {
    const slots = deriveTableSlots(
      [bill({ tableNumber: '01', total: 1000, openedAt: new Date(NOW + 5 * 60_000) })],
      1,
      NOW,
    );
    expect(slots[0].occupied?.minutes).toBe(0);
  });
});
