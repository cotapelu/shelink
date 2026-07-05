import { describe, it, expect, vi, beforeEach } from "vitest";
import { listAuditLogs, getAuditFilterOptions, AuditFilter } from "@/server/audit-list";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma");

const mockRequireSession = vi.mocked(requireSession);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "ADMIN", name: "Admin" }
  } as any);
  // Setup prisma models
  mockPrisma.auditLog = {
    findMany: vi.fn(),
    findRaw: vi.fn(),
  } as any;
  mockPrisma.user = {
    findMany: vi.fn(),
  } as any;
});

describe("audit-list", () => {
  describe("listAuditLogs", () => {
    it("should list with default limit and no filters", async () => {
      const mockItems = [
        { id: "a1", createdAt: new Date(), action: "CREATE", targetType: "Matter", targetId: "m1", detail: {}, ip: "1.2.3.4", user: { id: "u1", name: "User" } }
      ] as any;
      mockPrisma.auditLog.findMany.mockResolvedValue(mockItems);

      const result = await listAuditLogs({});

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
        take: 51, // default limit + 1 for hasMore
        cursor: undefined,
        select: {
          id: true,
          createdAt: true,
          action: true,
          targetType: true,
          targetId: true,
          detail: true,
          ip: true,
          user: { select: { id: true, name: true } }
        }
      });
    });

    it("should apply filters", async () => {
      const filter: AuditFilter = { userId: "u2", action: "UPDATE", targetType: "Client", startStr: "2024-01-01", endStr: "2024-12-31", limit: 10 };
      const mockItems = Array(11).fill({ id: "a" });
      mockPrisma.auditLog.findMany.mockResolvedValue(mockItems);

      await listAuditLogs(filter);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "u2",
            action: "UPDATE",
            targetType: "Client",
            // createdAt range: inclusive start, exclusive end
            createdAt: expect.objectContaining({
              gte: expect.anything(),
              lt: expect.anything()
            })
          }),
          take: 11, // limit + 1
        })
      );
    });

    it("should enforce limit bounds", async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([] as any);

      await listAuditLogs({ limit: 500 }); // exceeds max 200

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 201 })
      );
    });

    it("should paginate with cursor", async () => {
      const mockItems = [{ id: "a1" }, { id: "a2" }] as any;
      mockPrisma.auditLog.findMany.mockResolvedValue(mockItems);

      await listAuditLogs({ limit: 1, cursor: "lastId" });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 2,
          cursor: { id: "lastId" }
        })
      );
    });

    it("should throw for non-admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u2", role: "LAWYER", name: "Lawyer" }
      } as any);

      await expect(listAuditLogs({})).rejects.toThrow("仅管理员 / 主任律师");
    });
  });

  describe("getAuditFilterOptions", () => {
    it("should return distinct actions, targetTypes, and active users", async () => {
      const actionsRaw = [{ action: "CREATE" }, { action: "UPDATE" }];
      const targetsRaw = [{ targetType: "Matter" }, { targetType: "Client" }];
      const users = [{ id: "u1", name: "Alice" }, { id: "u2", name: "Bob" }] as any;

      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce(actionsRaw)
        .mockResolvedValueOnce(targetsRaw);
      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await getAuditFilterOptions();

      expect(result.actions).toEqual(["CREATE", "UPDATE"]);
      expect(result.targetTypes).toEqual(["Client", "Matter"]);
      expect(result.users).toEqual(users);
      expect(mockPrisma.auditLog.findMany).toHaveBeenNthCalledWith(1, {
        select: { action: true },
        distinct: ["action"],
        take: 200
      });
      expect(mockPrisma.auditLog.findMany).toHaveBeenNthCalledWith(2, {
        where: { targetType: { not: null } },
        select: { targetType: true },
        distinct: ["targetType"],
        take: 100
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      });
    });

    it("throws for non-admin", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u2", role: "ASSISTANT", name: "Assist" }
      } as any);

      await expect(getAuditFilterOptions()).rejects.toThrow("仅管理员 / 主任律师");
    });
  });
});