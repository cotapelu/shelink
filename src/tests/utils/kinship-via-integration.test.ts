// @ts-nocheck
import { describe, it, expect } from "vitest";
import { computeKinship, type PersonNode } from "@/utils/kinshipHelpers";

describe("computeKinship - Via Spouse Integration Tests", () => {
  const createPerson = (id: string, name: string, gender: "male" | "female", birth_year?: number, generation?: number): PersonNode => ({
    id,
    full_name: name,
    gender,
    birth_order: null,
    birth_year: generation ?? birth_year ?? 2000,
    generation: generation ?? 0,
    is_in_law: false,
  });

  it("should find relationship via A's spouse (sibling-in-law)", () => {
    // A (An) married to X (E). X and B (Bình) are siblings (same parent P). A and B should be related via X.
    const P = createPerson("p0", "Parent", "female", 1960, -1);
    const A = createPerson("p1", "An", "male", 1980, 0);
    const B = createPerson("p2", "Bình", "female", 1982, 0);
    const X = createPerson("p5", "E", "female", 1983, 0);

    const persons: PersonNode[] = [P, A, B, X];
    const relationships = [
      { type: "marriage", person_a: "p1", person_b: "p5" },
      { type: "biological_child", person_a: "p0", person_b: "p2" },
      { type: "biological_child", person_a: "p0", person_b: "p5" },
    ];

    const result = computeKinship(A, B, persons, relationships);

    expect(result).not.toBeNull();
    expect(result!.distance).toBeGreaterThan(0);
    // Description should indicate via spouse relationship
    expect(result!.description).toMatch(/(Thông qua hôn nhân|via)/i);
  });

  it("should find relationship via B's spouse", () => {
    const P = createPerson("p0", "Parent", "female", 1960, -1);
    const A = createPerson("p1", "An", "male", 1980, 0);
    const B = createPerson("p2", "Bình", "female", 1982, 0);
    const X = createPerson("p5", "E", "female", 1983, 0);
    const Y = createPerson("p6", "F", "male", 1985, 0);

    const persons: PersonNode[] = [P, A, B, X, Y];
    const relationships = [
      { type: "marriage", person_a: "p1", person_b: "p5" },
      { type: "marriage", person_a: "p2", person_b: "p6" },
      { type: "biological_child", person_a: "p0", person_b: "p5" },
      { type: "biological_child", person_a: "p0", person_b: "p6" },
    ];

    const result = computeKinship(A, B, persons, relationships);

    expect(result).not.toBeNull();
    expect(result!.distance).toBeGreaterThan(0);
    expect(result!.description).toMatch(/(Thông qua hôn nhân|via)/i);
  });

  it("should find relationship via both spouses", () => {
    const P = createPerson("p0", "Parent", "female", 1960, -1);
    const A = createPerson("p1", "An", "male", 1980, 0);
    const B = createPerson("p2", "Bình", "female", 1982, 0);
    const X = createPerson("p5", "E", "female", 1983, 0);
    const Y = createPerson("p6", "F", "male", 1985, 0);

    const persons: PersonNode[] = [P, A, B, X, Y];
    const relationships = [
      { type: "marriage", person_a: "p1", person_b: "p5" },
      { type: "marriage", person_a: "p2", person_b: "p6" },
      { type: "biological_child", person_a: "p0", person_b: "p5" },
      { type: "biological_child", person_a: "p0", person_b: "p6" },
    ];

    const result = computeKinship(A, B, persons, relationships);

    expect(result).not.toBeNull();
    expect(result!.distance).toBeGreaterThan(0);
    expect(result!.description).toMatch(/(cả.*và|both)/i); // Vietnamese: 'cả E và F'
  });

  it("should return not found when via paths fail", () => {
    const A = createPerson("p1", "An", "male", 1980, 0);
    const B = createPerson("p2", "Bình", "female", 1982, 0);
    const X = createPerson("p5", "E", "female", 1983, 0);
    const Y = createPerson("p6", "F", "male", 1985, 0);

    const persons: PersonNode[] = [A, B, X, Y];
    const relationships = [
      { type: "marriage", person_a: "p1", person_b: "p5" },
      { type: "marriage", person_a: "p2", person_b: "p6" },
    ];

    const result = computeKinship(A, B, persons, relationships);

    expect(result).toEqual({
      aCallsB: "Chưa xác định",
      bCallsA: "Chưa xác định",
      description: "Không tìm thấy quan hệ trong phạm vi dữ liệu",
      distance: -1,
      pathLabels: [],
    });
  });

  it("should handle spouse missing from persons map", () => {
    const A = createPerson("p1", "An", "male", 1980, 0);
    const B = createPerson("p2", "Bình", "female", 1982, 0);

    const persons: PersonNode[] = [A, B];
    const relationships = [
      { type: "marriage", person_a: "p1", person_b: "missing-spouse" },
    ];

    const result = computeKinship(A, B, persons, relationships);

    expect(result).toEqual({
      aCallsB: "Chưa xác định",
      bCallsA: "Chưa xác định",
      description: "Không tìm thấy quan hệ trong phạm vi dữ liệu",
      distance: -1,
      pathLabels: [],
    });
  });

  it("should identify direct siblings (blood)", () => {
    const P = createPerson("p0", "Parent", "male", 1960, -1);
    const A = createPerson("p1", "An", "male", 1980, 0);
    const B = createPerson("p2", "Bình", "female", 1982, 0);

    const persons: PersonNode[] = [P, A, B];
    const relationships = [
      { type: "biological_child", person_a: "p0", person_b: "p1" },
      { type: "biological_child", person_a: "p0", person_b: "p2" },
    ];

    const result = computeKinship(A, B, persons, relationships);

    expect(result).not.toBeNull();
    expect(result!.description).toContain("Anh chị em ruột");
    expect(result!.distance).toBe(2); // siblings: A→parent→B = 2 edges
  });
});
