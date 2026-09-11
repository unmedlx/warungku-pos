import type { Transaction } from './db';
import type { TableSlot } from '@/components/jokoui/table-grid';

/**
 * Denah meja restoran diturunkan dari bill yang masih terbuka.
 *
 * Meja sengaja bukan entitas database: kalau statusnya disimpan sendiri, ia bisa
 * melenceng dari kenyataan transaksi — meja tertulis "terisi" padahal billnya
 * sudah dibayar. Dengan diturunkan, hal itu mustahil terjadi.
 */

/** Penomoran meja: 1 → "01". Nomor inilah yang tersimpan di `Transaction.tableNumber`. */
export function tableLabel(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function deriveTableSlots(
  openBills: Transaction[] | undefined,
  tableCount: number,
  now: number,
): TableSlot[] {
  if (tableCount <= 0) return [];

  const byNumber = new Map<string, { total: number; minutes: number; requested: boolean }>();

  for (const bill of openBills ?? []) {
    const key = (bill.tableNumber ?? '').trim();
    if (key === '') continue;

    const openedAt = bill.openedAt ?? bill.date;
    const minutes = Math.max(0, Math.round((now - new Date(openedAt).getTime()) / 60000));
    const requested = !!bill.billRequestedAt;
    const existing = byNumber.get(key);

    // Satu meja bisa punya lebih dari satu bill terbuka. Nominalnya dijumlahkan,
    // umurnya diambil yang paling lama, dan satu bill yang minta bill sudah
    // cukup menandai mejanya.
    byNumber.set(key, existing
      ? {
          total: existing.total + bill.total,
          minutes: Math.max(existing.minutes, minutes),
          requested: existing.requested || requested,
        }
      : { total: bill.total, minutes, requested });
  }

  return Array.from({ length: tableCount }, (_, i) => {
    const number = tableLabel(i);
    return { number, occupied: byNumber.get(number) };
  });
}
