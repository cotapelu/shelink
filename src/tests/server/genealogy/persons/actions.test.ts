import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPersons } from "@/server/genealogy/actions";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

vi.mock("next-auth");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    person: { findMany: vi.fn(), count: vi.fn() },
  },
}));

const mockGetServerSession = vi.mocked(getServerSession, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } } as any);
  mockPrisma.person.count.mockResolvedValue(0);
});

describe("getPersons", () => {
  it("ném lỗi khi chưa đăng nhập", async () => {
    mockGetServerSession.mockResolvedValue(null as any);
    await expect(getPersons({ page: 1, limit: 10 })).rejects.toThrow("Unauthorized");
    expect(mockPrisma.person.findMany).not.toHaveBeenCalled();
  });

  it("select PHẢI gồm createdAt/updatedAt (mapPrismaPerson gọi .toISOString())", async () => {
    // Regression guard: trước đây select thiếu 2 trường này → /genealogy 500
    mockPrisma.person.findMany.mockResolvedValue([]);
    await getPersons({ page: 1, limit: 10 });
    expect(mockPrisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ createdAt: true, updatedAt: true })
      })
    );
  });

  it("trả về persons + phân trang", async () => {
    mockPrisma.person.findMany.mockResolvedValue([
      { id: "p1", fullName: "An" },
    ] as any);
    mockPrisma.person.count.mockResolvedValue(1);
    const out = await getPersons({ page: 1, limit: 10 });
    expect(out.persons).toHaveLength(1);
    expect(out).toMatchObject({ total: 1, page: 1, totalPages: 1 });
  });
});
