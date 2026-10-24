// @ts-nocheck
/**
 * Test module Ghi giờ: chặn giờ không theo bước 0.25, bắt buộc gắn đối tượng,
 * và chỉ sửa bản ghi DRAFT của chính mình.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTimeEntry, updateTimeEntry } from "./actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: { timesheetEntry: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() } }
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));

const mockPrisma = vi.mocked(prisma, true);
const MID = "c" + "2".repeat(24);
const TID = "c" + "3".repeat(24);

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
});

describe("createTimeEntry", () => {
  it("stores hours with a linked matter", async () => {
    mockPrisma.timesheetEntry.create.mockResolvedValue({ id: TID });
    await createTimeEntry({ date: new Date(), hours: 1.25, billable: true, matterId: MID });
    const data = mockPrisma.timesheetEntry.create.mock.calls[0][0].data;
    expect(data.hours).toBe(1.25);
    expect(data.matterId).toBe(MID);
    expect(data.userId).toBe("u1");
  });

  it("rejects hours not on a 0.25 step", async () => {
    await expect(
      createTimeEntry({ date: new Date(), hours: 1.1, matterId: MID })
    ).rejects.toThrow(/0\.25/);
  });

  it("requires a linked matter/task", async () => {
    await expect(
      createTimeEntry({ date: new Date(), hours: 2 })
    ).rejects.toThrow(/gắn/);
  });
});

describe("updateTimeEntry", () => {
  it("refuses editing a non-DRAFT entry", async () => {
    mockPrisma.timesheetEntry.findUnique.mockResolvedValue({ id: TID, userId: "u1", status: "SUBMITTED" });
    await expect(
      updateTimeEntry({ id: TID, date: new Date(), hours: 1, matterId: MID })
    ).rejects.toThrow(/nháp/);
  });
});
