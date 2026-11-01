import { describe, it, expect } from "vitest";
import {
  computeMatterFinanceStats,
  revenueWindowStart,
  buildMonthlyRevenueBuckets,
  monthStartOf,
  yearStartOf
} from "@/server/finance/finance-stats-lib";

const entry = (type: string, amount: number, occurredAt = "2026-06-15T00:00:00Z") => ({
  type,
  amount,
  occurredAt: new Date(occurredAt)
});

describe("computeMatterFinanceStats", () => {
  it("rỗng → toàn 0", () => {
    expect(computeMatterFinanceStats({ billings: [], entries: [], issuedInvoices: [] })).toEqual({
      contractAmount: 0,
      receivable: 0,
      received: 0,
      refund: 0,
      cost: 0,
      commission: 0,
      invoiced: 0
    });
  });

  it("cộng theo type + contract + invoiced", () => {
    const stats = computeMatterFinanceStats({
      billings: [{ contractAmount: 100 }, { contractAmount: 50 }],
      entries: [
        entry("RECEIVABLE", 30),
        entry("RECEIVED", 70),
        entry("REFUND", -5),
        entry("COST", 20),
        entry("COMMISSION", 10),
        entry("RECEIVED", 5)
      ],
      issuedInvoices: [{ amount: 40 }, { amount: 15 }]
    });
    expect(stats).toEqual({
      contractAmount: 150,
      receivable: 30,
      received: 75,
      refund: -5,
      cost: 20,
      commission: 10,
      invoiced: 55
    });
  });

  it("ép Decimal-like (string) qua Number", () => {
    const stats = computeMatterFinanceStats({
      billings: [{ contractAmount: "100.5" as never }],
      entries: [entry("RECEIVED", "70.25" as never)],
      issuedInvoices: [{ amount: "9.75" as never }]
    });
    expect(stats.contractAmount).toBe(100.5);
    expect(stats.received).toBe(70.25);
    expect(stats.invoiced).toBe(9.75);
  });
});

describe("revenueWindowStart", () => {
  it("lùi (months-1) tháng, neo ngày mùng 1", () => {
    expect(revenueWindowStart(new Date(2026, 5, 15), 6)).toEqual(new Date(2026, 0, 1));
  });

  it("qua năm trước", () => {
    expect(revenueWindowStart(new Date(2026, 1, 20), 6)).toEqual(new Date(2025, 8, 1));
  });

  it("months=1 → tháng hiện tại mùng 1", () => {
    expect(revenueWindowStart(new Date(2026, 7, 9), 1)).toEqual(new Date(2026, 7, 1));
  });
});

describe("buildMonthlyRevenueBuckets", () => {
  const start = new Date(2026, 0, 1); // T1/2026

  it("sinh đúng months bucket, label Tháng x", () => {
    const buckets = buildMonthlyRevenueBuckets(start, 3, []);
    expect(buckets.map((b) => b.month)).toEqual(["Tháng 1", "Tháng 2", "Tháng 3"]);
    expect(buckets.every((b) => b.received === 0 && b.receivable === 0)).toBe(true);
  });

  it("phân bổ entry đúng tháng", () => {
    const buckets = buildMonthlyRevenueBuckets(start, 3, [
      entry("RECEIVED", 100, "2026-01-10T00:00:00Z"),
      entry("RECEIVABLE", 40, "2026-03-20T00:00:00Z"),
      entry("RECEIVED", 999, "2026-05-01T00:00:00Z") // ngoài cửa sổ
    ]);
    expect(buckets[0]).toEqual({ month: "Tháng 1", received: 100, receivable: 0 });
    expect(buckets[2].receivable).toBe(40);
    expect(buckets.reduce((s, b) => s + b.received, 0)).toBe(100); // entry ngoài bị bỏ
  });

  it("entry trước cửa sổ bị bỏ", () => {
    const buckets = buildMonthlyRevenueBuckets(start, 2, [
      entry("RECEIVED", 10, "2025-11-30T00:00:00Z")
    ]);
    expect(buckets.every((b) => b.received === 0)).toBe(true);
  });

  it("qua năm trong cùng cửa sổ (idx tính theo tháng tuyệt đối)", () => {
    // Cửa sổ 11/2025 → 02/2026: bucket[0]=T11, [1]=T12, [2]=T1/2026, [3]=T2
    const buckets = buildMonthlyRevenueBuckets(new Date(2025, 10, 1), 4, [
      entry("RECEIVED", 5, "2026-01-05T00:00:00Z")
    ]);
    expect(buckets.map((b) => b.month)).toEqual(["Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2"]);
    expect(buckets[2]).toEqual({ month: "Tháng 1", received: 5, receivable: 0 });
  });

  it("ép Decimal-like sang number", () => {
    const buckets = buildMonthlyRevenueBuckets(start, 1, [entry("RECEIVED", "12.5" as never, "2026-01-11T00:00:00Z")]);
    expect(buckets[0].received).toBe(12.5);
  });
});

describe("monthStartOf / yearStartOf", () => {
  it("monthStartOf: về ngày 1, 00:00", () => {
    const d = monthStartOf(new Date(2026, 6, 15, 13, 30, 5));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
  });

  it("yearStartOf: mùng 1 tháng 1", () => {
    const y = yearStartOf(new Date(2026, 6, 15));
    expect(y).toEqual(new Date(2026, 0, 1));
  });
});
