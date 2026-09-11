import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { calculateDailyPll } from "@/lib/pll";
import type { DailyPllSummary } from "@/lib/pll";
import { startOfDay, endOfDay } from "date-fns";

export function useDailyPll(date: Date = new Date()): DailyPllSummary | undefined {
  const start = useMemo(() => startOfDay(date), [date]);
  const end = useMemo(() => endOfDay(date), [date]);

  const transactions = useLiveQuery(
    async () => {
      const all = await db.transactions
        .where("date")
        .between(start, end, true, true)
        .toArray();
      return all.filter((t) => t.status !== "open");
    },
    [start.getTime(), end.getTime()],
  );

  const items = useLiveQuery(async () => {
    if (!transactions || transactions.length === 0) return [];
    const txIds = transactions.map((t) => t.id!).filter(Boolean);
    return db.transactionItems.where("transactionId").anyOf(txIds).toArray();
  }, [transactions]);

  return useMemo(() => {
    if (!transactions) return undefined;
    return calculateDailyPll(transactions, items ?? []);
  }, [transactions, items]);
}
