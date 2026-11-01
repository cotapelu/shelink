// @ts-nocheck - mock prisma nông, ép kiểu gây nhiễu test
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listOrgChart } from "./actions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { team: { findMany: vi.fn() } }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));

const mockSession = vi.mocked(requireSession, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.mockResolvedValue({ user: { id: "u1", role: "STAFF" } });
  mockPrisma.team.findMany.mockResolvedValue([]);
});

describe("listOrgChart", () => {
  it("ném lỗi khi chưa đăng nhập", async () => {
    mockSession.mockRejectedValue(new Error("Chưa đăng nhập"));
    await expect(listOrgChart()).rejects.toThrow("Chưa đăng nhập");
    expect(mockPrisma.team.findMany).not.toHaveBeenCalled();
  });

  it("chỉ đọc team + thành viên (có chặn trần take)", async () => {
    await listOrgChart();
    expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: "asc" },
        take: 200,
        select: expect.objectContaining({
          id: true,
          name: true,
          description: true,
          members: expect.anything()
        })
      })
    );
  });

  it("map kết quả DB sang chart: sắp tên team, đếm thành viên", async () => {
    mockPrisma.team.findMany.mockResolvedValue([
      {
        id: "t2",
        name: "Zulu",
        description: null,
        members: [{ role: "MEMBER", user: { id: "u1", name: "An", email: "a@x.local", avatar: null } }]
      },
      { id: "t1", name: "Alpha", description: "Nhóm đầu", members: [] }
    ]);
    const chart = await listOrgChart();
    expect(chart.totalTeams).toBe(2);
    expect(chart.totalMembers).toBe(1);
    expect(chart.teams.map((t) => t.name)).toEqual(["Alpha", "Zulu"]);
    expect(chart.teams[1].members[0].name).toBe("An");
  });
});
