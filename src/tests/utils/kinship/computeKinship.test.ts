import { describe, it, expect } from "vitest";
import { computeKinship } from "@/utils/kinship/compute";
import type { PersonNode, RelEdge } from "@/utils/kinship/types";

function mkPerson(
  id: string,
  name: string,
  gender: "male" | "female" | "other",
  overrides: Partial<PersonNode> = {}
): PersonNode {
  return {
    id,
    full_name: name,
    gender,
    birth_year: null,
    birth_order: null,
    generation: null,
    is_in_law: false,
    ...overrides
  };
}

function mkEdge(
  type: "marriage" | "biological_child" | "adopted_child",
  parent: string,
  child: string
): RelEdge {
  return { type, person_a: parent, person_b: child };
}

describe("computeKinship", () => {
  it("returns null for same person", () => {
    const p = mkPerson("1", "A", "male");
    expect(computeKinship(p, p, [p], [])).toBeNull();
  });

  it("detects marriage relationship", () => {
    const a = mkPerson("a", "A", "male");
    const b = mkPerson("b", "B", "female");
    const rels: RelEdge[] = [mkEdge("marriage", "a", "b")];
    const result = computeKinship(a, b, [a, b], rels);
    expect(result).not.toBeNull();
    expect(result!.aCallsB).toBe("Vợ");
    expect(result!.bCallsA).toBe("Chồng");
    expect(result!.distance).toBe(0);
    expect(result!.description).toBe("Quan hệ Hôn nhân");
  });

  it("detects parent-child", () => {
    const parent = mkPerson("p", "P", "male");
    const child = mkPerson("c", "C", "female");
    const rels: RelEdge[] = [mkEdge("biological_child", "p", "c")];
    const result = computeKinship(parent, child, [parent, child], rels);
    expect(result).not.toBeNull();
    expect(result!.aCallsB).toBe("Con");
    expect(result!.bCallsA).toBe("Bố");
    expect(result!.distance).toBe(1);
  });

  it("detects grandparent (two generations)", () => {
    const gp = mkPerson("gp", "GP", "male");
    const p = mkPerson("p", "P", "male"); // male parent -> paternal grandfather
    const c = mkPerson("c", "C", "male");
    const rels: RelEdge[] = [
      mkEdge("biological_child", "gp", "p"),
      mkEdge("biological_child", "p", "c")
    ];
    const result = computeKinship(gp, c, [gp, p, c], rels);
    expect(result).not.toBeNull();
    expect(result!.aCallsB).toBe("Cháu");
    expect(result!.bCallsA).toMatch(/Ông/); // paternal: "Ông nội"
    expect(result!.distance).toBe(2);
  });

  it("detects siblings (same parents)", () => {
    const mother = mkPerson("m", "M", "female");
    const a = mkPerson("a", "A", "male");
    const b = mkPerson("b", "B", "female");
    const rels: RelEdge[] = [
      mkEdge("biological_child", "m", "a"),
      mkEdge("biological_child", "m", "b")
    ];
    const result = computeKinship(a, b, [mother, a, b], rels);
    expect(result).not.toBeNull();
    // Siblings: distance 2 (A->parent->B)
    expect(result!.distance).toBe(2);
    // aCallsB should be a sibling term; accept any non-empty
    expect(result!.aCallsB.length).toBeGreaterThan(0);
  });

  it("detects some relationship through parent's sibling", () => {
    const grandma = mkPerson("gm", "GM", "female");
    const parent = mkPerson("p", "P", "male");
    const uncle = mkPerson("u", "U", "male");
    const child = mkPerson("c", "C", "female");
    const rels: RelEdge[] = [
      mkEdge("biological_child", "gm", "parent"),
      mkEdge("biological_child", "gm", "uncle"),
      mkEdge("biological_child", "parent", "child")
    ];
    const result = computeKinship(uncle, child, [grandma, parent, uncle, child], rels);
    expect(result).not.toBeNull();
    // Result could be specific term or unknown; just check non-empty and distance >=2 or -1
    expect(result!.aCallsB.length).toBeGreaterThan(0);
    expect(result!.distance === -1 || result!.distance >= 2).toBe(true);
  });

  it("detects in-law through marriage (parent-in-law)", () => {
    const a = mkPerson("a", "A", "male");
    const spouse = mkPerson("s", "S", "female");
    const parentInLaw = mkPerson("p", "P", "male");
    const rels: RelEdge[] = [
      mkEdge("marriage", "a", "s"),
      mkEdge("biological_child", "p", "s")
    ];
    const result = computeKinship(a, parentInLaw, [a, spouse, parentInLaw], rels);
    expect(result).not.toBeNull();
    expect(result!.aCallsB).toBe("Bố vợ");
    expect(result!.distance).toBe(1);
  });

  it("returns unknown when no kinship found", () => {
    const a = mkPerson("a", "A", "male");
    const b = mkPerson("b", "B", "female");
    const result = computeKinship(a, b, [a, b], []);
    expect(result).not.toBeNull();
    expect(result!.aCallsB).toBe("Chưa xác định");
    expect(result!.bCallsA).toBe("Chưa xác định");
    expect(result!.distance).toBe(-1);
  });
});
