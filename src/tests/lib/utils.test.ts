/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate, daysUntil } from "@/lib/utils";

describe("cn", () => {
  it("merges class names correctly", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("a", ["b", "c"])).toBe("a b c");
    expect(cn(["a"], "b", { c: true })).toBe("a b c");
  });

  it("handles falsy values", () => {
    expect(cn("a", null, undefined, false, "b")).toBe("a b");
  });

  it("handles conditional objects", () => {
    const cond = true;
    expect(cn("base", { active: cond, disabled: !cond })).toBe("base active");
  });

  it("dedupes conflicting tailwind classes", () => {
    // tailwind-merge resolves conflicts; ensure merge works
    expect(cn("p-4 p-2")).toBe("p-2");
    expect(cn("text-red-500 text-blue-500")).toBe("text-blue-500");
  });
});

describe("formatCurrency", () => {
  it("formats positive amounts", () => {
    expect(formatCurrency(1234)).toBe("¥1,234");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("¥0");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-500)).toContain("-");
  });

  it("uses compact format for large amounts when requested", () => {
    expect(formatCurrency(12345, { compact: true })).toBe("¥1.2万");
    expect(formatCurrency(1234567, { compact: true })).toBe("¥123.5万");
    expect(formatCurrency(10000, { compact: true })).toBe("¥1.0万");
    expect(formatCurrency(9999, { compact: true })).toBe("¥9,999"); // below threshold
  });

  it("does not use compact format by default", () => {
    expect(formatCurrency(12345)).toBe("¥12,345");
  });

  it("handles very large amounts", () => {
    const result = formatCurrency(123456789012);
    expect(result).toBe("¥123,456,789,012");
  });
});

describe("formatDate", () => {
  const fixedNow = new Date("2025-06-29T10:30:00");

  it("formats short date", () => {
    const d = new Date("2025-06-15");
    expect(formatDate(d, "short")).toBe("2025/6/15");
  });

  it("formats full date with weekday", () => {
    const d = new Date("2025-06-15");
    const result = formatDate(d, "full");
    expect(result).toContain("2025");
    expect(result).toContain("6");
    expect(result).toContain("15");
  });

  it("formats month-day", () => {
    const d = new Date("2025-06-15");
    expect(formatDate(d, "month-day")).toBe("6月15日");
  });

  it("accepts string date", () => {
    expect(formatDate("2025-06-15", "short")).toBe("2025/6/15");
  });

  it("handles invalid date gracefully", () => {
    // Invalid Date becomes NaN; toLocaleDateString yields "Invalid Date" in some envs,
    // but we rely on built-in Date behavior. Ensure no throw.
    const invalid = new Date("invalid");
    expect(() => formatDate(invalid, "short")).not.toThrow();
  });

  it("defaults to short when fmt unspecified", () => {
    const d = new Date("2025-06-15");
    expect(formatDate(d)).toBe("2025/6/15");
  });
});

describe("daysUntil", () => {
  it("returns positive for future date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(daysUntil(future)).toBe(5);
  });

  it("returns negative for past date", () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    expect(daysUntil(past)).toBe(-3);
  });

  it("returns 0 for today", () => {
    const today = new Date();
    expect(daysUntil(today)).toBe(0);
  });

  it("accepts string date in YYYY-MM-DD format (local)", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    // Format as local date string (avoid timezone shift)
    const localDate = future.getFullYear() + "-" + String(future.getMonth()+1).padStart(2,'0') + "-" + String(future.getDate()).padStart(2,'0');
    expect(daysUntil(localDate)).toBe(10);
  });

  it("strips time component correctly", () => {
    // Regardless of current time, tomorrow's date should return 1
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(daysUntil(tomorrow)).toBe(1);
  });

  it("handles timezone offset consistently", () => {
    // Dates are local; ensure calculation uses local midnight
    const today = new Date();
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    expect(daysUntil(midnight)).toBe(0);
  });
});
