import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUsers } from "@/server/genealogy/users/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

vi.mock("next-auth");
vi.mock("@/lib/auth/options");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

const mockGetServerSession = vi.mocked(getServerSession, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("genealogy/users/actions", () => {
  it("should return users list for ADMIN", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u1", role: "ADMIN" },
    } as any);
    const now = new Date();
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "user1",
        email: "admin@lawlink.com",
        name: "Admin",
        role: "ADMIN",
        active: true,
        createdAt: now,
      },
      {
        id: "user2",
        email: "lawyer@lawlink.com",
        name: "Lawyer",
        role: "LAWYER",
        active: true,
        createdAt: now,
      },
    ]);

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "user1",
      email: "admin@lawlink.com",
      role: "ADMIN",
      is_active: true,
      created_at: now.toISOString(),
    });
  });

  it("should return users list for LAWYER", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u2", role: "LAWYER" },
    } as any);
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "user3",
        email: "lawyer2@lawlink.com",
        name: "Lawyer2",
        role: "LAWYER",
        active: false,
        createdAt: new Date(),
      },
    ]);

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("LAWYER");
    expect(result[0].is_active).toBe(false);
  });

  it("should reject ASSISTANT role", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u3", role: "ASSISTANT" },
    } as any);

    await expect(getUsers()).rejects.toThrow("Forbidden");
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });

  it("should reject FINANCE role", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u4", role: "FINANCE" },
    } as any);

    await expect(getUsers()).rejects.toThrow("Forbidden");
  });

  it("should reject when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(getUsers()).rejects.toThrow("Unauthorized");
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });

  it("should reject when session has no user", async () => {
    mockGetServerSession.mockResolvedValue({} as any);

    await expect(getUsers()).rejects.toThrow("Unauthorized");
  });

  it("should map createdAt to ISO string", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u5", role: "ADMIN" },
    } as any);
    const date = new Date("2025-07-07T10:00:00Z");
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "u6",
        email: "test@test.com",
        name: "Test",
        role: "LAWYER",
        active: true,
        createdAt: date,
      },
    ]);

    const result = await getUsers();

    expect(result[0].created_at).toBe(date.toISOString());
  });
});
