import { describe, it, expect } from "vitest";
import { computeKinship, PersonNode, RelEdge } from "@/utils/kinshipHelpers";

describe("kinshipHelpers - computeKinship", () => {
  const createPerson = (
    id: string,
    full_name: string,
    gender: "male" | "female" | "other",
    birth_year?: number | null
  ): PersonNode => ({
    id,
    full_name,
    gender,
    birth_year: birth_year ?? null,
    birth_order: null,
    generation: null,
    is_in_law: false,
  });

  it("should return null for same person", () => {
    const p = createPerson("1", "John", "male");
    expect(computeKinship(p, p, [p], [])).toBeNull();
  });

  it("should detect spouse relationship", () => {
    const a = createPerson("a", "John", "male");
    const b = createPerson("b", "Jane", "female");
    const persons = [a, b];
    const relationships: RelEdge[] = [{ type: "marriage", person_a: a.id, person_b: b.id }];
    const result = computeKinship(a, b, persons, relationships);
    expect(result).not.toBeNull();
    expect(result!.distance).toBe(0);
    expect(result!.aCallsB).toBe("Vợ");
    expect(result!.bCallsA).toBe("Chồng");
  });

  it("should detect parent-child relationship (biological)", () => {
    const parent = createPerson("p", "Father", "male");
    const child = createPerson("c", "Child", "male");
    const persons = [parent, child];
    const relationships: RelEdge[] = [
      { type: "biological_child", person_a: parent.id, person_b: child.id },
    ];
    const result = computeKinship(parent, child, persons, relationships);
    expect(result).not.toBeNull();
    expect(result!.distance).toBe(1);
    expect(result!.aCallsB).toBe("Con");
    expect(result!.bCallsA).toBe("Bố");
  });
});
