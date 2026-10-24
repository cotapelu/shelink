// @ts-nocheck
/**
 * Test saveTerminologyAction: phân quyền (chỉ quản lý) + persist thuật ngữ (upsert SystemSetting).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveTerminologyAction } from "./terminology-actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("@/lib/prisma", () => ({ prisma: { systemSetting: { upsert: vi.fn() } } }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
});

describe("saveTerminologyAction", () => {
  it("rejects non-manager roles", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u2", role: "FINANCE" } });
    await expect(saveTerminologyAction({ matter: "Đơn hàng" })).rejects.toThrow(/thuật ngữ|quản lý/i);
  });

  it("persists cleaned terms for managers", async () => {
    mockPrisma.systemSetting.upsert.mockResolvedValue({});
    const res = await saveTerminologyAction({ matter: "Đơn hàng", client: "  " });
    expect(res).toEqual({ ok: true });
    const arg = mockPrisma.systemSetting.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ key: "terminology" });
    // giá trị rỗng bị lọc khỏi cleaned terms trước khi lưu
    expect(arg.update.value.terms).toEqual({ matter: "Đơn hàng" });
  });
});
