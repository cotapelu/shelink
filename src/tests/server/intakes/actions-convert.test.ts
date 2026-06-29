import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    intake: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    $transaction: vi.fn(),
    matter: { create: vi.fn() },
    procedure: { create: vi.fn() },
    party: { createMany: vi.fn() },
    billing: { create: vi.fn() },
    matterMember: { createMany: vi.fn() },
    document: { createMany: vi.fn() },
    conflictCheck: { findFirst: vi.fn() },
    systemSetting: { findUnique: vi.fn() }
  }
}));

vi.mock("@/server/intakes/helpers", () => ({
  requireApprover: vi.fn(),
  assertConflictReviewAllowsConversion: vi.fn(),
  generateTitle: vi.fn(),
  emptyToNull: vi.fn(),
  clientTypeToPartyType: vi.fn((type) =>
    type === "INDIVIDUAL" ? "NATURAL_PERSON" :
    type === "COMPANY" ? "COMPANY" :
    "OTHER_ORG"
  )
}));

vi.mock("@/server/matters/code-generator", () => ({
  generateInternalCode: vi.fn(),
  generateFirmCaseNo: vi.fn()
}));

import { convertIntakeToMatter } from "@/server/intakes/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

describe("convertIntakeToMatter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // helpers are already mocked, no need to access instance
  });

  it("throws if intake not found", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (prisma.intake.findUnique as any).mockResolvedValue(null);
    await expect(convertIntakeToMatter("i1")).rejects.toThrow("Intake 不存在");
  });

  it("throws if already converted", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (prisma.intake.findUnique as any).mockResolvedValue({
      status: "CONVERTED",
      title: "T",
      client: null,
      parties: [],
      conflictChecks: [],
      documents: []
    });
    await expect(convertIntakeToMatter("i1")).rejects.toThrow("此 Intake 已转化");
  });

  it("creates matter inside transaction and revalidates", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case Title",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u2",
      causeId: "c1",
      causeFreeText: "free",
      clientId: "cl1",
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: "PLAINTIFF",
      claimAmount: 100000,
      counterclaim: false,
      coUserIds: [],
      client: { id: "cl1", name: "Client" },
      parties: [],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn().mockResolvedValue({ id: "b1" }) },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    expect(prisma.$transaction).toHaveBeenCalled();
    // Verify transaction calls
    expect(capturedTx).not.toBeNull();
    expect(capturedTx.intake.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { status: "CONVERTED" }
    });
    expect(audit).toHaveBeenCalledWith({
      userId: "u1",
      action: "INTAKE_CONVERT",
      targetType: "Intake",
      targetId: "i1",
      detail: { matterId: "m1" }
    });
    expect(revalidatePath).toHaveBeenCalledWith("/intakes");
    expect(revalidatePath).toHaveBeenCalledWith("/intakes/i1");
    expect(revalidatePath).toHaveBeenCalledWith("/matters");
    expect(revalidatePath).toHaveBeenCalledWith("/matters/m1");
  });

  it("creates billing when feeAmount and feeType provided", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case Title",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u2",
      causeId: "c1",
      causeFreeText: "free",
      clientId: "cl1",
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: "PLAINTIFF",
      claimAmount: 100000,
      counterclaim: false,
      coUserIds: [],
      feeAmount: 5000,
      feeType: "FIXED",
      client: { id: "cl1", name: "Client" },
      parties: [],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn().mockResolvedValue({ id: "b1" }) },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    expect(capturedTx).not.toBeNull();
    expect(capturedTx.billing.create).toHaveBeenCalledWith({
      data: {
        matterId: "m1",
        title: "委托代理合同 - 固定收费",
        contractAmount: 5000,
        schedule: undefined,
        status: "ACTIVE"
      }
    });
  });

  it("updates documents when intake has documents", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case Title",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u2",
      causeId: "c1",
      causeFreeText: "free",
      clientId: "cl1",
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: "PLAINTIFF",
      claimAmount: 100000,
      counterclaim: false,
      coUserIds: [],
      client: { id: "cl1", name: "Client" },
      parties: [],
      conflictChecks: [],
      documents: [{ id: "d1" }, { id: "d2" }]
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn() },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    expect(capturedTx).not.toBeNull();
    expect(capturedTx.document.updateMany).toHaveBeenCalledWith({
      where: { intakeId: "i1" },
      data: { matterId: "m1" }
    });
  });

  it("handles coUserIds containing ownerId and missing clientId", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake: any = {
      id: "i1",
      title: "Case Title",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u2",
      causeId: "c1",
      causeFreeText: "free",
      clientId: null,
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: "PLAINTIFF",
      claimAmount: 100000,
      counterclaim: false,
      coUserIds: ["u2", "u3"],
      client: null,
      parties: [],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn().mockResolvedValue({ id: "b1" }) },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      } as any;
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    expect(capturedTx).not.toBeNull();
    // Verify nested members.create includes LEAD for owner and CO_LEAD for non-owner co-users
    const matterCreateArgs = (capturedTx.matter.create as any).mock.calls[0][0];
    const membersCreate = matterCreateArgs.data.members.create;
    expect(membersCreate).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: "u2", role: "LEAD" }),
        expect.objectContaining({ userId: "u3", role: "CO_LEAD" })
      ])
    );
    // clientLinks should be undefined (not set) when intake.clientId is null
    expect(matterCreateArgs.data.clientLinks).toBeUndefined();
  });

  it("skips procedureParty creation when no client standing and no party standing", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u2",
      causeId: "c1",
      causeFreeText: "free",
      clientId: null,
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: undefined,
      claimAmount: null,
      counterclaim: false,
      coUserIds: [],
      client: null,
      parties: [
        {
          role: "OPPOSING_PARTY" as const,
          name: "Opp",
          standing: null,
          ordinal: 1,
          partyType: "NATURAL_PERSON" as const,
          idNumber: "123456",
          phone: "",
          address: "",
          legalRep: "",
          contactName: "",
          enterpriseSocialCode: "",
          enterpriseName: "",
          notes: ""
        }
      ],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "p1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn() },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    expect(capturedTx.procedureParty.createMany).not.toHaveBeenCalled();
  });

  it("creates procedureParty entries from parties with standing", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u2",
      causeId: "c1",
      causeFreeText: "free",
      clientId: null,
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: undefined,
      claimAmount: null,
      counterclaim: false,
      coUserIds: [],
      client: null,
      parties: [
        {
          role: "OPPOSING_PARTY" as const,
          name: "Opp",
          standing: "PLAINTIFF" as const,
          ordinal: 1,
          partyType: "NATURAL_PERSON" as const,
          idNumber: "123456",
          phone: "",
          address: "",
          legalRep: "",
          contactName: "",
          enterpriseSocialCode: "",
          enterpriseName: "",
          notes: ""
        }
      ],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "p1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn() },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    expect(capturedTx.procedureParty.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          standing: "PLAINTIFF",
          partyId: "p1"
        })
      ]),
      skipDuplicates: true
    });
  });

  // Additional tests for branch coverage

  it("infer firstProcedureType as FIRST_INSTANCE for CIVIL_COMMERCIAL without firstProcedureType", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u2",
      clientId: "cl1",
      firstProcedureType: undefined,
      ourStanding: "PLAINTIFF",
      counterclaim: false,
      coUserIds: [],
      client: { id: "cl1", name: "Client" },
      parties: [],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn().mockResolvedValue({ id: "b1" }) },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    expect(capturedTx.matterProcedure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "FIRST_INSTANCE" })
      })
    );
  });

  it("infer firstProcedureType as NON_LITIGATION_PHASE for LABOR_ARBITRATION without firstProcedureType", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case",
      category: "LABOR_ARBITRATION",
      ownerUserId: "u2",
      clientId: "cl1",
      firstProcedureType: undefined,
      ourStanding: "PLAINTIFF",
      counterclaim: false,
      coUserIds: [],
      client: { id: "cl1", name: "Client" },
      parties: [],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn().mockResolvedValue({ id: "b1" }) },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    expect(capturedTx.matterProcedure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "NON_LITIGATION_PHASE" })
      })
    );
  });

  it("sets counterclaimAsPlaintiff true when counterclaim and ourStanding DEFENDANT", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u1",
      clientId: "cl1",
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: "DEFENDANT",
      claimAmount: 100000,
      counterclaim: true,
      coUserIds: [],
      client: { id: "cl1", name: "Client" },
      parties: [],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn().mockResolvedValue({ id: "b1" }) },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    expect(capturedTx.matter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          counterclaimAsPlaintiff: true,
          counterclaimAsDefendant: false
        })
      })
    );
  });

  it("sets counterclaimAsDefendant true when counterclaim and ourStanding PLAINTIFF", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u1",
      clientId: "cl1",
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: "PLAINTIFF",
      claimAmount: 100000,
      counterclaim: true,
      coUserIds: [],
      client: { id: "cl1", name: "Client" },
      parties: [],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn().mockResolvedValue({ id: "b1" }) },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    expect(capturedTx.matter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          counterclaimAsPlaintiff: false,
          counterclaimAsDefendant: true
        })
      })
    );
  });

  it("handles COMPANY client type, sets enterprise fields correctly", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case Title",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u2",
      causeId: "c1",
      causeFreeText: "free",
      clientId: "cl1",
      client: { id: "cl1", name: "Company A", type: "COMPANY", idNumber: "91110000XXXXXX" },
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: "PLAINTIFF",
      claimAmount: 100000,
      counterclaim: false,
      coUserIds: [],
      parties: [],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn().mockResolvedValue({ id: "b1" }) },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    // Check party creation includes enterprise fields
    expect(capturedTx.party.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partyType: "COMPANY",
          enterpriseSocialCode: "91110000XXXXXX",
          enterpriseName: "Company A"
        })
      })
    );
  });

  it("handles INDIVIDUAL client type, sets enterprise fields to null", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case Title",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u2",
      causeId: "c1",
      causeFreeText: "free",
      clientId: "cl1",
      client: { id: "cl1", name: "John Doe", type: "INDIVIDUAL", idNumber: "123456199001011234" },
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: "PLAINTIFF",
      claimAmount: 100000,
      counterclaim: false,
      coUserIds: [],
      parties: [],
      conflictChecks: [],
      documents: []
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn().mockResolvedValue({ id: "b1" }) },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    // For INDIVIDUAL, enterprise fields should be null
    expect(capturedTx.party.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partyType: "NATURAL_PERSON",
          enterpriseSocialCode: null,
          enterpriseName: null
        })
      })
    );
  });

  it("updates documents when intake has documents", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const mockIntake = {
      id: "i1",
      title: "Case Title",
      category: "CIVIL_COMMERCIAL",
      ownerUserId: "u2",
      causeId: "c1",
      causeFreeText: "free",
      clientId: "cl1",
      client: { id: "cl1", name: "Client", type: "COMPANY", idNumber: "code" },
      firstProcedureType: "FIRST_INSTANCE",
      ourStanding: "PLAINTIFF",
      claimAmount: 100000,
      counterclaim: false,
      coUserIds: [],
      parties: [],
      conflictChecks: [],
      documents: [{ id: "d1" }, { id: "d2" }]
    };
    (prisma.intake.findUnique as any).mockResolvedValue(mockIntake);

    let capturedTx: any = null;
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        matter: { create: vi.fn().mockResolvedValue({ id: "m1", internalCode: "IC", firmCaseNo: "FCN" }) },
        procedure: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        party: { create: vi.fn().mockResolvedValue({ id: "pa1" }), createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        billing: { create: vi.fn().mockResolvedValue({ id: "b1" }) },
        matterMember: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        document: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
        matterProcedure: { create: vi.fn().mockResolvedValue({ id: "mp1" }) },
        procedureParty: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        intake: { update: vi.fn().mockResolvedValue({ id: "i1" }) },
        timelineEvent: { create: vi.fn().mockResolvedValue({ id: "te1" }) },
        documentFolder: { createMany: vi.fn().mockResolvedValue({ count: 0 }) }
      };
      capturedTx = tx;
      return await cb(tx);
    });

    await convertIntakeToMatter("i1");

    // Documents present → updateMany được gọi
    expect(capturedTx.document.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { intakeId: "i1" },
        data: { matterId: "m1" }
      })
    );
  });

});
