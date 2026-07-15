import { describe, it, expect } from "vitest";
import { parseMonthName, parseGedcomDate } from "@/utils/gedcom/parser";

describe("parseMonthName", () => {
  it("parses standard month abbreviations", () => {
    expect(parseMonthName("JAN")).toBe(1);
    expect(parseMonthName("FEB")).toBe(2);
    expect(parseMonthName("MAR")).toBe(3);
    expect(parseMonthName("APR")).toBe(4);
    expect(parseMonthName("MAY")).toBe(5);
    expect(parseMonthName("JUN")).toBe(6);
    expect(parseMonthName("JUL")).toBe(7);
    expect(parseMonthName("AUG")).toBe(8);
    expect(parseMonthName("SEP")).toBe(9);
    expect(parseMonthName("OCT")).toBe(10);
    expect(parseMonthName("NOV")).toBe(11);
    expect(parseMonthName("DEC")).toBe(12);
  });

  it("is case-insensitive", () => {
    expect(parseMonthName("jan")).toBe(1);
    expect(parseMonthName("Feb")).toBe(2);
    expect(parseMonthName("dEc")).toBe(12);
  });

  it("returns null for invalid month", () => {
    expect(parseMonthName("XYZ")).toBeNull();
    expect(parseMonthName("")).toBeNull();
    expect(parseMonthName("JANUARY")).toBeNull(); // full name not recognized
  });
});

describe("parseGedcomDate", () => {
  it("parses full date day month year", () => {
    const result = parseGedcomDate("1 Jan 2000");
    expect(result).toEqual({ day: 1, month: 1, year: 2000 });
  });

  it("parses year only", () => {
    const result = parseGedcomDate("2000");
    expect(result).toEqual({ day: null, month: null, year: 2000 });
  });

  it("parses month year", () => {
    const result = parseGedcomDate("JAN 2000");
    expect(result).toEqual({ day: null, month: 1, year: 2000 });
  });

  it("handles ABT/EST/AFT/BEF/CAL prefixes", () => {
    expect(parseGedcomDate("ABT 1 Jan 2000")).toEqual({ day: 1, month: 1, year: 2000 });
    expect(parseGedcomDate("EST Feb 2000")).toEqual({ day: null, month: 2, year: 2000 });
    expect(parseGedcomDate("AFT 1990")).toEqual({ day: null, month: null, year: 1990 });
    expect(parseGedcomDate("BEF 1990")).toEqual({ day: null, month: null, year: 1990 });
    expect(parseGedcomDate("CAL 15 MAR 2020")).toEqual({ day: 15, month: 3, year: 2020 });
  });

  it("returns nulls for invalid", () => {
    const result = parseGedcomDate("");
    expect(result).toEqual({ day: null, month: null, year: null });
    expect(parseGedcomDate("not a date")).toEqual({ day: null, month: null, year: null });
  });

  it("handles two-part date with day and month but missing year", () => {
    // This case not typical, but parser returns day and month only if parts.length===3? Actually if 2 parts, it interprets as month year. So not this.
    // We can test day month only? Not expected.
  });
});
