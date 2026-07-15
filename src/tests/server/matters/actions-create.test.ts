// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import cuid from "cuid";

// Mock dependencies
vi.mock("@/server/settings/firm-profile", () => ({
  getFirmProfile: vi.fn().mockResolvedValue({
    matterCodePrefix: "LL",
    caseNoTemplate: "{{year}}-{{categoryAbbr}}-{{seq}}",
    firmShortName: "LawLink",
    categoryWords: { CIVIL_COMMERCIAL: "Civil" }
  }),
  CATEGORY_ABBR: { CIVIL_COMMERCIAL: "CC" }
}));

vi.mock("@/lib/procedures-by-category", () => ({
  matterCategoryCode: { CIVIL_COMMERCIAL: "CC" }
}));

vi.mock("@/lib/matters/firm-caseno", () => ({
  renderCaseNoTemplate: vi.fn((tpl, vars) => `${vars.year}-${vars.categoryAbbr}-${String(vars.seq).padStart(4, "0")}`)
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
    client: { findUnique: vi.fn() },
    party: { findMany: vi.fn() }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/permissions", () => ({
  assertMatterWritable: vi.fn(),
  assertCanAssociateMatter: vi.fn()
}));
vi.mock("@/lib/default-folders", () => ({ seedDefaultFolders: vi.fn() }));

import { createMatter } from "@/server/matters/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  // systemSetting mocks for counter
  mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
  mockPrisma.systemSetting.upsert.mockResolvedValue({} as any);
  // $transaction will be set per test
});

describe("createMatter", () => {
  it("creates matter with minimal input", async () => {
    const clientId = cuid();
    const input = {
      title: "Test Matter",
      category: "CIVIL_COMMERCIAL",
      clientIds: [clientId],
      parties: [],
      firstProcedure: { type: "FIRST_INSTANCE" as const, acceptedAt: new Date() }
    };

    const created = {
      id: cuid(),
      internalCode: "LL-2025-CC-0001",
      firmCaseNo: "2025-CC-0001",
      title: "Test Matter",
      category: "CIVIL_COMMERCIAL",
      ownerId: "u1",
      primaryClientId: clientId,
      intakeDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockTx = {
      matter: { create: vi.fn().mockResolvedValue(created) },
      timelineEvent: { create: vi.fn().mockResolvedValue({ id: cuid() }) },
      systemSetting: { findUnique: vi.fn(), upsert: vi.fn() } // needed for generateInternalCode
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    const result = await createMatter(input);

    expect(result).toEqual({ ok: true, id: created.id, internalCode: created.internalCode });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MATTER_CREATE",
        targetType: "Matter",
        targetId: created.id
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/matters");
  });

  it("rejects on validation error", async () => {
    const input = {
      title: "",
      category: "CIVIL_COMMERCIAL",
      clientIds: [cuid()],
      parties: [],
      firstProcedure: { type: "FIRST_INSTANCE" as const, acceptedAt: new Date() }
    };
    await expect(createMatter(input)).rejects.toThrow();
  });

  it("rejects on invalid category enum", async () => {
    const input = {
      title: "Test",
      category: "INVALID" as any,
      clientIds: [cuid()],
      parties: [],
      firstProcedure: { type: "FIRST_INSTANCE" as const, acceptedAt: new Date() }
    };
    await expect(createMatter(input)).rejects.toThrow();
  });

  it("handles transaction failure", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));
    const input = {
      title: "Test",
      category: "CIVIL_COMMERCIAL",
      clientIds: [cuid()],
      parties: [],
      firstProcedure: { type: "FIRST_INSTANCE" as const, acceptedAt: new Date() }
    };
    await expect(createMatter(input)).rejects.toThrow("DB error");
  });

  it("converts empty strings to null for nullable fields", async () => {
    const clientId = cuid();
    const input = {
      title: "Test",
      category: "CIVIL_COMMERCIAL",
      clientIds: [clientId],
      parties: [],
      firstProcedure: { type: "FIRST_INSTANCE" as const, acceptedAt: new Date() },
      causeId: "",
      causeFreeText: ""
    };
    const mockTx = {
      matter: { create: vi.fn().mockResolvedValue({ id: cuid() }) },
      timelineEvent: { create: vi.fn() },
      systemSetting: { findUnique: vi.fn(), upsert: vi.fn() }
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    await createMatter(input);

    const data = mockTx.matter.create.mock.calls[0][0].data;
    expect(data.causeId).toBeNull();
    expect(data.causeFreeText).toBeNull();
  });

  it("sets default intakeDate to now when not provided", async () => {
    const clientId = cuid();
    const input = {
      title: "Test",
      category: "CIVIL_COMMERCIAL",
      clientIds: [clientId],
      parties: [],
      firstProcedure: { type: "FIRST_INSTANCE" as const, acceptedAt: new Date() }
    };
    const mockTx = {
      matter: { create: vi.fn().mockResolvedValue({ id: cuid() }) },
      timelineEvent: { create: vi.fn() },
      systemSetting: { findUnique: vi.fn(), upsert: vi.fn() }
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    await createMatter(input);

    const data = mockTx.matter.create.mock.calls[0][0].data;
    expect(data.intakeDate).toBeInstanceOf(Date);
  });

  it("includes optional claimAmount and ourStanding", async () => {
    const clientId = cuid();
    const input = {
      title: "Test",
      category: "CIVIL_COMMERCIAL",
      clientIds: [clientId],
      parties: [],
      firstProcedure: { type: "FIRST_INSTANCE" as const, acceptedAt: new Date() },
      claimAmount: 50000,
      ourStanding: "PLAINTIFF"
    };
    const mockTx = {
      matter: { create: vi.fn().mockResolvedValue({ id: cuid() }) },
      timelineEvent: { create: vi.fn() },
      systemSetting: { findUnique: vi.fn(), upsert: vi.fn() }
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    await createMatter(input);

    const data = mockTx.matter.create.mock.calls[0][0].data;
    expect(data.claimAmount).toBe(50000);
    expect(data.ourStanding).toBe("PLAINTIFF");
  });

  it("fails transaction when systemSetting upsert fails", async () => {
    const clientId = cuid();
    const input = {
      title: "Test",
      category: "CIVIL_COMMERCIAL",
      clientIds: [clientId],
      parties: [],
      firstProcedure: { type: "FIRST_INSTANCE" as const, acceptedAt: new Date() }
    };
    const mockTx = {
      matter: { create: vi.fn().mockResolvedValue({ id: cuid() }) },
      timelineEvent: { create: vi.fn() },
      systemSetting: {
        findUnique: vi.fn(),
        upsert: vi.fn().mockRejectedValue(new Error("Unique constraint"))
      }
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    await expect(createMatter(input)).rejects.toThrow("Unique constraint");
  });

  it("throws when required clientIds missing", async () => {
    const input = {
      title: "Test",
      category: "CIVIL_COMMERCIAL",
      clientIds: [], // empty
      parties: [],
      firstProcedure: { type: "FIRST_INSTANCE" as const, acceptedAt: new Date() }
    };
    await expect(createMatter(input)).rejects.toThrow("clientIds");
  });

  it("throws when firstProcedure missing", async () => {
    const clientId = cuid();
    const input = {
      title: "Test",
      category: "CIVIL_COMMERCIAL",
      clientIds: [clientId],
      parties: []
      // missing firstProcedure
    };
    await expect(createMatter(input)).rejects.toThrow("firstProcedure");
  });

  it("audit logs matter creation with correct details", async () => {
    const clientId = cuid();
    const matterId = cuid();
    const internalCode = "LL-2025-CC-0001";
    const input = {
      title: "Test",
      category: "CIVIL_COMMERCIAL",
      clientIds: [clientId],
      parties: [],
      firstProcedure: { type: "FIRST_INSTANCE" as const, acceptedAt: new Date() }
    };
    const mockTx = {
      matter: { create: vi.fn().mockResolvedValue({ id: matterId, internalCode }) },
      timelineEvent: { create: vi.fn() },
      systemSetting: { findUnique: vi.fn(), upsert: vi.fn() }
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    await createMatter(input);

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MATTER_CREATE",
        targetType: "Matter",
        targetId: matterId,
        detail: { internalCode }
      })
    );
  });
});
