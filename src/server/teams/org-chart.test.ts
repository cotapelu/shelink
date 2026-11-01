import { describe, it, expect } from "vitest";
import { buildOrgChart, normalizeOrgRole, sortOrgMembers, type OrgMember, type OrgTeamInput } from "./org-chart";

/** Dòng Thành viên mẫu kiểu Prisma (join User). */
function memberRow(userId: string, name: string | null, role: string) {
  return { role, user: { id: userId, name, email: `${userId}@shelink.local`, avatar: null } };
}

describe("normalizeOrgRole", () => {
  it("giữ nguyên vai trò hợp lệ", () => {
    expect(normalizeOrgRole("OWNER")).toBe("OWNER");
    expect(normalizeOrgRole("ADMIN")).toBe("ADMIN");
    expect(normalizeOrgRole("MEMBER")).toBe("MEMBER");
    expect(normalizeOrgRole("GUEST")).toBe("GUEST");
  });

  it("vai trò lạ/thiếu/không phải chuỗi → MEMBER", () => {
    expect(normalizeOrgRole("SUPERBOSS")).toBe("MEMBER");
    expect(normalizeOrgRole(undefined)).toBe("MEMBER");
    expect(normalizeOrgRole(42)).toBe("MEMBER");
  });
});

describe("sortOrgMembers", () => {
  const base: OrgMember[] = [
    { userId: "u1", name: "Bi", role: "MEMBER", email: null, avatar: null },
    { userId: "u2", name: "An", role: "GUEST", email: null, avatar: null },
    { userId: "u3", name: "Chi", role: "OWNER", email: null, avatar: null },
    { userId: "u4", name: "Aa", role: "MEMBER", email: null, avatar: null }
  ];

  it("sắp theo cấp vai trò trước, rồi tên A→Z", () => {
    const sorted = sortOrgMembers(base).map((m) => [m.role, m.name]);
    expect(sorted).toEqual([
      ["OWNER", "Chi"],
      ["MEMBER", "Aa"],
      ["MEMBER", "Bi"],
      ["GUEST", "An"]
    ]);
  });

  it("không mutate mảng đầu vào", () => {
    const snapshot = base.map((m) => m.userId);
    sortOrgMembers(base);
    expect(base.map((m) => m.userId)).toEqual(snapshot);
  });
});

describe("buildOrgChart", () => {
  it("rỗng → totals bằng 0", () => {
    const chart = buildOrgChart([]);
    expect(chart).toEqual({ teams: [], totalTeams: 0, totalMembers: 0 });
  });

  it("đếm thành viên mỗi team và tổng số", () => {
    const chart = buildOrgChart([
      { id: "t1", name: "Kế toán", members: [memberRow("u1", "An", "MEMBER"), memberRow("u2", "Bình", "OWNER")] },
      { id: "t2", name: "Thiết kế", members: [memberRow("u3", "Cúc", "ADMIN")] }
    ]);
    expect(chart.totalTeams).toBe(2);
    expect(chart.totalMembers).toBe(3);
    expect(chart.teams.map((t) => t.memberCount)).toEqual([2, 1]);
  });

  it("sắp team theo tên A→Z", () => {
    const chart = buildOrgChart([
      { id: "t2", name: "Zulu", members: [] },
      { id: "t1", name: "Alpha", members: [] }
    ]);
    expect(chart.teams.map((t) => t.name)).toEqual(["Alpha", "Zulu"]);
  });

  it("thành viên trong chart đã sắp vai trò rồi tên", () => {
    const chart = buildOrgChart([
      { id: "t1", name: "Nhóm", members: [memberRow("u1", "Bee", "GUEST"), memberRow("u2", "Ay", "OWNER"), memberRow("u3", "Cee", "MEMBER")] }
    ]);
    expect(chart.teams[0].members.map((m) => m.role)).toEqual(["OWNER", "MEMBER", "GUEST"]);
  });

  it("khử trùng cùng userId trong 1 team, giữ vai trò mạnh nhất", () => {
    const chart = buildOrgChart([
      { id: "t1", name: "Nhóm", members: [memberRow("u1", "An", "MEMBER"), memberRow("u1", "An", "ADMIN"), memberRow("u1", "An", "GUEST")] }
    ]);
    expect(chart.teams[0].members).toHaveLength(1);
    expect(chart.teams[0].members[0].role).toBe("ADMIN");
  });

  it("bỏ qua team thiếu id/name và thành viên thiếu user", () => {
    const inputs = [
      { id: "", name: "Hỏng", members: [memberRow("u1", "An", "MEMBER")] },
      { id: "t9", name: "", members: [memberRow("u1", "An", "MEMBER")] },
      { id: "t1", name: "Tốt", members: [{ role: "MEMBER", user: { id: "", name: "Hỏng" } }] }
    ] as unknown as OrgTeamInput[];
    const chart = buildOrgChart(inputs);
    expect(chart.totalTeams).toBe(1);
    expect(chart.teams[0].name).toBe("Tốt");
    expect(chart.totalMembers).toBe(0);
  });

  it("tên thiếu → fallback email, cuối cùng 'Không tên'", () => {
    const chart = buildOrgChart([
      {
        id: "t1",
        name: "Nhóm",
        members: [
          { role: "MEMBER", user: { id: "u1", name: null, email: "u1@shelink.local" } },
          { role: "MEMBER", user: { id: "u2", name: null } }
        ]
      }
    ]);
    expect(chart.teams[0].members.map((m) => m.name).sort()).toEqual(["Không tên", "u1@shelink.local"]);
  });
});
