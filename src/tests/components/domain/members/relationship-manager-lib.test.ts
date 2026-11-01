import { describe, it, expect } from "vitest";
import {
  deriveRelDirection,
  mapRelationshipRow,
  mapRelationshipRows,
  collectChildIds,
  formatChildInLawNote,
  toChildInLawRow,
  buildChildInLawRows,
  buildPersonPayload,
  inferSpouseGender,
  validBulkChildren,
  resolveRelEndpoints,
  resolveRelType,
  type RelationshipApiResponse
} from "@/components/domain/members/relationship-manager-lib";
import type { Person } from "@/types";

const person = (id: string, over: Partial<Person> = {}): Person =>
  ({ id, full_name: id, gender: "male", ...over }) as Person;

const row = (over: Partial<RelationshipApiResponse> = {}): RelationshipApiResponse => ({
  id: "r1",
  type: "biological_child",
  person_a: "p1",
  person_b: "p2",
  person_a_data: person("p1"),
  person_b_data: person("p2"),
  note: null,
  ...over
});

describe("deriveRelDirection", () => {
  it("marriage → spouse", () => {
    expect(deriveRelDirection("marriage", "p1", "p2")).toBe("spouse");
  });

  it("con: person_a là mình → child, ngược lại → parent", () => {
    // r.person_a === personId nghĩa là mình là cha/mẹ trong row → người kia là con
    expect(deriveRelDirection("biological_child", "me", "me")).toBe("child");
    expect(deriveRelDirection("biological_child", "other", "me")).toBe("parent");
    expect(deriveRelDirection("adopted_child", "me", "me")).toBe("child");
  });

  it("loại lạ → spouse (fallback như cũ)", () => {
    expect(deriveRelDirection("sibling" as never, "a", "b")).toBe("spouse");
  });
});

describe("mapRelationshipRow(s)", () => {
  it("targetPerson = bên còn lại của mối quan hệ", () => {
    const mapped = mapRelationshipRow(row({ person_a: "me", person_b: "other", person_b_data: person("other") }), "me");
    expect(mapped.targetPerson.id).toBe("other");
    expect(mapped.direction).toBe("child");
  });

  it("bỏ dòng thiếu targetPerson", () => {
    const mapped = mapRelationshipRows([row(), row({ id: "r2", person_a_data: undefined, person_b_data: undefined })], "p1");
    expect(mapped).toHaveLength(1);
    expect(mapped[0].id).toBe("r1");
  });
});

describe("collectChildIds", () => {
  it("chỉ lấy direction child", () => {
    const rows = [
      { id: "1", type: "biological_child" as const, direction: "child" as const, targetPerson: person("c1"), note: null },
      { id: "2", type: "biological_child" as const, direction: "parent" as const, targetPerson: person("p9"), note: null },
      { id: "3", type: "adopted_child" as const, direction: "child" as const, targetPerson: person("c2"), note: null }
    ];
    expect(collectChildIds(rows)).toEqual(["c1", "c2"]);
  });
});

describe("formatChildInLawNote", () => {
  it("vợ của con → Con dâu", () => {
    expect(formatChildInLawNote("female", "An", null)).toBe("Con dâu (vợ của An)");
  });
  it("chồng của con → Con rể", () => {
    expect(formatChildInLawNote("male", "An", null)).toBe("Con rể (chồng của An)");
  });
  it("giới tính khác/thiếu → Vợ/chồng của", () => {
    expect(formatChildInLawNote("other", "An", null)).toBe("Vợ/chồng của An");
  });
  it("có note gốc → nối thêm", () => {
    expect(formatChildInLawNote("male", "An", "ghi chú")).toBe("Con rể (chồng của An) - ghi chú");
  });
});

describe("toChildInLawRow / buildChildInLawRows", () => {
  it("dựng child_in_law từ hôn nhân của con", () => {
    const m = row({ id: "m1", type: "marriage", person_a: "c1", person_b: "s1", person_a_data: person("c1"), person_b_data: person("s1", { gender: "female" }) });
    const out = toChildInLawRow(m, ["c1"]);
    expect(out).toMatchObject({ id: "m1_inlaw", direction: "child_in_law", note: "Con dâu (vợ của c1)" });
  });

  it("bỏ row thiếu data một bên (hướng dẫn con = person_a nếu không match childrenIds)", () => {
    // HÀNH VI GỐC: API đã lọc sẵn person_ids=con nên childrenIds chỉ dùng để chọn hướng;
    // row thiếu data 1 bên mới bị bỏ (null) — các row khác đều map.
    const m = row({ id: "m2", type: "marriage", person_a: "x", person_b: "y", person_a_data: person("x"), person_b_data: undefined });
    expect(toChildInLawRow(m, ["c1"])).toBeNull();
    expect(buildChildInLawRows([m], ["c1"])).toEqual([]);
  });

  it("buildChildInLawRows giữ row đủ data, bỏ row thiếu data", () => {
    const good = row({ id: "m1", type: "marriage", person_a: "c1", person_b: "s1", person_a_data: person("c1"), person_b_data: person("s1", { gender: "male" }) });
    const missing = row({ id: "m2", type: "marriage", person_a: "z", person_b: "y", person_a_data: person("z"), person_b_data: undefined });
    const out = buildChildInLawRows([good, missing], ["c1"]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("m1_inlaw");
  });
});

describe("buildPersonPayload", () => {
  it("cắt tên + bỏ qua birthYear rỗng", () => {
    expect(buildPersonPayload({ name: "  Nguyễn A  ", gender: "male", birthYear: "" })).toEqual({ full_name: "Nguyễn A", gender: "male" });
  });

  it("parse birthYear hợp lệ", () => {
    expect(buildPersonPayload({ name: "A", gender: "female", birthYear: "1990" }).birth_year).toBe(1990);
  });

  it("bỏ birthYear không phải số", () => {
    expect(buildPersonPayload({ name: "A", gender: "female", birthYear: "abc" }).birth_year).toBeUndefined();
  });
});

describe("inferSpouseGender", () => {
  it("ngược giới với người hiện tại", () => {
    expect(inferSpouseGender("male")).toBe("female");
    expect(inferSpouseGender("female")).toBe("male");
  });
  it("không rõ → mặc định female", () => {
    expect(inferSpouseGender("other")).toBe("female");
    expect(inferSpouseGender("")).toBe("female");
  });
});

describe("validBulkChildren", () => {
  it("chỉ giữ dòng có tên", () => {
    expect(validBulkChildren([{ name: " A " }, { name: "" }, { name: "B" }])).toHaveLength(2);
  });
});

describe("resolveRelEndpoints / resolveRelType", () => {
  it("parent → đảo chiều person_a/person_b", () => {
    expect(resolveRelEndpoints("parent", "me", "t")).toEqual({ personA: "t", personB: "me" });
    expect(resolveRelEndpoints("child", "me", "t")).toEqual({ personA: "me", personB: "t" });
    expect(resolveRelEndpoints("spouse", "me", "t")).toEqual({ personA: "me", personB: "t" });
  });

  it("spouse ép marriage; adopted_child giữ nguyên", () => {
    expect(resolveRelType("spouse", "biological_child")).toBe("marriage");
    expect(resolveRelType("child", "adopted_child")).toBe("adopted_child");
    expect(resolveRelType("child", "biological_child")).toBe("biological_child");
  });
});
