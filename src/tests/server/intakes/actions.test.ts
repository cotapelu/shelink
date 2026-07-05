// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import cuid from "cuid";
import {
  getIntakeById,
  declineIntake,
  markIntakeNeedsRevision,
  resubmitIntake,
  convertIntakeToMatter,
  listIntakes,
  createIntake
} from "@/server/intakes/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import { withMetrics } from "@/lib/telemetry/server-metrics";
import { seedDefaultFolders } from "@/lib/default-folders";
import * as helpers from "@/server/intakes/helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    intake: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn()
    }, 
    matter: { create: vi.fn(), update: vi.fn() },
    audit: { create: vi.fn() },
    party: { create: vi.fn() },
    procedureParty: { createMany: vi.fn() },
    billing: { create: vi.fn() },
    document: { updateMany: vi.fn() },
    timelineEvent: { create: vi.fn() },
    client: { create: vi.fn(), findUnique: vi.fn() },
    contact: { create: vi.fn(), findFirst: vi.fn() },
    causeOfAction: { findUnique: vi.fn() },
    matterProcedure: { create: vi.fn() },
    $transaction: vi.fn()
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/server/notifications/approval");
vi.mock("@/lib/telemetry/server-metrics", () => ({
  withMetrics: vi.fn((name, fn) => fn)
}));
vi.mock("@/lib/default-folders");
vi.mock("@/server/intakes/helpers", () => ({
  requireApprover: vi.fn(),
  assertConflictReviewAllowsConversion: vi.fn(),
  clientTypeToPartyType: vi.fn(() => "COMPANY")
}));
vi.mock("@/server/matters/code-generator", () => ({
  generateInternalCode: vi.fn(() => Promise.resolve("INT-001")),
  generateFirmCaseNo: vi.fn(() => Promise.resolve("CASE-001"))
}));

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockNotifyRoleApprovers = vi.mocked(notifyRoleApprovers);
const mockWithMetrics = vi.mocked(withMetrics);
const mockSeedDefaultFolders = vi.mocked(seedDefaultFolders);
const mockRequireApprover = vi.mocked(helpers.requireApprover);
const mockAssertConflictReview = vi.mocked(helpers.assertConflictReviewAllowsConversion);
const mockClientTypeToPartyType = vi.mocked(helpers.clientTypeToPartyType);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } });
  mockWithMetrics.mockImplementation((name, fn) => fn);
  mockSeedDefaultFolders.mockResolvedValue(undefined);
  mockRequireApprover.mockImplementation(() => {});
  mockAssertConflictReview.mockImplementation(() => {});
  mockClientTypeToPartyType.mockReturnValue("COMPANY");

  // Setup $transaction to execute callback with a tx object containing the mocked prisma methods
  mockPrisma.$transaction.mockImplementation(async (cb) => {
    const tx = {
      intake: mockPrisma.intake,
      matter: mockPrisma.matter,
      party: mockPrisma.party,
      procedureParty: mockPrisma.procedureParty,
      billing: mockPrisma.billing,
      document: mockPrisma.document,
      timelineEvent: mockPrisma.timelineEvent,
      client: mockPrisma.client,
      contact: mockPrisma.contact,
      causeOfAction: mockPrisma.causeOfAction,
      matterProcedure: mockPrisma.matterProcedure
    };
    return await cb(tx as any);
  });

  // Default mocks for various prisma methods to avoid unhandled promises
  mockPrisma.intake.findMany.mockResolvedValue([]);
  mockPrisma.intake.count.mockResolvedValue(0);
  mockPrisma.party.create.mockResolvedValue({ id: "party" } as any);
  mockPrisma.procedureParty.createMany.mockResolvedValue({ count: 0 } as any);
  mockPrisma.billing.create.mockResolvedValue({ id: "bill" } as any);
  mockPrisma.document.updateMany.mockResolvedValue({ count: 0 } as any);
  mockPrisma.timelineEvent.create.mockResolvedValue({ id: "event" } as any);
  mockPrisma.matterProcedure.create.mockResolvedValue({ id: "proc" } as any);
  mockPrisma.client.create.mockResolvedValue({ id: "client" } as any);
  mockPrisma.client.findUnique.mockResolvedValue(null as any);
  mockPrisma.contact.create.mockResolvedValue({ id: "contact" } as any);
  mockPrisma.contact.findFirst.mockResolvedValue(null as any);
  mockPrisma.causeOfAction.findUnique.mockResolvedValue({ name: "Cause" } as any);
});

describe("intakes actions", () => {
  describe("listIntakes", () => {
    it("should list intakes with default params", async () => {
      const mockIntakes = [{ id: "i1", title: "Test Intake" } as any];
      mockPrisma.intake.findMany.mockResolvedValue(mockIntakes);
      mockPrisma.intake.count.mockResolvedValue(1);

      const result = await listIntakes({});

      expect(result.items).toEqual(mockIntakes);
      expect(result.total).toBe(1);
      expect(mockPrisma.intake.findMany).toHaveBeenCalled();
      expect(mockPrisma.intake.count).toHaveBeenCalled();
    });

    it("should apply filters and pagination", async () => {
      const mockIntakes = [{ id: "i2" } as any];
      mockPrisma.intake.findMany.mockResolvedValue(mockIntakes);
      mockPrisma.intake.count.mockResolvedValue(5);

      const result = await listIntakes({
        status: "PENDING_CONFIRMATION",
        category: "CIVIL_COMMERCIAL",
        page: 2,
        pageSize: 10,
        sortBy: "claimAmount",
        sortDir: "asc"
      });

      expect(result.items).toEqual(mockIntakes);
      expect(result.total).toBe(5);
      expect(mockPrisma.intake.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      );
    });
  });

  describe("getIntakeById", () => {
    it("should return intake if owned and found", async () => {
      mockPrisma.intake.findFirst.mockResolvedValue({ id: "i1" } as any);
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: "i1",
        title: "Test"
      } as any);

      const result = await getIntakeById("i1");
      expect(result.title).toBe("Test");
    });

    it("should throw if not owned", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } });
      mockPrisma.intake.findFirst.mockResolvedValue(null as any);
      await expect(getIntakeById("i1")).rejects.toThrow("收案记录不存在");
    });

    it("should return null if intake not found after ownership check", async () => {
      mockPrisma.intake.findFirst.mockResolvedValue({ id: "i1" } as any);
      mockPrisma.intake.findUnique.mockResolvedValue(null as any);
      const result = await getIntakeById("i1");
      expect(result).toBeNull();
    });
  });

  describe("declineIntake", () => {
    it("should decline intake", async () => {
      const intakeId = cuid();
      mockPrisma.intake.update.mockResolvedValue({ id: intakeId, status: "DECLINED" } as any);
      await declineIntake({ id: intakeId, reason: "Incomplete" });
      expect(mockPrisma.intake.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: intakeId },
          data: { status: "DECLINED", declinedReason: "Incomplete" }
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "INTAKE_DECLINE", targetId: intakeId })
      );
    });
  });

  describe("markIntakeNeedsRevision", () => {
    it("should mark intake needs revision", async () => {
      const intakeId = cuid();
      mockPrisma.intake.update.mockResolvedValue({ id: intakeId, status: "NEEDS_REVISION" } as any);
      await markIntakeNeedsRevision({ id: intakeId, reason: "Missing info" });
      expect(mockPrisma.intake.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: intakeId },
          data: { status: "NEEDS_REVISION", declinedReason: "Missing info" }
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "INTAKE_NEEDS_REVISION", targetId: intakeId })
      );
    });
  });

  describe("resubmitIntake", () => {
    it("should resubmit intake", async () => {
      const intakeId = cuid();
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: intakeId,
        status: "NEEDS_REVISION",
        title: "Title"
      } as any);
      mockPrisma.intake.update.mockResolvedValue({ id: intakeId, status: "PENDING_CONFIRMATION" } as any);
      await resubmitIntake(intakeId);
      expect(mockPrisma.intake.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: intakeId },
          data: { status: "PENDING_CONFIRMATION", declinedReason: null }
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "INTAKE_RESUBMIT", targetId: intakeId })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/intakes");
    });

    it("should throw if intake not found", async () => {
      mockPrisma.intake.findUnique.mockResolvedValue(null as any);
      await expect(resubmitIntake("i1")).rejects.toThrow("收案不存在");
    });

    it("should throw if status not NEEDS_REVISION", async () => {
      mockPrisma.intake.findUnique.mockResolvedValue({ id: "i1", status: "PENDING" } as any);
      await expect(resubmitIntake("i1")).rejects.toThrow("只有待补正状态可重新提交");
    });
  });

  describe("convertIntakeToMatter", () => {
    it("should convert intake to matter", async () => {
      const intakeId = cuid();
      const mockClient = { id: "c1", name: "Client", type: "COMPANY" } as any;
      const mockIntake = {
        id: intakeId,
        title: "Intake Title",
        category: "CIVIL",
        client: mockClient,
        parties: [],
        conflictChecks: [],
        documents: [],
        ownerUserId: "u1",
        coUserIds: [],
        ourStanding: "PLAINTIFF",
        claimAmount: 10000,
        feeAmount: 5000,
        feeType: "FIXED",
        feeSchedule: "upfront",
        firstProcedureType: "FIRST_INSTANCE",
        firstAgency: "Agency",
        jurisdiction: "Jurisdiction",
        receivedAt: new Date(),
        counterclaim: false,
        businessType: "Business",
        serviceScope: "Scope",
        deliverables: "Deliverables",
        counselType: "Counsel",
        serviceStart: new Date(),
        serviceEnd: new Date()
      } as any;
      mockPrisma.intake.findUnique.mockResolvedValue(mockIntake);
      mockPrisma.matter.create.mockResolvedValue({ id: "m1", internalCode: "INT-001", firmCaseNo: "CASE-001" } as any);
      mockPrisma.intake.update.mockResolvedValue({ id: intakeId, status: "CONVERTED" } as any);
      mockPrisma.audit.create.mockResolvedValue({} as any);
      mockPrisma.party.create.mockResolvedValue({ id: "party1" } as any);
      mockPrisma.procedureParty.createMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.billing.create.mockResolvedValue({ id: "bill1" } as any);
      mockPrisma.document.updateMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.timelineEvent.create.mockResolvedValue({ id: "event1" } as any);
      mockPrisma.matterProcedure.create.mockResolvedValue({ id: "proc1" } as any);
      mockRevalidatePath.mockImplementation(() => {});

      await convertIntakeToMatter(intakeId);

      // Verify matter creation
      expect(mockPrisma.matter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Intake Title",
            category: "CIVIL",
            ownerId: "u1",
            intakeId: intakeId,
            ourStanding: "PLAINTIFF",
            claimAmount: 10000,
          })
        })
      );

      // Verify intake status update to CONVERTED (inside transaction)
      expect(mockPrisma.intake.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: intakeId },
          data: { status: "CONVERTED" }
        })
      );

      // Verify audit
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "INTAKE_CONVERT",
          targetId: intakeId
        })
      );

      // Verify revalidation
      expect(mockRevalidatePath).toHaveBeenCalledWith("/matters");
    });

    it("should throw if intake not found", async () => {
      mockPrisma.intake.findUnique.mockResolvedValue(null as any);
      await expect(convertIntakeToMatter("i1")).rejects.toThrow("Intake 不存在");
    });

    it("should throw if intake already converted", async () => {
      const intakeId = cuid();
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: intakeId,
        status: "CONVERTED"
      } as any);
      await expect(convertIntakeToMatter(intakeId)).rejects.toThrow("此 Intake 已转化");
    });
  });

  describe("createIntake", () => {
    it("should create intake with clientId", async () => {
      const sessionUser = { id: "u1", role: "ADMIN", name: "Admin" };
      mockRequireSession.mockResolvedValue({ user: sessionUser } as any);
      const clientId = cuid();
      const input = {
        title: "Test Intake",
        category: "CIVIL_COMMERCIAL",
        clientId,
        ourStanding: "PLAINTIFF"
      };
      const mockClient = { id: clientId, name: "Client Name", type: "COMPANY" } as any;
      mockPrisma.client.findUnique.mockResolvedValue(mockClient as any);
      const mockIntake = {
        id: "i1",
        title: "TestIntake",
        category: "CIVIL_COMMERCIAL",
        clientId,
        ourStanding: "PLAINTIFF",
        ownerUserId: sessionUser.id,
        coUserIds: [],
        createdById: sessionUser.id,
        status: "PENDING_CONFIRMATION",
        receivedAt: expect.any(Date)
      } as any;
      mockPrisma.intake.create.mockResolvedValue(mockIntake as any);

      await createIntake(input as any);

      expect(mockPrisma.intake.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "TestIntake",
            category: "CIVIL_COMMERCIAL",
            clientId,
            ourStanding: "PLAINTIFF",
            ownerUserId: sessionUser.id,
            createdById: sessionUser.id,
            status: "PENDING_CONFIRMATION"
          })
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "INTAKE_CREATE",
          targetId: "i1"
        })
      );
      expect(mockNotifyRoleApprovers).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/intakes");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/matters");
    });
  });
});