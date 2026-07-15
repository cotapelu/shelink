import { describe, it, expect } from "vitest";
import {
  compareSeniority,
  getDirectAncestorTerm,
  getDirectDescendantTerm
} from "@/utils/kinship/compute";
import type { PersonNode } from "@/utils/kinship/types";

describe("compareSeniority", () => {
  it("returns equal for same person", () => {
    const p: PersonNode = { id: "1", birth_order: 1, birth_year: 1990 };
    expect(compareSeniority(p, p)).toBe("equal");
  });

  it("uses birth_order when both present", () => {
    const a: PersonNode = { id: "1", birth_order: 1, birth_year: 1990 };
    const b: PersonNode = { id: "2", birth_order: 2, birth_year: 1990 };
    expect(compareSeniority(a, b)).toBe("senior");
    expect(compareSeniority(b, a)).toBe("junior");
  });

  it("uses birth_year when birth_order missing", () => {
    const a: PersonNode = { id: "1", birth_year: 1990 };
    const b: PersonNode = { id: "2", birth_year: 1995 };
    expect(compareSeniority(a, b)).toBe("senior");
    expect(compareSeniority(b, a)).toBe("junior");
  });

  it("returns equal when no ordering info", () => {
    const a: PersonNode = { id: "1" };
    const b: PersonNode = { id: "2" };
    expect(compareSeniority(a, b)).toBe("equal");
  });
});

describe("getDirectAncestorTerm", () => {
  it("returns correct term for depth 1", () => {
    expect(getDirectAncestorTerm(1, "male", true)).toBe("Bố");
    expect(getDirectAncestorTerm(1, "female", true)).toBe("Mẹ");
  });

  it("returns correct term for depth 2", () => {
    expect(getDirectAncestorTerm(2, "male", true)).toBe("Ông nội");
    expect(getDirectAncestorTerm(2, "female", false)).toBe("Bà ngoại");
  });

  it("returns Cụ ông/bà ngoại for depth 3", () => {
    expect(getDirectAncestorTerm(3, "male", true)).toBe("Cụ ông nội");
    expect(getDirectAncestorTerm(3, "female", false)).toBe("Cụ bà ngoại");
  });

  it("returns title from ANCESTORS for depth >=4", () => {
    expect(getDirectAncestorTerm(4, "male", true)).toBe("Kỵ");
    expect(getDirectAncestorTerm(5, "female", false)).toBe("Sơ");
  });
});

describe("getDirectDescendantTerm", () => {
  it("returns correct term for depth 1-2", () => {
    expect(getDirectDescendantTerm(1)).toBe("Con");
    expect(getDirectDescendantTerm(2)).toBe("Cháu");
  });

  it("returns custom term for deeper depths", () => {
    expect(getDirectDescendantTerm(5)).toBe("Chút");
    expect(getDirectDescendantTerm(99)).toBe("Cháu đời 99");
  });
});
