// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBilling,
  deleteBilling,
  setCommissionPlan,
  createFeeEntry,
  getMatterFinance,
  listMatterInvoiceRequests,
  getMatterInvoiceContext,
  listAllFeeEntries,
  // other finance functions later
} from "@/server/finance/actions";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAccessMatter, assertCanAssociateMatter, assertCanLeadMatter, isManager, matterVisibilityFilter } from "@/lib/permissions";

vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    billing: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    matter: {
      findUnique: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    intake: {
      findFirst: vi.fn(),
    },
    commissionPlan: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    feeEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    timelineEvent: {
      create: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
    },
    invoiceRequest: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/archive/guard", () => ({
  assertMatterWritable: vi.fn(),
}));
vi.mock("@/lib/permissions", () => ({
  assertCanAccessMatter: vi.fn(),
  assertCanAssociateMatter: vi.fn(),
  assertCanLeadMatter: vi.fn(),
  isManager: vi.fn(),
  matterVisibilityFilter: vi.fn(),
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockAudit = vi.mocked(audit, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockPrisma = vi.mocked(prisma, true);

// $transaction: support both array and function styles
mockPrisma.$transaction = vi.fn().mockImplementation(async (arg) => {
  if (typeof arg === "function") {
    return arg(mockPrisma);
  }
  return undefined;
}) as any;
const mockAssertMatterWritable = vi.mocked(assertMatterWritable, true);
const mockAssertCanLeadMatter = vi.mocked(assertCanLeadMatter, true);
const mockAssertCanAccessMatter = vi.mocked(assertCanAccessMatter, true);
const mockIsManager = vi.mocked(isManager, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: CUID(1), role: "LAWYER" },
  } as any);
  mockAssertMatterWritable.mockResolvedValue(undefined);
  mockAssertCanLeadMatter.mockResolvedValue(undefined);
  mockAssertCanAccessMatter.mockResolvedValue(undefined);
  mockIsManager.mockReturnValue(false);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`;

describe("finance/actions", () => {
  describe("createBilling", () => {
    it("should create billing and audit", async () => {
      const input = {
        matterId: CUID(2),
        title: "Contract A",
        contractAmount: 100000,
        status: "DRAFT",
      };
      mockAssertMatterWritable.mockResolvedValue(undefined);
      mockPrisma.billing.create.mockResolvedValue({
        id: CUID(3),
        matterId: CUID(2),
        title: "Contract A",
        contractAmount: new Prisma.Decimal(100000),
        status: "DRAFT",
      } as any);

      const result = await createBilling(input as any);

      expect(mockPrisma.billing.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matterId: CUID(2),
          title: "Contract A",
          contractAmount: expect.any(Prisma.Decimal),
          status: "DRAFT",
        }),
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "BILLING_CREATE",
          targetType: "Billing",
          targetId: CUID(3),
          detail: { matterId: CUID(2) },
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(result).toEqual({ ok: true, id: CUID(3) });
    });

    it("should parse schedule and signedAt optional", async () => {
      const input = {
        matterId: CUID(2),
        title: "Contract B",
        contractAmount: 50000,
        schedule: "Monthly",
        signedAt: new Date("2025-07-07"),
      };
      mockAssertMatterWritable.mockResolvedValue(undefined);
      mockPrisma.billing.create.mockResolvedValue({ id: CUID(4) } as any);

      await createBilling(input as any);

      expect(mockPrisma.billing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schedule: "Monthly",
            signedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("deleteBilling", () => {
    it("should delete billing with FINANCE role", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "FINANCE" },
      } as any);
      mockPrisma.billing.findUnique.mockResolvedValue({
        id: CUID(1),
        matterId: CUID(2),
      });
      mockPrisma.billing.delete.mockResolvedValue({ id: CUID(1) } as any);

      const result = await deleteBilling(CUID(1));

      expect(mockPrisma.billing.delete).toHaveBeenCalledWith({
        where: { id: CUID(1) },
      });
      expect(mockAssertMatterWritable).toHaveBeenCalledWith(CUID(2), { allowFinanceRole: true });
      expect(result).toEqual({ ok: true });
    });

    it("should delete billing with LAWYER role requiring lead permission", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "LAWYER" },
      } as any);
      mockPrisma.billing.findUnique.mockResolvedValue({
        id: CUID(1),
        matterId: CUID(2),
      });
      mockPrisma.billing.delete.mockResolvedValue({ id: CUID(1) } as any);

      const result = await deleteBilling(CUID(1));

      expect(mockAssertMatterWritable).toHaveBeenCalledWith(CUID(2));
      expect(mockAssertCanLeadMatter).toHaveBeenCalledWith(CUID(1), CUID(2), "仅案件主办/协办或财务可删除合同");
      expect(result).toEqual({ ok: true });
    });

    it("should return { ok: false } if billing not found", async () => {
      mockPrisma.billing.findUnique.mockResolvedValue(null);
      const result = await deleteBilling(CUID(1));
      expect(result).toEqual({ ok: false });
    });
  });

  describe("setCommissionPlan", () => {
    it("should set commission plan with transaction", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "LAWYER" },
      } as any);
      mockAssertMatterWritable.mockResolvedValue(undefined);
      mockAssertCanLeadMatter.mockResolvedValue(undefined);
      mockPrisma.commissionPlan.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.commissionPlan.createMany.mockResolvedValue({ count: 2 } as any);

      const input = {
        matterId: CUID(2),
        items: [
          { userId: CUID(10), percent: 10, label: "Share" },
          { userId: CUID(11), percent: 20 },
        ],
      } as any;
      const result = await setCommissionPlan(input);

      expect(mockPrisma.commissionPlan.deleteMany).toHaveBeenCalledWith({
        where: { matterId: CUID(2) },
      });
      expect(mockPrisma.commissionPlan.createMany).toHaveBeenCalledWith({
        data: [
          {
            matterId: CUID(2),
            userId: CUID(10),
            percent: expect.any(Prisma.Decimal),
            label: "Share",
            active: true,
          },
          {
            matterId: CUID(2),
            userId: CUID(11),
            percent: expect.any(Prisma.Decimal),
            label: null,
            active: true,
          },
        ],
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "COMMISSION_PLAN_SET",
          targetType: "Matter",
          targetId: CUID(2),
          detail: { itemCount: 2 },
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(result).toEqual({ ok: true });
    });

    it("should validate percent range", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "LAWYER" },
      } as any);
      const input = {
        matterId: CUID(2),
        items: [{ userId: CUID(10), percent: 150 }],
      } as any;
      await expect(setCommissionPlan(input)).rejects.toThrow();
    });
  });

  describe("createFeeEntry", () => {
    it("should create RECEIVED entry with commission children", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "LAWYER" },
      } as any);
      mockAssertMatterWritable.mockResolvedValue(undefined);
      mockAssertCanLeadMatter.mockResolvedValue(undefined);

      const input = {
        matterId: CUID(2),
        type: "RECEIVED",
        amount: 1000,
        occurredAt: new Date(),
      } as any;

      // Mock commission plan
      mockPrisma.commissionPlan.findMany.mockResolvedValue([
        { userId: CUID(10), percent: 10, active: true },
        { userId: CUID(11), percent: 5, active: true },
      ]);

      // Mock feeEntry create for parent and children
      mockPrisma.feeEntry.create.mockResolvedValueOnce({
        id: CUID(100),
        matterId: CUID(2),
        type: "RECEIVED",
        amount: new Prisma.Decimal(1000),
      } as any);
      mockPrisma.feeEntry.create.mockResolvedValueOnce({
        id: CUID(101),
        type: "COMMISSION",
        amount: new Prisma.Decimal("100"), // 10%
      } as any);
      mockPrisma.feeEntry.create.mockResolvedValueOnce({
        id: CUID(102),
        type: "COMMISSION",
        amount: new Prisma.Decimal("50"), // 5%
      } as any);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);

      const result = await createFeeEntry(input);

      // Parent feeEntry created
      expect(mockPrisma.feeEntry.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            matterId: CUID(2),
            type: "RECEIVED",
            amount: expect.any(Prisma.Decimal),
            recordedById: CUID(1),
          }),
        })
      );
      // Commission children created
      expect(mockPrisma.feeEntry.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            type: "COMMISSION",
            amount: expect.any(Prisma.Decimal),
            parentFeeEntryId: CUID(100),
            beneficiaryUserId: CUID(10),
          }),
        })
      );
      expect(mockPrisma.feeEntry.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: expect.objectContaining({
            type: "COMMISSION",
            amount: expect.any(Prisma.Decimal),
            parentFeeEntryId: CUID(100),
            beneficiaryUserId: CUID(11),
          }),
        })
      );
      // Timeline event created
      expect(mockPrisma.timelineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matterId: CUID(2),
            eventType: "FEE_RECEIVED",
            title: expect.stringMatching(/^实收 ¥/),
            occurredAt: expect.any(Date),
          }),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/finance");
      expect(result).toEqual({ ok: true, id: CUID(100) });
    });

    it("should not create commission if type is not RECEIVED", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "LAWYER" },
      } as any);
      mockAssertMatterWritable.mockResolvedValue(undefined);
      mockAssertCanLeadMatter.mockResolvedValue(undefined);

      const input = {
        matterId: CUID(2),
        type: "REFUND",
        amount: 500,
        occurredAt: new Date(),
      } as any;

      mockPrisma.commissionPlan.findMany.mockResolvedValue([]);
      mockPrisma.feeEntry.create.mockResolvedValueOnce({ id: CUID(200) } as any);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);

      const result = await createFeeEntry(input);

      expect(mockPrisma.commissionPlan.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.timelineEvent.create).not.toHaveBeenCalled(); // no FEE_RECEIVED event
      expect(result).toEqual({ ok: true, id: CUID(200) });
    });

    it("should validate zod errors", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "LAWYER" },
      } as any);
      // missing required amount
      const input = {
        matterId: CUID(2),
        type: "RECEIVED",
      } as any;
      await expect(createFeeEntry(input)).rejects.toThrow();
    });
  });

  describe("getMatterFinance", () => {
    it("should aggregate finance data for matter", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID(1), role: "LAWYER" },
      } as any);
      const matterId = CUID(2);

      mockPrisma.billing.findMany.mockResolvedValue([
        { id: CUID(10), contractAmount: new Prisma.Decimal(10000) },
      ]);
      mockPrisma.feeEntry.findMany.mockResolvedValue([
        { id: CUID(20), type: "RECEIVED", amount: new Prisma.Decimal(5000), occurredAt: new Date(), payerOrPayee: "Client" },
        { id: CUID(21), type: "COMMISSION", amount: new Prisma.Decimal(500), occurredAt: new Date(), beneficiaryUserId: CUID(30) },
      ]);
      mockPrisma.commissionPlan.findMany.mockResolvedValue([
        { userId: CUID(30), percent: 10, active: true },
      ]);
      mockPrisma.invoice.findMany.mockResolvedValue([
        { id: CUID(40), total: new Prisma.Decimal(3000), status: "ISSUED" },
      ]);
      mockPrisma.invoiceRequest.findMany.mockResolvedValue([]); // no requests

      const result = await getMatterFinance(matterId);

      expect(mockPrisma.billing.findMany).toHaveBeenCalledWith({
        where: { matterId },
        orderBy: { createdAt: "desc" },
      });
      expect(mockPrisma.feeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { matterId },
          orderBy: { occurredAt: "desc" },
          include: {
            beneficiaryUser: { select: { id: true, name: true } },
            parentFeeEntry: { select: { id: true, type: true } },
          },
        })
      );
      expect(mockPrisma.commissionPlan.findMany).toHaveBeenCalledWith({
        where: { matterId },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      });
      expect(mockPrisma.invoiceRequest.findMany).toHaveBeenCalledWith({
        where: { matterId, status: "ISSUED" },
        select: { amount: true },
      });

      // Check result structure (simplified)
      expect(result).toHaveProperty('billings');
      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('plans');
      expect(result).toHaveProperty('stats');
    });
  });

  describe("listMatterInvoiceRequests", () => {
    it("should list invoice requests for matter", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: CUID(1), role: "LAWYER" } } as any);
      mockAssertCanAccessMatter.mockResolvedValue(undefined);
      const matterId = CUID(2);
      mockPrisma.invoiceRequest.findMany.mockResolvedValue([
        { id: CUID(10), amount: 1000, status: "ISSUED", title: "Inv1", requestedAt: new Date(), processedAt: new Date(), invoiceType: "INVOICE", invoiceItem: "Service", buyerName: "Client", buyerTaxNo: "123", evidenceDocIds: ["doc1"], invoiceNo: "INV-001", issuedAt: new Date() },
      ]);

      const result = await listMatterInvoiceRequests(matterId);

      expect(mockAssertCanAccessMatter).toHaveBeenCalledWith(CUID(1), "LAWYER", matterId);
      expect(mockPrisma.invoiceRequest.findMany).toHaveBeenCalledWith({
        where: { matterId },
        orderBy: { requestedAt: "desc" },
        select: {
          id: true,
          amount: true,
          title: true,
          status: true,
          processNote: true,
          requestedAt: true,
          processedAt: true,
          invoiceType: true,
          invoiceItem: true,
          buyerName: true,
          buyerTaxNo: true,
          evidenceDocIds: true,
          invoiceNo: true,
          issuedAt: true,
        },
      });
      expect(result).toHaveLength(1);
    });

    it("should throw if access denied", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: CUID(1), role: "LAWYER" } } as any);
      mockAssertCanAccessMatter.mockRejectedValue(new Error("No access"));
      await expect(listMatterInvoiceRequests(CUID(2))).rejects.toThrow("No access");
    });
  });

  describe("getMatterInvoiceContext", () => {
    it("should return context with intake", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: CUID(1) } } as any);
      const matterId = CUID(2);
      mockPrisma.matter.findUnique.mockResolvedValue({ id: matterId, internalCode: "INV-001", clientId: CUID(100) });
      mockPrisma.client.findUnique.mockResolvedValue({ id: CUID(100), name: "Client Co", taxNumber: "123456" });
      mockPrisma.intake.findFirst.mockResolvedValue({ id: CUID(200) });

      const result = await getMatterInvoiceContext(matterId);

      expect(mockPrisma.matter.findUnique).toHaveBeenCalledWith({ where: { id: matterId }, select: { id: true, internalCode: true, clientId: true } });
      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({ where: { id: CUID(100) }, select: { id: true, name: true, taxNumber: true } });
      expect(mockPrisma.intake.findFirst).toHaveBeenCalledWith({ where: { matterId }, select: { id: true } });
      expect(result).toEqual({ clientName: "Client Co", clientTaxNo: "123456", matterInternalCode: "INV-001", intakeId: CUID(200) });
    });

    it("should handle missing intake", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: CUID(1) } } as any);
      const matterId = CUID(2);
      mockPrisma.matter.findUnique.mockResolvedValue({ id: matterId, internalCode: "INV-002", clientId: CUID(100) });
      mockPrisma.client.findUnique.mockResolvedValue({ id: CUID(100), name: "Client", taxNumber: "789" });
      mockPrisma.intake.findFirst.mockResolvedValue(null);

      const result = await getMatterInvoiceContext(matterId);
      expect(result.intakeId).toBeUndefined();
    });
  });

  describe("listAllFeeEntries", () => {
    it("should require manager or finance", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: CUID(1), role: "LAWYER" } } as any);
      mockIsManager.mockReturnValue(false);
      await expect(listAllFeeEntries({})).rejects.toThrow("仅管理员或财务可查看全局收付款");
    });

    it("should list entries with filters and includes", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: CUID(1), role: "ADMIN" } } as any);
      mockIsManager.mockReturnValue(true);
      const entries = [{ id: CUID(10), type: "RECEIVED", amount: new Prisma.Decimal(100) }];
      mockPrisma.feeEntry.findMany.mockResolvedValue(entries);

      const result = await listAllFeeEntries({ matterId: CUID(2) });

      expect(mockPrisma.feeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ matterId: CUID(2) }),
          orderBy: { occurredAt: "desc" },
          include: {
            beneficiaryUser: { select: { id: true, name: true } },
            parentFeeEntry: { select: { id: true, type: true } },
            billing: { select: { id: true, title: true } },
          },
        })
      );
      expect(result).toEqual(entries);
    });
  });

});
