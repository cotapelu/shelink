import { describe, it, expect } from "vitest";
import {
  formatDisplayDate,
  calculateAge,
  getZodiacSign,
  getZodiacAnimal,
  getLunarDateString
} from "@/utils/dateHelpers";

describe("formatDisplayDate", () => {
  it("returns 'Chưa rõ' when all parts missing", () => {
    expect(formatDisplayDate(null, null, null)).toBe("Chưa rõ");
  });
  it("formats full date as dd/MM/yyyy", () => {
    expect(formatDisplayDate(2024, 1, 15)).toBe("15/01/2024");
  });
  it("handles partial date (year and day only)", () => {
    expect(formatDisplayDate(2024, null, 15)).toBe("15/2024");
  });
  it("handles partial date (year and month only)", () => {
    expect(formatDisplayDate(2024, 2, null)).toBe("02/2024");
  });
});

describe("calculateAge", () => {
  it("returns age and isDeceased false for birthYear only", () => {
    const result = calculateAge(2000);
    expect(result).toHaveProperty("age");
    expect(result).toHaveProperty("isDeceased", false);
    const currentYear = new Date().getFullYear();
    expect(result.age).toBe(currentYear - 2000);
  });
  it("computes age at death correctly", () => {
    expect(calculateAge(1990, 2020)).toEqual({ age: 30, isDeceased: true });
  });
  it("returns null for missing birthYear", () => {
    expect(calculateAge(null)).toBeNull();
  });
});

describe("getZodiacSign", () => {
  it("returns correct sign for known dates", () => {
    // Thresholds: month 1 -> day<20 => Ma Kết, >=20 => Bảo Bình
    expect(getZodiacSign(19, 1)).toBe("Ma Kết");
    expect(getZodiacSign(20, 1)).toBe("Bảo Bình");
    // month 3: day<21 => Song Ngư, >=21 => Bạch Dương
    expect(getZodiacSign(20, 3)).toBe("Song Ngư");
    expect(getZodiacSign(21, 3)).toBe("Bạch Dương");
  });
  it("returns null for invalid input", () => {
    expect(getZodiacSign(null, 1)).toBeNull();
    expect(getZodiacSign(15, 0)).toBeNull();
  });
});

describe("getZodiacAnimal", () => {
  it("returns animal based on year", () => {
    expect(getZodiacAnimal(2024)).toBe("Thìn"); // Dragon
    expect(getZodiacAnimal(2025)).toBe("Tỵ");   // Snake
  });
  it("returns string when month/day provided", () => {
    const result = getZodiacAnimal(2024, 1, 1);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("getLunarDateString", () => {
  it("returns formatted lunar string for valid date", () => {
    const result = getLunarDateString(2024, 1, 15);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    // Format: "dd/mm/yyyy" or "dd/mm nhuận/yyyy"
    expect(result).toMatch(/^\d+\/\d+(\s*nhuận)?\/\d{4}$/);
  });
  it("returns null when any part missing", () => {
    expect(getLunarDateString(null, 1, 1)).toBeNull();
    expect(getLunarDateString(2024, null, 1)).toBeNull();
    expect(getLunarDateString(2024, 1, null)).toBeNull();
  });
});
