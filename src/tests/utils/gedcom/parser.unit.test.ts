import { describe, it, expect } from "vitest";
import { parseMonthName, parseGedcomDate } from "@/utils/gedcom/parser";

describe("parseMonthName", () => {
  it("parses standard month abbreviations", () => {
    expect(parseMonthName("JAN")).toBe(1);
    expect(parseMonthName("FEB")).toBe(2);
    expect(parseMonthName("DEC")).toBe(12);
  });

  it("is case-insensitive", () => {
    expect(parseMonthName("jan")).toBe(1);
    expect(parseMonthName("Feb")).toBe(2);
    expect(parseMonthName("mAr")).toBe(3);
  });

  it("returns null for invalid month", () => {
    expect(parseMonthName("XYZ")).toBeNull();
    expect(parseMonthName("")).toBeNull();
  });
});

describe("parseGedcomDate", () => {
  it("parses full date DD MMM YYYY", () => {
    const result = parseGedcomDate("15 JAN 2024");
    expect((result as any)).toEqual({ day: 15, month: 1, year: 2024 });
  });

  it("parses year only", () => {
    const result = parseGedcomDate("2024");
    expect((result as any)).toEqual({ day: null, month: null, year: 2024 });
  });

  it("parses month and year", () => {
    const result = parseGedcomDate("JAN 2024");
    expect((result as any)).toEqual({ day: null, month: 1, year: 2024 });
  });

  it("parses day and month and year with leading/trailing spaces", () => {
    const result = parseGedcomDate("  5  FEB  1990  ");
    expect((result as any)).toEqual({ day: 5, month: 2, year: 1990 });
  });

  it("handles approximate qualifiers (ABT, EST, AFT, BEF, CAL)", () => {
    const result = parseGedcomDate("ABT 15 MAR 2020");
    expect((result as any)).toEqual({ day: 15, month: 3, year: 2020 });
  });

  it("returns nulls for invalid format", () => {
    const result = parseGedcomDate("invalid string");
    expect((result as any)).toEqual({ day: null, month: null, year: null });
  });

  it("handles empty string", () => {
    const result = parseGedcomDate("");
    expect((result as any)).toEqual({ day: null, month: null, year: null });
  });

  it("returns null for partial with invalid month", () => {
    const result = parseGedcomDate("15 XYZ 2024");
    expect((result as any)).toEqual({ day: 15, month: null, year: 2024 });
  });

  it("parses single line with extra spaces", () => {
    const result = parseGedcomDate("   2024   ");
    expect((result as any)).toEqual({ day: null, month: null, year: 2024 });
  });
});
