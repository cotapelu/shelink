import { describe, it, expect } from "vitest";
import { findBloodKinship } from "@/utils/kinship/bloodGraph";
import type { PersonNode } from "@/utils/kinship/types";

const makePerson = (
  id: string,
  gender: "male" | "female" | "other" = "male",
  birth_year: number | null = 1990,
  birth_order: number | null = null
): PersonNode => ({
  id,
  full_name: `Người ${id.toUpperCase()}`,
  gender,
  birth_year,
  birth_order,
  generation: null,
  is_in_law: false,
});

const toMap = (persons: PersonNode[]) => new Map(persons.map((p) => [p.id, p]));

describe("findBloodKinship", () => {
  it("returns null when there is no common ancestor", () => {
    const a = makePerson("a");
    const b = makePerson("b");
    const pa = makePerson("pa", "male", 1960);
    const pb = makePerson("pb", "female", 1960);

    const result = findBloodKinship(a, b, toMap([a, b, pa, pb]), new Map([
      ["a", ["pa"]],
      ["b", ["pb"]]
    ]));

    expect(result).toBeNull();
  });

  it("skips parent ids missing from personsMap and still returns null", () => {
    const a = makePerson("a");
    const b = makePerson("b");
    const pb = makePerson("pb", "female", 1960);

    const result = findBloodKinship(a, b, toMap([a, b, pb]), new Map([
      ["a", ["ghost"]],
      ["b", ["pb"]]
    ]));

    expect(result).toBeNull();
  });

  it("handles start person missing from personsMap (currentNode undefined)", () => {
    const a = makePerson("a");
    const b = makePerson("b");

    const result = findBloodKinship(a, b, new Map(), new Map());

    // traversal sets depths for both ids but cannot expand -> no common ancestor
    expect(result).toBeNull();
  });

  it("resolves a person against themselves with fallback ancestor name", () => {
    const a = makePerson("a");

    const result = findBloodKinship(a, a, new Map(), new Map());

    expect(result).not.toBeNull();
    expect(result?.distance).toBe(0);
    // same person, no lineage path -> direct lineage fallback terms
    expect(result?.aCallsB).toBe("Hậu duệ");
    expect(result?.bCallsA).toBe("Tiền bối");
    // personsMap lacks the lca -> "Tổ tiên chung" fallback name
    expect(result?.description).toBe("Quan hệ Trực hệ (Tổ tiên chung: Tổ tiên chung)");
    expect(result?.pathLabels).toEqual([
      "Người A cách Tổ tiên chung 0 đời.",
      "Người A cách Tổ tiên chung 0 đời."
    ]);
  });

  it("resolves a person against themselves when present in personsMap", () => {
    const a = makePerson("a");

    const result = findBloodKinship(a, a, toMap([a]), new Map([["a", ["root"]]]));

    expect(result).not.toBeNull();
    expect(result?.distance).toBe(0);
    expect(result?.description).toBe("Quan hệ Trực hệ (Tổ tiên chung: Người A)");
    expect(result?.pathLabels).toEqual([
      "Người A cách Người A 0 đời.",
      "Người A cách Người A 0 đời."
    ]);
  });

  it("resolves parent -> child on the paternal side", () => {
    const parent = makePerson("bố", "male", 1970);
    const child = makePerson("con", "female", 2000);

    const result = findBloodKinship(parent, child, toMap([parent, child]), new Map([
      ["con", ["bố"]]
    ]));

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Con");
    expect(result?.bCallsA).toBe("Bố");
    expect(result?.distance).toBe(1);
    expect(result?.description).toContain("(Tổ tiên chung: Người BỐ)");
    expect(result?.pathLabels).toEqual([
      "Người BỐ cách Người BỐ 0 đời.",
      "Người CON cách Người BỐ 1 đời."
    ]);
  });

  it("resolves child -> parent in the reverse direction", () => {
    const parent = makePerson("bố", "male", 1970);
    const child = makePerson("con", "female", 2000);

    const result = findBloodKinship(child, parent, toMap([parent, child]), new Map([
      ["con", ["bố"]]
    ]));

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Bố");
    expect(result?.bCallsA).toBe("Con");
    expect(result?.distance).toBe(1);
    expect(result?.pathLabels).toEqual([
      "Người CON cách Người BỐ 1 đời.",
      "Người BỐ cách Người BỐ 0 đời."
    ]);
  });

  it("resolves grandparent -> grandchild (nội and ngoại sides)", () => {
    const gp = makePerson("gp", "male", 1940);
    const father = makePerson("father", "male", 1970);
    const mother = makePerson("mother", "female", 1970);
    const gc = makePerson("gc", "female", 2000);

    const result = findBloodKinship(gp, gc, toMap([gp, father, mother, gc]), new Map([
      ["father", ["gp"]],
      ["gc", ["father"]]
    ]));

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Cháu");
    expect(result?.bCallsA).toBe("Ông nội");
    expect(result?.distance).toBe(2);

    // maternal branch -> ngoại
    const resultNgoai = findBloodKinship(gp, gc, toMap([gp, father, mother, gc]), new Map([
      ["mother", ["gp"]],
      ["gc", ["mother"]]
    ]));

    expect(resultNgoai).not.toBeNull();
    expect(resultNgoai?.bCallsA).toBe("Ông ngoại");
    expect(resultNgoai?.distance).toBe(2);
  });

  it("resolves great-grandparent -> great-grandchild (depth 3)", () => {
    const ggp = makePerson("ggp", "male", 1920);
    const gp = makePerson("gp", "male", 1940);
    const parent = makePerson("parent", "male", 1970);
    const child = makePerson("child", "female", 2000);

    const result = findBloodKinship(ggp, child, toMap([ggp, gp, parent, child]), new Map([
      ["gp", ["ggp"]],
      ["parent", ["gp"]],
      ["child", ["parent"]]
    ]));

    expect(result).not.toBeNull();
    expect(result?.aCallsB).toBe("Chắt");
    expect(result?.bCallsA).toBe("Cụ ông nội");
    expect(result?.distance).toBe(3);
  });

  it("resolves siblings sharing both parents", () => {
    const p1 = makePerson("p1", "male", 1960);
    const p2 = makePerson("p2", "female", 1962);
    const a = makePerson("a", "male", 1990);
    const b = makePerson("b", "female", 1992);

    const result = findBloodKinship(a, b, toMap([p1, p2, a, b]), new Map([
      ["a", ["p1", "p2"]],
      ["b", ["p1", "p2"]]
    ]));

    expect(result).not.toBeNull();
    expect(result?.distance).toBe(2);
    expect(result?.aCallsB).toBe("Em gái");
    expect(result?.bCallsA).toBe("Anh trai");
    expect(result?.description).toContain("Anh chị em ruột");
    // tie between two common ancestors keeps the first one found (p1)
    expect(result?.description).toContain("(Tổ tiên chung: Người P1)");
  });

  it("keeps the closest common ancestor when several exist (distance tie-break)", () => {
    const g = makePerson("g", "male", 1930);
    const p1 = makePerson("p1", "male", 1960);
    const p2 = makePerson("p2", "female", 1962);
    const a = makePerson("a", "male", 1990);
    const b = makePerson("b", "female", 1992);

    // a/b share p1, p2 (distance 2) and grandparent g (distance 4)
    const result = findBloodKinship(a, b, toMap([g, p1, p2, a, b]), new Map([
      ["a", ["p1", "p2"]],
      ["b", ["p1", "p2"]],
      ["p1", ["g"]],
      ["p2", ["g"]]
    ]));

    expect(result).not.toBeNull();
    expect(result?.distance).toBe(2);
    expect(result?.description).toContain("(Tổ tiên chung: Người P1)");
  });

  it("deduplicates repeated parent entries during BFS", () => {
    const p1 = makePerson("p1", "male", 1960);
    const a = makePerson("a", "male", 1990);
    const b = makePerson("b", "female", 1992);

    // duplicate parent id in the list -> second visit is ignored by depths guard
    const result = findBloodKinship(a, b, toMap([p1, a, b]), new Map([
      ["a", ["p1", "p1"]],
      ["b", ["p1"]]
    ]));

    expect(result).not.toBeNull();
    expect(result?.distance).toBe(2);
    expect(result?.aCallsB).toBe("Em gái");
    expect(result?.bCallsA).toBe("Anh trai");
  });

  it("resolves cross-generational relationships (cousins and uncle/aunt distances)", () => {
    const g = makePerson("g", "male", 1930);
    const parentA = makePerson("parentA", "male", 1960);
    const parentB = makePerson("parentB", "female", 1962);
    const a = makePerson("a", "male", 1990);
    const b = makePerson("b", "female", 1992);

    // first cousins: both depth 2 from g through different children
    const cousins = findBloodKinship(a, b, toMap([g, parentA, parentB, a, b]), new Map([
      ["parentA", ["g"]],
      ["parentB", ["g"]],
      ["a", ["parentA"]],
      ["b", ["parentB"]]
    ]));

    expect(cousins).not.toBeNull();
    expect(cousins?.distance).toBe(4);
    expect(cousins?.description).toContain("(Tổ tiên chung: Người G)");
    expect(cousins?.pathLabels).toEqual([
      "Người A cách Người G 2 đời.",
      "Người B cách Người G 2 đời."
    ]);

    // uncle/aunt: A is 2 generations below g, B is 1 generation below g
    const uncle = findBloodKinship(a, b, toMap([g, parentA, a, b]), new Map([
      ["parentA", ["g"]],
      ["a", ["parentA"]],
      ["b", ["g"]]
    ]));

    expect(uncle).not.toBeNull();
    expect(uncle?.distance).toBe(3);
    expect(uncle?.aCallsB.length).toBeGreaterThan(0);
    expect(uncle?.bCallsA.length).toBeGreaterThan(0);
    expect(uncle?.description).toContain("(Tổ tiên chung: Người G)");
  });

  it("resolves distant cousins (depth 3 vs depth 3) via cross-generational terms", () => {
    const g = makePerson("g", "male", 1930);
    const parentA = makePerson("parentA", "male", 1960);
    const parentB = makePerson("parentB", "female", 1962);
    const grandChildA = makePerson("grandChildA", "male", 1990);
    const grandChildB = makePerson("grandChildB", "female", 1992);
    const gcA1 = makePerson("gcA1", "male", 2020);
    const gcB1 = makePerson("gcB1", "female", 2022);

    const parentMap = new Map([
      ["parentA", ["g"]],
      ["parentB", ["g"]],
      ["grandChildA", ["parentA"]],
      ["grandChildB", ["parentB"]],
      ["gcA1", ["grandChildA"]],
      ["gcB1", ["grandChildB"]]
    ]);

    const result = findBloodKinship(
      gcA1,
      gcB1,
      toMap([g, parentA, parentB, grandChildA, grandChildB, gcA1, gcB1]),
      parentMap
    );

    expect(result).not.toBeNull();
    expect(result?.distance).toBe(6);
    expect(result?.aCallsB).toBe("Em họ");
    expect(result?.bCallsA).toBe("Anh họ");
    expect(result?.description).toContain("Anh em họ Nội");
    expect(result?.pathLabels).toEqual([
      "Người GCA1 cách Người G 3 đời.",
      "Người GCB1 cách Người G 3 đời."
    ]);
  });
});
