import { describe, it, expect, vi, beforeEach } from "vitest";
import { listStageTemplates } from "@/server/settings/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stageTemplate: {
      findMany: vi.fn()
    }
  }
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } });
});

describe("settings actions", () => {
  it("listStageTemplates should return all templates ordered by procedureType", async () => {
    const mockTemplates = [
      { id: "t1", procedureType: "CIVIL", name: "Civil Template" },
      { id: "t2", procedureType: "CRIMINAL", name: "Criminal Template" }
    ] as any;
    mockPrisma.stageTemplate.findMany.mockResolvedValue(mockTemplates);

    const result = await listStageTemplates();

    expect(result).toEqual(mockTemplates);
    expect(mockPrisma.stageTemplate.findMany).toHaveBeenCalledWith({
      orderBy: { procedureType: "asc" }
    });
  });
});