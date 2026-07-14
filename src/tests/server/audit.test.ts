import { describe, it, expect, vi, beforeEach } from "vitest";
import { audit } from "@/server/audit";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

const mockPrismaAuditLog = vi.mocked(prisma.auditLog, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockPrismaAuditLog.create.mockResolvedValue({} as any);
});

describe("server/audit", () => {
  it("should call prisma.auditLog.create with mapped fields", async () => {
    const params = {
      userId: "u1",
      action: "CLIENT_CREATE",
      targetType: "Client",
      targetId: "c1",
      detail: { name: "Test" },
      ip: "127.0.0.1",
      userAgent: "test-agent",
    };
    await audit(params);

    expect(mockPrismaAuditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        action: "CLIENT_CREATE",
        targetType: "Client",
        targetId: "c1",
        detail: params.detail as any,
        ip: "127.0.0.1",
        userAgent: "test-agent",
      },
    });
  });

  it("should handle create error and not throw", async () => {
    const params = {
      userId: "u1",
      action: "TEST",
    };
    mockPrismaAuditLog.create.mockRejectedValueOnce(new Error("DB error"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(audit(params)).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith("[audit] 写入失败：", expect.any(Error));
    consoleError.mockRestore();
  });

  it("should treat undefined userId as null", async () => {
    const params = {
      userId: undefined,
      action: "ACTION",
    };
    await audit(params);
    expect(mockPrismaAuditLog.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        action: "ACTION",
        targetType: undefined,
        targetId: undefined,
        detail: undefined,
        ip: undefined,
        userAgent: undefined,
      },
    });
  });
});
