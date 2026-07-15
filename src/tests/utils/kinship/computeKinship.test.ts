import { describe, it, expect } from "vitest";
import { computeKinship } from "@/utils/kinship/compute";
import type { PersonNode, RelEdge } from "@/utils/kinship/types";

const makePerson = (id: string, gender: "male" | "female" = "male", birth_year?: number): PersonNode => ({
  id,
  full_name: id,
  gender,
  birth_year: birth_year ?? 1990,
  birth_order: null,
  generation: null,
  is_in_law: false,
});

describe("computeKinship", () => {
  it("returns null for same person", () => {
    const p = makePerson("p1");
    const result = computeKinship(p, p, [p], []);
    expect(result).toBeNull();
  });

  it("detects direct spouse (marriage)", () => {
    const a = makePerson("a", "male");
    const b = makePerson("b", "female");
    const edges: RelEdge[] = [{ person_a: a.id, person_b: b.id, type: "marriage" }];
    const result = computeKinship(a, b, [a, b], edges);
    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Vợ");
    expect(result?.bCallsA).toBe("Chồng");
  });

  it("detects parent-child biological", () => {
    const parent = makePerson("p", "male", 1970);
    const child = makePerson("c", "female", 2000);
    const edges: RelEdge[] = [{ person_a: parent.id, person_b: child.id, type: "biological_child" }];
    const result = computeKinship(parent, child, [parent, child], edges);
    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Con");
    expect(result?.distance).toBe(1);
  });

  it("returns default when no relationship found", () => {
    const a = makePerson("a");
    const b = makePerson("b");
    const result = computeKinship(a, b, [a, b], []);
    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Chưa xác định");
  });

  it("handles birth_year ordering", () => {
    const elder = makePerson("e", "male", 1950);
    const younger = makePerson("y", "female", 2000);
    const edges: RelEdge[] = [{ person_a: elder.id, person_b: younger.id, type: "biological_child" }];
    const result = computeKinship(elder, younger, [elder, younger], edges);
    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Con");
  });
});
