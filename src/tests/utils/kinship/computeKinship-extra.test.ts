import { describe, it, expect } from "vitest";
import { computeKinship } from "@/utils/kinship/compute";
import type { PersonNode, RelEdge } from "@/utils/kinship/types";

const makePerson = (
  id: string,
  gender: "male" | "female" | "other" = "male",
  birth_year?: number
): PersonNode => ({
  id,
  full_name: `Người ${id.toUpperCase()}`,
  gender,
  birth_year: birth_year ?? 1990,
  birth_order: null,
  generation: null,
  is_in_law: false,
});

// Covers both-spouses path: A and B are each married to blood relatives of one another.
// Setup: sA is spouse of A, sB is spouse of B; sA and sB are siblings (share parent P).
describe("computeKinship - via both spouses", () => {
  it("resolves cousin-style relation through the spouses of both sides", () => {
    const a = makePerson("a", "male");
    const sA = makePerson("sA", "female", 1991);
    const b = makePerson("b", "female");
    const sB = makePerson("sB", "male", 1993);
    const p = makePerson("p", "male", 1960);

    const persons = [a, sA, b, sB, p];
    const relationships: RelEdge[] = [
      { person_a: a.id, person_b: sA.id, type: "marriage" },
      { person_a: b.id, person_b: sB.id, type: "marriage" },
      { person_a: p.id, person_b: sA.id, type: "biological_child" },
      { person_a: p.id, person_b: sB.id, type: "biological_child" }
    ];

    const result = computeKinship(a, b, persons, relationships);

    expect(result).not.toBeNull();
    expect(result?.description).toContain("Thông qua hôn nhân của cả");
    expect(result?.pathLabels[0]).toContain("là Chồng của");
    expect(result?.pathLabels[result.pathLabels.length - 1]).toContain("là Vợ của");
    // A (male) calls B -> "Chồng của <term B calls spouse>"
    expect(result?.aCallsB.startsWith("Chồng của")).toBe(true);
    expect(result?.bCallsA.startsWith("Vợ của")).toBe(true);
  });

  it("applies blood-sibling adjustment for both-male / both-female couples", () => {
    // Two brothers married to two sisters; the spouses are blood siblings
    // -> adjustBloodSiblingTerm maps to "Anh em cột chèo"
    const a = makePerson("a", "male");
    const sA = makePerson("sA", "female", 1991);
    const b = makePerson("b", "male");
    const sB = makePerson("sB", "female", 1993);
    const p = makePerson("p", "male", 1960);

    const persons = [a, sA, b, sB, p];
    const relationships: RelEdge[] = [
      { person_a: a.id, person_b: sA.id, type: "marriage" },
      { person_a: b.id, person_b: sB.id, type: "marriage" },
      { person_a: p.id, person_b: sA.id, type: "biological_child" },
      { person_a: p.id, person_b: sB.id, type: "biological_child" }
    ];

    const result = computeKinship(a, b, persons, relationships);

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Anh em cột chèo");
    expect(result?.bCallsA).toBe("Anh em cột chèo");
  });

  it("keeps the unadjusted term when spouses are not blood siblings", () => {
    // A married to sA; B married to sB; sA and sB have no blood relation
    const a = makePerson("a", "male");
    const sA = makePerson("sA", "female", 1991);
    const b = makePerson("b", "female");
    const sB = makePerson("sB", "male", 1993);

    const persons = [a, sA, b, sB];
    const relationships: RelEdge[] = [
      { person_a: a.id, person_b: sA.id, type: "marriage" },
      { person_a: b.id, person_b: sB.id, type: "marriage" }
    ];

    const result = computeKinship(a, b, persons, relationships);

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Chưa xác định");
    expect(result?.description).toBe("Không tìm thấy quan hệ trong phạm vi dữ liệu");
  });
});

describe("computeKinship - relation edge types", () => {
  it("treats adopted_child as a parent link", () => {
    const parent = makePerson("p", "female", 1970);
    const child = makePerson("c", "male", 2000);

    const result = computeKinship(parent, child, [parent, child], [
      { person_a: parent.id, person_b: child.id, type: "adopted_child" }
    ]);

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Con");
    expect(result?.distance).toBe(1);
  });

  it("ignores unknown relationship types", () => {
    const a = makePerson("a");
    const b = makePerson("b");

    const result = computeKinship(a, b, [a, b], [
      { person_a: a.id, person_b: b.id, type: "step_parent" as RelEdge["type"] }
    ]);

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Chưa xác định");
  });

  it("skips spouse ids that are missing from personsMap", () => {
    const husband = makePerson("h", "male");
    const fatherInLaw = makePerson("f", "male");

    // marriage edge points to a spouse id that is not in persons list
    const result = computeKinship(husband, fatherInLaw, [husband, fatherInLaw], [
      { person_a: husband.id, person_b: "ghost", type: "marriage" }
    ]);

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Chưa xác định");
  });

  it("resolves in-law relation through one spouse only (via A)", () => {
    const husband = makePerson("h", "male");
    const wife = makePerson("w", "female");
    const wifeFather = makePerson("wf", "male", 1950);

    const persons = [husband, wife, wifeFather];
    const relationships: RelEdge[] = [
      { person_a: husband.id, person_b: wife.id, type: "marriage" },
      { person_a: wifeFather.id, person_b: wife.id, type: "biological_child" }
    ];

    const result = computeKinship(husband, wifeFather, persons, relationships);

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Bố vợ");
    expect(result?.description).toContain("Thông qua hôn nhân của");
    expect(result?.pathLabels[0]).toContain("là vợ/chồng của");
  });

  it("resolves in-law relation through one spouse only (via B)", () => {
    const wife = makePerson("w", "female");
    const husband = makePerson("h", "male");
    const husbandFather = makePerson("hf", "male", 1950);

    const persons = [wife, husband, husbandFather];
    const relationships: RelEdge[] = [
      { person_a: husband.id, person_b: wife.id, type: "marriage" },
      { person_a: husbandFather.id, person_b: husband.id, type: "biological_child" }
    ];

    const result = computeKinship(wife, husbandFather, persons, relationships);

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Bố chồng");
    // via-B path appends the spouse label as the FIRST path entry
    expect(result?.pathLabels[0]).toContain("là vợ/chồng của");
  });

  it("skips a spouse candidate equal to the target person (tryViaA guard)", () => {
    const a = makePerson("a", "male");
    const b = makePerson("b", "female");
    const parent = makePerson("p", "male", 1970);

    // a is "married" to b (direct) and also to c; ensure direct marriage still wins
    const result = computeKinship(a, b, [a, b, parent], [
      { person_a: a.id, person_b: b.id, type: "marriage" },
      { person_a: parent.id, person_b: b.id, type: "biological_child" }
    ]);

    expect(result?.aCallsB).toBe("Vợ");
    expect(result?.description).toBe("Quan hệ Hôn nhân");
  });

  it("handles same-gender marriage terminology", () => {
    const a = makePerson("a", "female");
    const b = makePerson("b", "female");

    const result = computeKinship(a, b, [a, b], [
      { person_a: a.id, person_b: b.id, type: "marriage" }
    ]);

    expect(result?.aCallsB).toBe("Vợ");
    expect(result?.bCallsA).toBe("Vợ");
  });

  it("resolves uncle/niece through spouse (cross-generation via-spouse)", () => {
    // husband -> wife -> wife's brother's child: distance via spouse paths
    const husband = makePerson("h", "male");
    const wife = makePerson("w", "female", 1990);
    const brotherInLaw = makePerson("bil", "male", 1988);
    const parent = makePerson("p", "female", 1960);

    const persons = [husband, wife, brotherInLaw, parent];
    const relationships: RelEdge[] = [
      { person_a: husband.id, person_b: wife.id, type: "marriage" },
      { person_a: parent.id, person_b: wife.id, type: "biological_child" },
      { person_a: parent.id, person_b: brotherInLaw.id, type: "biological_child" }
    ];

    const result = computeKinship(husband, brotherInLaw, persons, relationships);

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Anh vợ");
    expect(result?.distance).toBe(2);
  });
});
