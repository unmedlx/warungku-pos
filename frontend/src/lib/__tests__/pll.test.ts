import { describe, it, expect } from "vitest";
import { calculateDailyPll } from "@/lib/pll";
import type { Transaction, TransactionItemRecord } from "@/lib/db";

const baseTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  subtotal: 0,
  discountType: null,
  discountValue: 0,
  discountAmount: 0,
  total: 0,
  paymentMethodId: 1,
  paymentAmount: 0,
  change: 0,
  profit: 0,
  date: new Date("2025-07-30T10:00:00"),
  receiptNumber: "TX-001",
  status: "completed",
  ...overrides,
});

const baseItem = (overrides: Partial<TransactionItemRecord> = {}): TransactionItemRecord => ({
  id: 1,
  transactionId: 1,
  productId: 1,
  productName: "Kopi",
  quantity: 1,
  price: 15000,
  hpp: 8000,
  discountType: null,
  discountValue: 0,
  discountAmount: 0,
  subtotal: 15000,
  ...overrides,
});

describe("calculateDailyPll", () => {
  it("returns zero values when no transactions", () => {
    const result = calculateDailyPll([], []);
    expect(result.revenue).toBe(0);
    expect(result.grossProfit).toBe(0);
    expect(result.transactionCount).toBe(0);
    expect(result.topProducts).toEqual([]);
  });

  it("calculates gross profit and margin correctly", () => {
    const tx = baseTx({ id: 1, subtotal: 15000, total: 15000, profit: 7000 });
    const item = baseItem({ productId: 1, quantity: 1, price: 15000, hpp: 8000, subtotal: 15000 });
    const result = calculateDailyPll([tx], [item]);

    expect(result.revenue).toBe(15000);
    expect(result.totalHpp).toBe(8000);
    expect(result.grossProfit).toBe(7000);
    expect(result.grossMarginPercent).toBeCloseTo(46.67, 1);
    expect(result.transactionCount).toBe(1);
  });

  it("ignores open transactions", () => {
    const openTx = baseTx({ id: 1, status: "open", subtotal: 15000, total: 15000, profit: 7000 });
    const item = baseItem({ transactionId: 1, productId: 1, quantity: 1, price: 15000, hpp: 8000, subtotal: 15000 });
    const result = calculateDailyPll([openTx], [item]);

    expect(result.transactionCount).toBe(0);
    expect(result.grossProfit).toBe(0);
  });

  it("applies discounts and aggregates top products", () => {
    const tx1 = baseTx({ id: 1, subtotal: 30000, discountAmount: 5000, total: 25000, profit: 9000 });
    const tx2 = baseTx({ id: 2, subtotal: 22000, total: 22000, profit: 12000 });

    const item1 = baseItem({ transactionId: 1, productId: 1, productName: "Kopi", quantity: 2, price: 15000, hpp: 8000, discountAmount: 5000, subtotal: 25000 });
    const item2 = baseItem({ transactionId: 2, productId: 2, productName: "Nasi", quantity: 1, price: 22000, hpp: 10000, subtotal: 22000 });

    const result = calculateDailyPll([tx1, tx2], [item1, item2]);

    expect(result.revenue).toBe(47000);
    expect(result.totalDiscount).toBe(5000);
    expect(result.totalHpp).toBe(26000);
    expect(result.grossProfit).toBe(21000);
    expect(result.topProducts).toHaveLength(2);
    expect(result.topProducts[0].productId).toBe(1); // Kopi, qty 2
    expect(result.topProducts[0].quantity).toBe(2);
  });

  it("handles missing hpp gracefully", () => {
    const tx = baseTx({ id: 1, subtotal: 15000, total: 15000, profit: 15000 });
    const item = baseItem({ productId: 1, quantity: 1, price: 15000, hpp: undefined as unknown as number, subtotal: 15000 });
    const result = calculateDailyPll([tx], [item]);

    expect(result.totalHpp).toBe(0);
    expect(result.grossProfit).toBe(15000);
  });
});
