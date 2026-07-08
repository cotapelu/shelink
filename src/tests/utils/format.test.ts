import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPhone,
  truncate,
  capitalize,
  capitalizeWords,
  slugify,
  generateInitials,
  bytesToSize
} from "@/lib/utils/format";

describe("formatCurrency", () => {
  it("formats VND correctly", () => {
    expect(formatCurrency(1234567)).toBe("1.234.567 ₫");
    expect(formatCurrency(0)).toBe("0 ₫");
  });

  it("format with USD", () => {
    expect(formatCurrency(1234.56, "USD")).toContain("$");
  });
});

describe("formatNumber", () => {
  it("formats with default decimals", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });

  it("formats with decimals", () => {
    expect(formatNumber(1234.567, 2)).toBe("1.234,57");
  });
});

describe("formatPercent", () => {
  it("formats percent correctly", () => {
    // value=15 means 15%, so 0.15 → formatted as 15% (with comma decimal for vi-VN)
    expect(formatPercent(15)).toBe("15,0%");
    expect(formatPercent(100)).toBe("100,0%");
  });
});

describe("formatPhone", () => {
  it("formats 10-digit Vietnamese phone", () => {
    expect(formatPhone("0912345678")).toBe("+84 912 345 678");
  });

  it("formats 11-digit with 84 prefix", () => {
    expect(formatPhone("84912345678")).toBe("+84 912 345 678");
  });

  it("returns original for invalid length", () => {
    expect(formatPhone("123")).toBe("123");
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    expect(truncate("Hello World", 5)).toBe("Hello...");
  });

  it("returns original if shorter", () => {
    expect(truncate("Hi", 10)).toBe("Hi");
  });
});

describe("capitalize", () => {
  it("capitalizes first letter, lowercases rest", () => {
    expect(capitalize("hELLO")).toBe("Hello");
  });
});

describe("capitalizeWords", () => {
  it("capitalizes each word", () => {
    expect(capitalizeWords("john doe")).toBe("John Doe");
  });
});

describe("slugify", () => {
  it("creates URL-safe slug", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  it("removes diacritics", () => {
    expect(slugify("São Paulo")).toBe("sao-paulo");
  });
});

describe("generateInitials", () => {
  it("generates initials from full name", () => {
    expect(generateInitials("John Doe")).toBe("JD");
  });

  it("handles single word", () => {
    expect(generateInitials("Alice")).toBe("A");
  });
});

describe("bytesToSize", () => {
  it("converts bytes correctly", () => {
    expect(bytesToSize(1024)).toBe("1.00 KB");
    expect(bytesToSize(1048576)).toBe("1.00 MB");
    expect(bytesToSize(0)).toBe("0 Bytes");
  });
});
