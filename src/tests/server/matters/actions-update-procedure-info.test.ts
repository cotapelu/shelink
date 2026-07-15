// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import cuid from "cuid";
import { updateProcedureInfo } from "@/server/matters/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import * as permissions from "@/lib/permissions";
import * as guard from "@/lib/archive/guard";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matterProcedure: { findUnique: vi.fn(), update: vi.fn() },
    party: { findMany: vi.fn(), aggregate: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    matter: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    procedureParty: { deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn()
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/telemetry/server-metrics", () => ({
  withMetrics: vi.fn((name, fn) => fn)
}));
vi.mock("@/lib/permissions", () => ({
  assertMatterWritable: vi.fn(),
  assertCanAccessMatter: vi.fn(),
  assertCanAssociateMatter: vi.fn(),
  matterAssociationFilter: vi.fn(() => ({}))
}));
vi.mock("@/lib/archive/guard", () => ({
  assertMatterWritable: vi.fn()
}));

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockAssertMatterWritable = vi.mocked(permissions.assertMatterWritable);
const mockAssertCanAccessMatter = vi.mocked(permissions.assertCanAccessMatter);
const mockAssertCanAssociateMatter = vi.mocked(permissions.assertCanAssociateMatter);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  guard.assertMatterWritable.mockImplementation(() => {});
  mockAssertMatterWritable.mockImplementation(() => {});
  mockAssertCanAccessMatter.mockImplementation(() => {});
  mockAssertCanAssociateMatter.mockImplementation(() => {});
});

describe("updateProcedureInfo", () => {
  it("updates basic fields successfully", async () => {
    const procedureId = cuid();
    const matterId = cuid();

    mockPrisma.matterProcedure.findUnique.mockResolvedValue({
      id: procedureId,
      matterId: matterId
    } as any);

    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        matterProcedure: { update: vi.fn().mockResolvedValue({ id: procedureId }) },
        party: { findMany: vi.fn(), aggregate: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
        matter: { findUnique: vi.fn(), update: vi.fn() },
        procedureParty: { deleteMany: vi.fn(), create: vi.fn() }
      } as any;
      return fn(tx);
    });

    const input = {
      procedureId,
      jurisdiction: "Hà Nội",
      handlingAgency: "Tòa Nhân dân"
    };

    await updateProcedureInfo(input);

    expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${matterId}`);
  });

  it("throws if procedure not found", async () => {
    mockPrisma.matterProcedure.findUnique.mockResolvedValue(null);
    await expect(updateProcedureInfo({ procedureId: cuid() as any })).rejects.toThrow("Thủ tục không tồn tại");
  });

  it("throws when matter is not writable", async () => {
    const procedureId = cuid();
    mockPrisma.matterProcedure.findUnique.mockResolvedValue({ id: procedureId, matterId: "m1" } as any);
    guard.assertMatterWritable.mockRejectedValueOnce(new Error("Vụ án không tồn tại hoặc không có quyền xử lý"));
    await expect(updateProcedureInfo({ procedureId })).rejects.toThrow("Vụ án không tồn tại hoặc không có quyền xử lý");
  });

  it("throws when user cannot access matter", async () => {
    const procedureId = cuid();
    mockPrisma.matterProcedure.findUnique.mockResolvedValue({ id: procedureId, matterId: "m1" } as any);
    mockAssertCanAccessMatter.mockRejectedValueOnce(new Error("Vụ án không tồn tại"));
    await expect(updateProcedureInfo({ procedureId })).rejects.toThrow("Vụ án không tồn tại");
  });

  it("throws on transaction failure", async () => {
    const procedureId = cuid();
    mockPrisma.matterProcedure.findUnique.mockResolvedValue({ id: procedureId, matterId: "m1" } as any);
    mockPrisma.$transaction.mockRejectedValueOnce(new Error("DB error"));
    await expect(updateProcedureInfo({ procedureId })).rejects.toThrow("DB error");
  });

  it("throws when procedureParties reference invalid party", async () => {
    const procedureId = cuid();
    const matterId = cuid();

    mockPrisma.matterProcedure.findUnique.mockResolvedValue({ id: procedureId, matterId } as any);
    mockPrisma.party.findMany.mockResolvedValue([]);
    mockPrisma.matter.findUnique.mockResolvedValue({ id: matterId, primaryClientId: null, clientLinks: [] } as any);

    const input = {
      procedureId,
      procedureParties: [{ partyId: "invalidParty", standing: "PLAINTIFF" }]
    } as any;

    await expect(updateProcedureInfo(input)).rejects.toThrow(/party không thuộc vụ án|không tồn tại/i);
  });

  // Additional tests for newProcedureParties coverage

  it("creates new parties from newProcedureParties", async () => {
    const procedureId = cuid();
    const matterId = cuid();

    mockPrisma.matterProcedure.findUnique.mockResolvedValue({ id: procedureId, matterId } as any);

    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        matterProcedure: { update: vi.fn().mockResolvedValue({}) },
        party: {
          aggregate: vi.fn().mockResolvedValue({ _max: { ordinal: 2 } }),
          create: vi.fn().mockResolvedValue({ id: "newParty" })
        },
        procedureParty: { deleteMany: vi.fn(), createMany: vi.fn() }
      } as any;
      return fn(tx);
    });

    const input = {
      procedureId,
      newProcedureParties: [
        {
          name: "New Company",
          role: "CLIENT_PARTY" as const,
          partyType: "COMPANY" as const,
          idNumber: "",
          enterpriseSocialCode: "123456",
          standings: ["PLAINTIFF"]
        }
      ]
    } as any;

    await updateProcedureInfo(input);
    // No validation errors -> should succeed
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${matterId}`);
  });

  it("updates existing party from newProcedureParties", async () => {
    const procedureId = cuid();
    const matterId = cuid();
    const existingPartyId = cuid();

    mockPrisma.matterProcedure.findUnique.mockResolvedValue({ id: procedureId, matterId } as any);

    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        matterProcedure: { update: vi.fn().mockResolvedValue({}) },
        party: {
          findFirst: vi.fn().mockResolvedValue({ id: existingPartyId }),
          update: vi.fn().mockResolvedValue({}),
          aggregate: vi.fn().mockResolvedValue({ _max: { ordinal: 1 } })
        },
        procedureParty: { deleteMany: vi.fn(), createMany: vi.fn() }
      } as any;
      return fn(tx);
    });

    const input = {
      procedureId,
      newProcedureParties: [
        {
          existingPartyId,
          name: "Updated Party",
          role: "OPPOSING_PARTY" as const,
          partyType: "NATURAL_PERSON" as const,
          idNumber: "123456",
          standings: ["DEFENDANT"]
        }
      ]
    } as any;

    await updateProcedureInfo(input);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${matterId}`);
  });
});
