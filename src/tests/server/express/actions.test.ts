import { describe, it, expect, vi, beforeEach } from "vitest";
import { listExpress, createExpress } from "@/server/express/actions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAssociateMatter, matterAssociationFilter } from "@/lib/permissions";
import { trackExpress } from "@/lib/express/track";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    expressTracking: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    matter: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/archive/guard", () => ({
  assertMatterWritable: vi.fn(),
}));
vi.mock("@/lib/permissions", () => ({
  assertCanAssociateMatter: vi.fn(),
  matterAssociationFilter: vi.fn(),
}));
vi.mock("@/lib/express/track", () => ({
  trackExpress: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockPrisma = vi.mocked(prisma, true);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable, true);
const mockAssertCanAssociateMatter = vi.mocked(assertCanAssociateMatter, true);
const mockTrackExpress = vi.mocked(trackExpress, true);
const mockMatterAssoc = vi.mocked(matterAssociationFilter, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER" },
  } as any);
  mockMatterAssoc.mockReturnValue({ ownerId: "u1" });
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("express/actions", () => {
  describe("listExpress", () => {
    it("should require auth", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      await expect(listExpress({})).rejects.toThrow("Unauthorized");
    });

    it("should list with default params", async () => {
      const mockRecords = [
        {
          id: CUID(1),
          trackingNo: "EX-001",
          matter: { id: CUID(10), internalCode: "IN-001", title: "Matter A" },
          createdBy: { id: CUID(20), name: "User" },
        },
      ];
      mockPrisma.expressTracking.findMany.mockResolvedValue(mockRecords);

      const result = await listExpress({});

      const callArg = mockPrisma.expressTracking.findMany.mock.calls[0][0];
      // Check orderBy and include
      expect(callArg.orderBy).toEqual({ createdAt: "desc" });
      expect(callArg.include).toMatchObject({
        matter: { select: { id: true, internalCode: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      });
      // Check where structure: AND[0] contains OR with two conditions
      const accessWhere = callArg.where.AND[0];
      expect(accessWhere).toHaveProperty("OR");
      const orConditions = accessWhere.OR;
      expect(orConditions).toHaveLength(2);
      // First condition: matter with deletedAt null and ownerId u1
      expect(orConditions[0]).toMatchObject({
        matter: { deletedAt: null, ownerId: "u1" },
      });
      // Second condition: personal express (matterId null, createdById u1)
      expect(orConditions[1]).toMatchObject({
        matterId: null,
        createdById: "u1",
      });
      expect(result).toEqual(mockRecords);
    });

    it("should apply scope='mine'", async () => {
      mockPrisma.expressTracking.findMany.mockResolvedValue([]);

      await listExpress({ scope: "mine" });

      const where = mockPrisma.expressTracking.findMany.mock.calls[0][0].where;
      expect(where.createdById).toBe("u1");
    });

    it("should apply direction filter", async () => {
      mockPrisma.expressTracking.findMany.mockResolvedValue([]);

      await listExpress({ direction: "OUT" });

      const where = mockPrisma.expressTracking.findMany.mock.calls[0][0].where;
      expect(where.direction).toBe("OUT");
    });

    it("should apply search filter", async () => {
      mockPrisma.expressTracking.findMany.mockResolvedValue([]);

      await listExpress({ search: "test" });

      const where = mockPrisma.expressTracking.findMany.mock.calls[0][0].where;
      // With search, AND becomes [accessWhere, { OR: [...] }]
      expect(Array.isArray(where.AND)).toBe(true);
      expect(where.AND).toHaveLength(2);
      expect(where.AND[1]).toHaveProperty("OR");
      const searchFields = where.AND[1].OR;
      expect(searchFields.some((cond: any) => cond.trackingNo?.contains)).toBe(true);
      expect(searchFields.some((cond: any) => cond.purpose?.contains)).toBe(true);
      expect(searchFields.some((cond: any) => cond.recipient?.contains)).toBe(true);
    });
  });

  describe("createExpress", () => {
    it("should create successfully", async () => {
      const matterId = CUID(10);
      mockPrisma.matter.findUnique.mockResolvedValue({
        id: matterId,
        deletedAt: null,
      } as any);
      mockTrackExpress.mockResolvedValue({ trackingNo: "EX-123" } as any);
      mockPrisma.expressTracking.create.mockResolvedValue({
        id: CUID(1),
        trackingNo: "EX-123",
      } as any);

      const input = {
        matterId,
        purpose: "Test purpose",
        recipient: "Client",
        direction: "OUT" as const,
      };

      const result = await createExpress(input);

      expect(mockTrackExpress).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          matterId,
          direction: "OUT",
          purpose: "Test purpose",
          recipient: "Client",
          attachments: [],
          userId: "u1",
        })
      );
      expect(mockPrisma.expressTracking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trackingNo: "EX-123",
            matterId,
            purpose: "Test purpose",
            recipient: "Client",
            direction: "OUT",
            content: null,
            attachments: [],
          }),
        })
      );
      // audit should be called indirectly via trackExpress? Actually audit is called inside createExpress after create. We didn't mock audit in this file; but createExpress does not call audit directly? In the code snippet earlier, createExpress does call audit. However we didn't mock audit. We need to mock audit to avoid errors? Actually our test didn't mock `audit`. The createExpress implementation imports `audit` and calls it after successful creation. Since we haven't mocked `audit`, the real function will be used? We used `vi.mock` for `@/server/audit`? No. We did not mock `@/server/audit`. That means the real `audit` function will be called, which attempts to write to the database. That would cause an error because prisma.auditLog.create is not mocked (we only mocked expressTracking and matter). This could be the cause of failures. We need to mock `@/server/audit` as well.

Let's add mock for `@/server/audit`:

```ts
vi.mock("@/server/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));
```

Also, we need to mock `expressCreateSchema`? No, we use real schema; it's fine.

But we also need to mock `detectCompany`? Not used in basic input; but it's called inside `trackExpress`. Since we mock `trackExpress`, it won't be called. That's fine.

We also need to mock `assertMatterWritable` and `assertCanAssociateMatter`. We have mocks for those, but we should set them to resolve.

Add to beforeEach: `mockAssertMatterWritable.mockResolvedValue(undefined); mockAssertCanAssociateMatter.mockResolvedValue(undefined);` Actually these are called in createExpress? Yes, createExpress asserts matter writable and can associate. So they need to resolve.

Let's incorporate these changes.

Given the many missing pieces, I'll produce a final corrected test file with proper mocks.

Write final version:

[Prepare file content with all necessary mocks]

Let's construct it:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listExpress, createExpress } from "@/server/express/actions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAssociateMatter, matterAssociationFilter } from "@/lib/permissions";
import { trackExpress } from "@/lib/express/track";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    expressTracking: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    matter: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/archive/guard", () => ({
  assertMatterWritable: vi.fn(),
}));
vi.mock("@/lib/permissions", () => ({
  assertCanAssociateMatter: vi.fn(),
  matterAssociationFilter: vi.fn(),
}));
vi.mock("@/lib/express/track", () => ({
  trackExpress: vi.fn(),
}));
vi.mock("@/server/audit", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockPrisma = vi.mocked(prisma, true);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable, true);
const mockAssertCanAssociateMatter = vi.mocked(assertCanAssociateMatter, true);
const mockTrackExpress = vi.mocked(trackExpress, true);
const mockMatterAssoc = vi.mocked(matterAssociationFilter, true);
const mockAudit = vi.mocked(audit, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER" },
  } as any);
  mockMatterAssoc.mockReturnValue({ ownerId: "u1" });
  mockAssertMatterWritable.mockResolvedValue(undefined);
  mockAssertCanAssociateMatter.mockResolvedValue(undefined);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("express/actions", () => {
  describe("listExpress", () => {
    it("should require auth", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      await expect(listExpress({})).rejects.toThrow("Unauthorized");
    });

    it("should list with default params", async () => {
      const mockRecords = [
        {
          id: CUID(1),
          trackingNo: "EX-001",
          matter: { id: CUID(10), internalCode: "IN-001", title: "Matter A" },
          createdBy: { id: CUID(20), name: "User" },
        },
      ];
      mockPrisma.expressTracking.findMany.mockResolvedValue(mockRecords);

      const result = await listExpress({});

      const callArg = mockPrisma.expressTracking.findMany.mock.calls[0][0];
      // Basic query shape
      expect(callArg.orderBy).toEqual({ createdAt: "desc" });
      expect(callArg.include).toMatchObject({
        matter: { select: { id: true, internalCode: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      });
      // where structure
      const accessWhere = callArg.where.AND[0];
      expect(accessWhere).toHaveProperty("OR");
      const orCond = accessWhere.OR;
      expect(orCond).toHaveLength(2);
      expect(orCond[0]).toMatchObject({ matter: { deletedAt: null, ownerId: "u1" } });
      expect(orCond[1]).toMatchObject({ matterId: null, createdById: "u1" });
      expect(result).toEqual(mockRecords);
    });

    it("applies scope 'mine'", async () => {
      mockPrisma.expressTracking.findMany.mockResolvedValue([]);

      await listExpress({ scope: "mine" });

      const where = mockPrisma.expressTracking.findMany.mock.calls[0][0].where;
      expect(where.createdById).toBe("u1");
    });

    it("applies direction filter", async () => {
      mockPrisma.expressTracking.findMany.mockResolvedValue([]);

      await listExpress({ direction: "OUT" });

      const where = mockPrisma.expressTracking.findMany.mock.calls[0][0].where;
      expect(where.direction).toBe("OUT");
    });

    it("applies search filter", async () => {
      mockPrisma.expressTracking.findMany.mockResolvedValue([]);

      await listExpress({ search: "test" });

      const where = mockPrisma.expressTracking.findMany.mock.calls[0][0].where;
      expect(Array.isArray(where.AND)).toBe(true);
      expect(where.AND).toHaveLength(2);
      const searchOr = where.AND[1].OR;
      expect(searchOr.some((c: any) => c.trackingNo?.contains)).toBe(true);
      expect(searchOr.some((c: any) => c.purpose?.contains)).toBe(true);
      expect(searchOr.some((c: any) => c.recipient?.contains)).toBe(true);
    });
  });

  describe("createExpress", () => {
    it("creates successfully", async () => {
      const matterId = CUID(10);
      mockPrisma.matter.findUnique.mockResolvedValue({
        id: matterId,
        deletedAt: null,
      } as any);
      mockTrackExpress.mockResolvedValue({ trackingNo: "EX-123" } as any);
      mockPrisma.expressTracking.create.mockResolvedValue({
        id: CUID(1),
        trackingNo: "EX-123",
      } as any);

      const input = {
        matterId,
        purpose: "Test purpose",
        recipient: "Client",
        direction: "OUT" as const,
      };

      const result = await createExpress(input);

      expect(mockTrackExpress).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          matterId,
          direction: "OUT",
          purpose: "Test purpose",
          recipient: "Client",
          attachments: [],
          userId: "u1",
        })
      );
      expect(mockPrisma.expressTracking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trackingNo: "EX-123",
            matterId,
            purpose: "Test purpose",
            recipient: "Client",
            direction: "OUT",
            content: null,
            attachments: [],
          }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EXPRESS_CREATE",
          targetType: "ExpressTracking",
          targetId: expect.any(String),
          detail: expect.any(Object),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/express");
      expect(result).toMatchObject({ trackingNo: "EX-123" });
    });

    it("rejects if matter missing", async () => {
      const matterId = CUID(10);
      mockPrisma.matter.findUnique.mockResolvedValue(null);

      const input = {
        matterId,
        purpose: "Test",
        recipient: "Client",
        direction: "OUT" as const,
      };

      await expect(createExpress(input)).rejects.toThrow(
        "Vụ án không tồn tại hoặc đã xóa"
      );
    });
  });
});
