import { describe, it, expect } from "vitest";
import { computeKinship, type PersonNode } from "@/utils/kinshipHelpers";

describe("computeKinship", () => {
  const persons: PersonNode[] = [
    { id: "p1", full_name: "An", gender: "male", birth_order: 1, birth_year: 1980, generation: 0, is_in_law: false },
    { id: "p2", full_name: "Bình", gender: "female", birth_order: 2, birth_year: 1982, generation: 0, is_in_law: false },
    { id: "p3", full_name: "Cường", gender: "male", birth_order: null, birth_year: 2005, generation: null, is_in_law: false },
    { id: "p4", full_name: "Dung", gender: "female", birth_order: null, birth_year: 2008, generation: null, is_in_law: false },
  ];

  const relationships = [
    { type: "marriage", person_a: "p1", person_b: "p2" },
    { type: "biological_child", person_a: "p1", person_b: "p3" },
    { type: "biological_child", person_a: "p2", person_b: "p3" },
    { type: "biological_child", person_a: "p1", person_b: "p4" },
    { type: "biological_child", person_a: "p2", person_b: "p4" },
  ];

  it("should identify parent-child relationship (father → son)", () => {
    const result = computeKinship(persons[0], persons[2], persons, relationships);
    expect(result).not.toBeNull();
    expect(result!.aCallsB).toBe("Con");
    expect(result!.bCallsA).toBe("Bố");
    expect(result!.description).toContain("Quan hệ Trực hệ");
  });

  it("should identify parent-child relationship (mother → son)", () => {
    const result = computeKinship(persons[1], persons[2], persons, relationships);
    expect(result).not.toBeNull();
    expect(result!.aCallsB).toBe("Con");
    expect(result!.bCallsA).toBe("Mẹ");
  });

  it("should identify spouse relationship", () => {
    const result = computeKinship(persons[0], persons[1], persons, relationships);
    expect(result).not.toBeNull();
    expect(result!.aCallsB).toBe("Vợ");
    expect(result!.bCallsA).toBe("Chồng");
    expect(result!.description).toBe("Quan hệ Hôn nhân");
  });

  it("should identify siblings (same parents)", () => {
    const result = computeKinship(persons[2], persons[3], persons, relationships);
    expect(result).not.toBeNull();
    expect(result!.description).toContain("Anh chị em ruột");
    // Cường (older male) calls Dung (younger female)
    expect(result!.aCallsB).toBe("Em gái");
  });

  it("should return fallback for unrelated persons", () => {
    const unrelated: PersonNode = { id: "p5", full_name: "E", gender: "male", birth_order: null, birth_year: 1990, generation: null, is_in_law: false };
    const result = computeKinship(persons[0], unrelated, [...persons, unrelated], relationships);
    expect(result).not.toBeNull();
    expect(result!.description).toBe("Không tìm thấy quan hệ trong phạm vi dữ liệu");
  });
});
