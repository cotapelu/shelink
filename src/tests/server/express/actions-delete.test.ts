import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteExpress } from "@/server/express/actions";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertCanAccessExpressRecord } from "@/server/express/actions";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    expressTracking: {
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/server/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockRequireSession = vi.mocked(requireSession);
const mockPrisma = vi.mocked(prisma, true);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER" } } as any);
});

describe("deleteExpress", () => {
  it("should delete express record and audit", async () => {
    const input = { id: "exp1" };
    mockPrisma.expressTracking.findUnique.mockResolvedValue({
      id: "exp1",
      matterId: "m1"
    } as any);
    mockPrisma.expressTracking.delete.mockResolvedValue({} as any);

    // Mock the internal helper via re-require? Actually deleteExpress uses assertCanAccessExpressRecord internally which is not exported. We need to mock that function.
    // Let's mock the module to bypass assertCanAccessExpressRecord
  });

  it("should throw if record not found", async () => {
    const input = { id: "exp1" };
    mockPrisma.expressTracking.findUnique.mockResolvedValue(null as any);

    // We need to mock assertCanAccessExpressRecord because it's internal. Instead, we'll mock the module's entire implementation?
  });
});
