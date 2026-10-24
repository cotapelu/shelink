/**
 * Unit test cho hàm thuần tính tiền báo giá (DATA-MODEL §4.28 quyết định #16).
 */

import { describe, it, expect } from "vitest";
import { computeQuotePricing, lineAmount } from "./pricing";

describe("lineAmount", () => {
  it("multiplies quantity and unit price with 2-decimal rounding", () => {
    expect(lineAmount(3, 1500)).toBe(4500);
    expect(lineAmount(1.15, 100.005)).toBe(115.01);
    expect(lineAmount(0, 100)).toBe(0);
  });
});

describe("computeQuotePricing", () => {
  it("sums item amounts into subtotal", () => {
    const r = computeQuotePricing({
      items: [
        { quantity: 2, unitPrice: 1000 },
        { quantity: 1, unitPrice: 500.5 }
      ],
      discountPercent: 0,
      taxPercent: 0
    });
    expect(r.subtotal).toBe(2500.5);
    expect(r.total).toBe(2500.5);
    expect(r.taxAmount).toBe(0);
  });

  it("applies discount then tax on the discounted amount", () => {
    const r = computeQuotePricing({
      items: [{ quantity: 1, unitPrice: 1000, amount: 1000 }],
      discountPercent: 10,
      taxPercent: 10
    });
    expect(r.subtotal).toBe(1000);
    expect(r.taxAmount).toBe(90);
    expect(r.total).toBe(990); // thuế tính trên (1000 - 10%) = 900
  });

  it("clamps percent inputs to 0..100 and treats NaN as 0", () => {
    const r = computeQuotePricing({
      items: [{ quantity: 1, unitPrice: 200 }],
      discountPercent: 150,
      taxPercent: Number.NaN
    });
    expect(r.discountPercent).toBe(100);
    expect(r.taxPercent).toBe(0);
    expect(r.total).toBe(0);
  });

  it("prefers explicit amount over quantity×unitPrice", () => {
    const r = computeQuotePricing({
      items: [{ quantity: 5, unitPrice: 10, amount: 20 }],
      discountPercent: 0,
      taxPercent: 0
    });
    expect(r.subtotal).toBe(20);
  });
});
