// @ts-nocheck
/**
 * Test server action module Hợp đồng: transition ghi event, renew giữ lịch sử,
 * phân quyền, và chỉ sửa ở DRAFT/REVIEW.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { transitionContract, renewContract, updateContract } from "./actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    contract: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    contractEvent: { create: vi.fn() }
  }
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));

const mockPrisma = vi.mocked(prisma, true);
const CID = "c" + "0".repeat(24);

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  mockPrisma.systemSetting = { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() };
  mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
});

describe("transitionContract", () => {
  it("SIGNED sets signedAt and records a SIGNED event", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue({ id: CID, status: "REVIEW", deletedAt: null });

    await transitionContract(CID, "SIGNED");

    const patch = mockPrisma.contract.update.mock.calls[0][0].data;
    expect(patch.status).toBe("SIGNED");
    expect(patch.signedAt).toBeInstanceOf(Date);
    const event = mockPrisma.contractEvent.create.mock.calls[0][0].data;
    expect(event.kind).toBe("SIGNED");
  });

  it("rejects non-manager roles", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u2", role: "STAFF" } });
    mockPrisma.contract.findUnique.mockResolvedValue({ id: CID, status: "REVIEW", deletedAt: null });
    await expect(transitionContract(CID, "ACTIVE")).rejects.toThrow(/quyền|role/i);
  });
});

describe("renewContract", () => {
  it("records RENEWED event with new expiry and keeps history", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue({ id: CID, status: "ACTIVE", deletedAt: null });

    await renewContract({ id: CID, expiresAt: new Date("2027-01-01"), note: "Gia hạn 1 năm" });

    const patch = mockPrisma.contract.update.mock.calls[0][0].data;
    expect(patch.status).toBe("RENEWED");
    expect(patch.expiresAt.toISOString().slice(0, 10)).toBe("2027-01-01");
    const event = mockPrisma.contractEvent.create.mock.calls[0][0].data;
    expect(event.kind).toBe("RENEWED");
    expect(event.detail).toBe("Gia hạn 1 năm");
  });
});

describe("updateContract", () => {
  it("refuses editing an ACTIVE contract", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue({ id: CID, status: "ACTIVE", deletedAt: null, createdById: "u1" });

    await expect(
      updateContract({
        id: CID,
        title: "Điều chỉnh",
        clientId: CID,
        amount: 100,
        signedAt: new Date(),
        effectiveAt: new Date(),
        expiresAt: new Date(),
        renewRemindDays: 30
      })
    ).rejects.toThrow(/nháp|review/);
  });
});
