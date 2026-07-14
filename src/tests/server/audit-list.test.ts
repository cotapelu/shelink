import { describe, it, expect, vi, beforeEach } from "vitest";
import { listAuditLogs, getAuditFilterOptions } from "@/server/audit-list";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER" },
  } as any);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("audit-list", () => {
  describe("listAuditLogs", () => {
    it("should require admin or principal lawyer", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      await expect(listAuditLogs({})).rejects.toThrow("仅管理员 / 主任律师可访问审计日志");
    });

    it("should return items and null nextCursor when within limit", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
      } as any);
      const items = [
        { id: CUID(1), createdAt: new Date(), action: "LOGIN", user: { id: CUID(2), name: "John" } as any },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(items);

      const result = await listAuditLogs({});

      expect(result.items).toEqual(items);
      expect(result.nextCursor).toBeNull();
    });

    it("should return nextCursor when result exceeds limit", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
      } as any);
      const items = Array.from({ length: 51 }, (_, i) => ({
        id: CUID(i + 1),
        createdAt: new Date(),
        action: "TEST",
        user: null as any,
      }));
      mockPrisma.auditLog.findMany.mockResolvedValue(items);

      const result = await listAuditLogs({ limit: 50 });

      expect(result.items).toHaveLength(50);
      expect(result.nextCursor).toBe(items[49].id);
    });
  });

  describe("getAuditFilterOptions", () => {
    it("should require admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      await expect(getAuditFilterOptions()).rejects.toThrow("仅管理员 / 主任律师可访问审计日志");
    });

    it("should return distinct actions, targetTypes and active users", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
      } as any);
      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([{ action: "LOGIN" }, { action: "LOGOUT" }])
        .mockResolvedValueOnce([{ targetType: "User" }, { targetType: "Matter" }]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: CUID(1), name: "Alice" },
        { id: CUID(2), name: "Bob" },
      ]);

      const result = await getAuditFilterOptions();

      expect(result.actions.sort()).toEqual(["LOGIN", "LOGOUT"]);
      expect(result.targetTypes.sort()).toEqual(["Matter", "User"]);
      expect(result.users).toHaveLength(2);
    });
  });
});
