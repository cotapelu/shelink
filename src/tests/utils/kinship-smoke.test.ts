// @ts-nocheck
import { describe, it, expect } from "vitest";
import { computeKinship, type PersonNode } from "@/utils/kinshipHelpers";

function createPerson(id: string, name: string, gender: "male" | "female", generation?: number): PersonNode {
  return {
    id,
    full_name: name,
    gender,
    birth_order: null,
    birth_year: generation ?? 2000,
    generation: generation ?? 0,
    is_in_law: false,
  };
}

describe("kinship compute - smoke tests for branch coverage", () => {
  it("grandparent-grandchild (direct lineage depth 2)", () => {
    const gp = createPerson("gp", "Grandpa", "male", -1);
    const p = createPerson("p", "Parent", "male", 0);
    const c = createPerson("c", "Child", "female", 1);

    const result = computeKinship(
      gp,
      c,
      [gp, p, c],
      [
        { type: "biological_child", person_a: "gp", person_b: "p" },
        { type: "biological_child", person_a: "p", person_b: "c" },
      ]
    );

    expect(result).not.toBeNull();
    expect(result!.distance).toBeGreaterThan(0);
  });

  it("uncle/aunt relationship (collateral depth diff)", () => {
    const gp = createPerson("gp", "Grandpa", "male", -1);
    const p = createPerson("p", "Parent", "male", 0);
    const u = createPerson("u", "Uncle", "male", 0);
    const n = createPerson("n", "Niece", "female", 1);

    const result = computeKinship(
      u,
      n,
      [gp, p, u, n],
      [
        { type: "biological_child", person_a: "gp", person_b: "p" },
        { type: "biological_child", person_a: "gp", person_b: "u" },
        { type: "biological_child", person_a: "p", person_b: "n" },
      ]
    );

    expect(result).not.toBeNull();
    expect(result!.distance).toBeGreaterThan(0);
  });

  it("cousins (cross-generational)", () => {
    const gp = createPerson("gp", "Grandpa", "male", -1);
    const p1 = createPerson("p1", "Parent1", "male", 0);
    const p2 = createPerson("p2", "Parent2", "female", 0);
    const a = createPerson("a", "A", "male", 1);
    const b = createPerson("b", "B", "female", 1);

    const result = computeKinship(
      a,
      b,
      [gp, p1, p2, a, b],
      [
        { type: "biological_child", person_a: "gp", person_b: "p1" },
        { type: "biological_child", person_a: "gp", person_b: "p2" },
        { type: "biological_child", person_a: "p1", person_b: "a" },
        { type: "biological_child", person_a: "p2", person_b: "b" },
      ]
    );

    expect(result).not.toBeNull();
    expect(result!.distance).toBeGreaterThan(0);
  });

  it("empty persons returns not found", () => {
    const A = createPerson("a", "A", "male");
    const B = createPerson("b", "B", "female");

    const result = computeKinship(A, B, [], []);

    expect(result).toEqual({
      aCallsB: "Chưa xác định",
      bCallsA: "Chưa xác định",
      description: "Không tìm thấy quan hệ trong phạm vi dữ liệu",
      distance: -1,
      pathLabels: [],
    });
  });

  it("non-existent person in map returns not found", () => {
    const A = createPerson("a", "A", "male");
    const B = createPerson("b", "B", "female");

    const result = computeKinship(
      A,
      B,
      [A], // B not in list
      []
    );

    expect(result).toEqual({
      aCallsB: "Chưa xác định",
      bCallsA: "Chưa xác định",
      description: "Không tìm thấy quan hệ trong phạm vi dữ liệu",
      distance: -1,
      pathLabels: [],
    });
  });
});
