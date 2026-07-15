import { describe, it, expect } from "vitest";
import {
  compareSeniority,
  getDirectAncestorTerm,
  getDirectDescendantTerm
} from "@/utils/kinship/compute";
import type { PersonNode } from "@/utils/kinship/types";

function mkPerson(id: string, overrides: Partial<PersonNode> = {}): PersonNode {
  return {
    id,
    full_name: id,
    gender: "other",
    birth_year: null,
    birth_order: null,
    generation: null,
    is_in_law: false,
    ...overrides
  };
}

describe("compareSeniority", () => {
  it("returns equal for same person", () => {
    const p = mkPerson("1");
    expect(compareSeniority(p, p)).toBe("equal");
  });

  it("compares by birth_order when available", () => {
    const a = mkPerson("a", { birth_order: 1 });
    const b = mkPerson("b", { birth_order: 2 });
    expect(compareSeniority(a, b)).toBe("senior");
    expect(compareSeniority(b, a)).toBe("junior");
  });

  it("uses birth_year when birth_order equal or missing", () => {
    const a = mkPerson("a", { birth_year: 1980 });
    const b = mkPerson("b", { birth_year: 1990 });
    expect(compareSeniority(a, b)).toBe("senior");
    expect(compareSeniority(b, a)).toBe("junior");
  });

  it("returns equal when no ordering info", () => {
    const a = mkPerson("a");
    const b = mkPerson("b");
    expect(compareSeniority(a, b)).toBe("equal");
  });

  it("prefers birth_order over birth_year", () => {
    const a = mkPerson("a", { birth_order: 1, birth_year: 1990 });
    const b = mkPerson("b", { birth_order: 2, birth_year: 1980 });
    expect(compareSeniority(a, b)).toBe("senior");
  });
});

describe("getDirectAncestorTerm", () => {
  it("returns mother/father for depth 1", () => {
    expect(getDirectAncestorTerm(1, "male", true)).toBe("Bố");
    expect(getDirectAncestorTerm(1, "female", true)).toBe("Mẹ");
    expect(getDirectAncestorTerm(1, "male", false)).toBe("Bố");
    expect(getDirectAncestorTerm(1, "female", false)).toBe("Mẹ");
  });

  it("returns paternal grandparents correctly", () => {
    expect(getDirectAncestorTerm(2, "male", true)).toBe("Ông nội");
    expect(getDirectAncestorTerm(2, "female", true)).toBe("Bà nội");
  });

  it("returns maternal grandparents correctly", () => {
    expect(getDirectAncestorTerm(2, "male", false)).toBe("Ông ngoại");
    expect(getDirectAncestorTerm(2, "female", false)).toBe("Bà ngoại");
  });

  it("returns special titles for depth 3", () => {
    expect(getDirectAncestorTerm(3, "male", true)).toBe("Cụ ông nội");
    expect(getDirectAncestorTerm(3, "female", false)).toBe("Cụ bà ngoại");
  });

  it("falls back to ANCESTORS table for depth 4+", () => {
    expect(getDirectAncestorTerm(4, "male", true)).toBe("Kỵ");
    expect(getDirectAncestorTerm(5, "female", false)).toBe("Sơ");
  });

  it("handles very large depth with generic title", () => {
    expect(getDirectAncestorTerm(100, "male", true)).toBe("Tổ đời 100");
  });
});

describe("getDirectDescendantTerm", () => {
  it("returns correct terms for small depths", () => {
    expect(getDirectDescendantTerm(1)).toBe("Con");
    expect(getDirectDescendantTerm(2)).toBe("Cháu");
    expect(getDirectDescendantTerm(3)).toBe("Chắt");
    expect(getDirectDescendantTerm(4)).toBe("Chít");
    expect(getDirectDescendantTerm(5)).toBe("Chút");
  });

  it("falls back to generic title for large depths", () => {
    expect(getDirectDescendantTerm(10)).toBe("Cháu đời 10");
  });
});
