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

  it("detects grandparent relationship", () => {
    const gp = makePerson("gp", "male", 1950);
    const parent = makePerson("p", "female", 1980);
    const child = makePerson("c", "male", 2010);
    const edges: RelEdge[] = [
      { person_a: gp.id, person_b: parent.id, type: "biological_child" },
      { person_a: parent.id, person_b: child.id, type: "biological_child" }
    ];
    const result = computeKinship(gp, child, [gp, parent, child], edges);
    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Cháu"); // gp calls child "Cháu"
    expect(result?.distance).toBe(2);
  });

  it("detects father-in-law via spouse's parent", () => {
    const husband = makePerson("h", "male");
    const wife = makePerson("w", "female");
    const fatherInLaw = makePerson("f", "male");
    const edges: RelEdge[] = [
      { person_a: husband.id, person_b: wife.id, type: "marriage" },
      { person_a: fatherInLaw.id, person_b: wife.id, type: "biological_child" }
    ];
    const result = computeKinship(husband, fatherInLaw, [husband, wife, fatherInLaw], edges);
    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Bố vợ");
    expect(result?.distance).toBe(1);
  });

  it("detects brother-in-law (spouse's sibling)", () => {
    const husband = makePerson("h", "male");
    const wife = makePerson("w", "female", 1990);
    const brotherInLaw = makePerson("b", "male", 1988); // older brother
    const parent = makePerson("p", "female", 1960);
    const edges: RelEdge[] = [
      { person_a: husband.id, person_b: wife.id, type: "marriage" },
      { person_a: parent.id, person_b: wife.id, type: "biological_child" },
      { person_a: parent.id, person_b: brotherInLaw.id, type: "biological_child" }
    ];
    const allPersons = [husband, wife, brotherInLaw, parent];
    const result = computeKinship(husband, brotherInLaw, allPersons, edges);
    expect(result).not.toBeNull();
    // husband calls wife's older brother: "Anh vợ" (Anh + suffix)
    expect(result?.aCallsB).toBe("Anh vợ");
    expect(result?.distance).toBe(2);
  });
});
