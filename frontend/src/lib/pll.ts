import type { Transaction, TransactionItemRecord } from "@/lib/db";

export interface DailyPllSummary {
  revenue: number;
  totalHpp: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalSales: number;
  totalDiscount: number;
  transactionCount: number;
  topProducts: TopProductSummary[];
}

export interface TopProductSummary {
  productId: number;
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export function calculateDailyPll(
  transactions: Transaction[],
  items: TransactionItemRecord[],
): DailyPllSummary {
  const completed = transactions.filter((t) => t.status !== "open");

  // `t.total` is the final amount due after all discounts = net sales.
  const netSales = completed.reduce((sum, t) => sum + t.total, 0);
  const totalDiscount = completed.reduce((sum, t) => sum + t.discountAmount, 0);
  const totalHpp = items.reduce(
    (sum, item) => sum + (item.hpp || 0) * (item.quantity || 0),
    0,
  );

  // Prefer the stored profit value; it already accounts for item and transaction discounts.
  const storedProfit = completed.reduce((sum, t) => sum + (t.profit || 0), 0);
  const grossProfit = storedProfit;
  const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  const productMap = new Map<number, TopProductSummary>();

  for (const item of items) {
    const current = productMap.get(item.productId);
    const itemRevenue = (item.price || 0) * (item.quantity || 0) - (item.discountAmount || 0);
    const itemProfit = itemRevenue - (item.hpp || 0) * (item.quantity || 0);

    if (current) {
      current.quantity += item.quantity || 0;
      current.revenue += itemRevenue;
      current.profit += itemProfit;
    } else {
      productMap.set(item.productId, {
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity || 0,
        revenue: itemRevenue,
        profit: itemProfit,
      });
    }
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    revenue: netSales,
    totalHpp,
    grossProfit,
    grossMarginPercent,
    totalSales: completed.reduce((sum, t) => sum + t.total, 0),
    totalDiscount,
    transactionCount: completed.length,
    topProducts,
  };
}
