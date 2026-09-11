import { describe, it, expect } from 'vitest';
import type { Debt } from '@/lib/db';
import { bucketDebtsByUrgency, daysOverdue, debtUrgency } from '@/lib/debt-urgency';

const NOW = new Date('2026-08-19T10:00:00');

function debt(over: Partial<Debt>): Debt {
  return {
    transactionId: 1,
    customerId: 1,
    customerName: 'Bu Sari',
    originalAmount: 100_000,
    remainingAmount: 100_000,
    status: 'unpaid',
    createdAt: new Date('2026-08-01'),
    settledAt: null,
    ...over,
  };
}

describe('debtUrgency', () => {
  it('menganggap kasbon tanpa tenggat selalu aman', () => {
    expect(debtUrgency(debt({}), NOW)).toBe('safe');
    expect(debtUrgency(debt({ dueDate: null }), NOW)).toBe('safe');
  });

  it('kasbon lunas tidak pernah mendesak meski tenggatnya lewat', () => {
    expect(debtUrgency(debt({ status: 'paid', dueDate: new Date('2026-01-01') }), NOW)).toBe('safe');
  });

  it('menandai telat hanya setelah harinya lewat, bukan pada hari-H', () => {
    expect(debtUrgency(debt({ dueDate: new Date('2026-08-19T00:00:00') }), NOW)).toBe('dueSoon');
    expect(debtUrgency(debt({ dueDate: new Date('2026-08-18T23:00:00') }), NOW)).toBe('overdue');
  });

  it('memakai batas tujuh hari untuk "minggu ini"', () => {
    expect(debtUrgency(debt({ dueDate: new Date('2026-08-26') }), NOW)).toBe('dueSoon');
    expect(debtUrgency(debt({ dueDate: new Date('2026-08-27') }), NOW)).toBe('safe');
  });

  it('mengabaikan jam saat menghitung selisih hari', () => {
    // Jatuh tempo hari ini pukul 00:00 sementara sekarang pukul 10:00 —
    // tetap belum telat, karena harinya belum lewat.
    expect(daysOverdue(debt({ dueDate: new Date('2026-08-19T00:00:00') }), NOW)).toBe(0);
    expect(daysOverdue(debt({ dueDate: new Date('2026-08-15T23:59:00') }), NOW)).toBe(4);
  });
});

describe('bucketDebtsByUrgency', () => {
  it('menjumlahkan sisa per keranjang dan melewatkan yang lunas', () => {
    const result = bucketDebtsByUrgency([
      debt({ id: 1, dueDate: new Date('2026-08-15'), remainingAmount: 340_000 }),
      debt({ id: 2, dueDate: new Date('2026-08-22'), remainingAmount: 150_000 }),
      debt({ id: 3, remainingAmount: 500_000 }),
      debt({ id: 4, status: 'paid', remainingAmount: 0, dueDate: new Date('2026-01-01') }),
    ], NOW);

    expect(result.overdue.map((d) => d.id)).toEqual([1]);
    expect(result.dueSoon.map((d) => d.id)).toEqual([2]);
    expect(result.safe.map((d) => d.id)).toEqual([3]);
    expect(result.totals).toEqual({ overdue: 340_000, dueSoon: 150_000, safe: 500_000 });
  });

  it('mengurutkan tiap keranjang dari tenggat terdekat', () => {
    const result = bucketDebtsByUrgency([
      debt({ id: 1, dueDate: new Date('2026-08-10') }),
      debt({ id: 2, dueDate: new Date('2026-08-01') }),
      debt({ id: 3, dueDate: new Date('2026-08-17') }),
    ], NOW);
    expect(result.overdue.map((d) => d.id)).toEqual([2, 1, 3]);
  });

  it('menaruh kasbon tanpa tenggat di belakang yang bertenggat', () => {
    const result = bucketDebtsByUrgency([
      debt({ id: 1 }),
      debt({ id: 2, dueDate: new Date('2026-09-30') }),
    ], NOW);
    expect(result.safe.map((d) => d.id)).toEqual([2, 1]);
  });
});
