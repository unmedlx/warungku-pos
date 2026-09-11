import type { Debt } from './db';

/**
 * Pengelompokan kasbon menurut mendesaknya, bukan menurut abjad.
 *
 * Yang butuh ditindak harus naik ke atas dengan sendirinya. Kasbon tanpa
 * tanggal jatuh tempo tidak pernah dianggap telat — menuduh pelanggan telat
 * atas tenggat yang tidak pernah disepakati justru merusak hubungan yang jadi
 * modal utama warung.
 */
export type DebtUrgency = 'overdue' | 'dueSoon' | 'safe';

/** Berapa hari ke depan yang masih dihitung sebagai "minggu ini". */
export const DUE_SOON_DAYS = 7;

const DAY_MS = 86_400_000;

/** Selisih hari kalender antara dua waktu, mengabaikan jamnya. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

export function debtUrgency(debt: Pick<Debt, 'status' | 'dueDate'>, now: Date): DebtUrgency {
  if (debt.status === 'paid' || !debt.dueDate) return 'safe';
  const days = daysBetween(now, new Date(debt.dueDate));
  if (days < 0) return 'overdue';
  return days <= DUE_SOON_DAYS ? 'dueSoon' : 'safe';
}

/** Berapa hari kasbon ini telat. 0 bila belum telat atau tanpa tenggat. */
export function daysOverdue(debt: Pick<Debt, 'status' | 'dueDate'>, now: Date): number {
  if (debt.status === 'paid' || !debt.dueDate) return 0;
  return Math.max(0, -daysBetween(now, new Date(debt.dueDate)));
}

export interface DebtUrgencyBuckets {
  overdue: Debt[];
  dueSoon: Debt[];
  safe: Debt[];
  totals: { overdue: number; dueSoon: number; safe: number };
}

/**
 * Bagi kasbon yang belum lunas ke tiga keranjang, masing-masing terurut dari
 * yang paling mendesak.
 */
export function bucketDebtsByUrgency(debts: Debt[], now: Date): DebtUrgencyBuckets {
  const buckets: DebtUrgencyBuckets = {
    overdue: [], dueSoon: [], safe: [],
    totals: { overdue: 0, dueSoon: 0, safe: 0 },
  };

  for (const debt of debts) {
    if (debt.status === 'paid') continue;
    const urgency = debtUrgency(debt, now);
    buckets[urgency].push(debt);
    buckets.totals[urgency] += debt.remainingAmount;
  }

  const byDueDate = (a: Debt, b: Debt) => {
    const at = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bt = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return at - bt;
  };
  buckets.overdue.sort(byDueDate);
  buckets.dueSoon.sort(byDueDate);
  buckets.safe.sort(byDueDate);

  return buckets;
}
