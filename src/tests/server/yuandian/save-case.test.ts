import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveCaseToMatter,
  saveVectorCaseToMatter
} from "@/server/yuandian/save-case";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { sha256 } from "@/lib/storage/crypto";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/prisma");
vi.mock("@/lib/auth/session");
vi.mock("@/lib/permissions");
vi.mock("@/lib/storage");
vi.mock("@/lib/storage/crypto");
vi.mock("@/server/audit");
vi.mock("next/cache");

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAssertCanAccessMatter = vi.mocked(assertCanAccessMatter);
const mockStorage = vi.mocked(storage);
const mockSha256 = vi.mocked(sha256);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER", name: "User" }
  } as any);
  mockAssertCanAccessMatter.mockResolvedValue(undefined as any);
  mockStorage.writeFile.mockResolvedValue("/fake/path/file.md");
  mockSha256.mockReturnValue("abc123hash");
  mockPrisma.matter = { findUnique: vi.fn() } as any;
  mockPrisma.document = { create: vi.fn() } as any;
});

describe("yuandian save-case", () => {
  describe("saveCaseToMatter", () => {
    const caseHit = {
      id: "yuandian-case-1",
      ah: "（2025）京01民初123号",
      title: "Sample Case",
      ay: ["CIVIL"],
      jbdw: "Beijing Court",
      cprq: "2025-01-15",
      ajlb: "CIVIL",
      xzqh_p: "Beijing",
      wszl: "Judgment",
      content: "Case content snippet",
      detailUrl: "https://example.com/case/1"
    } as any;

    it("should save case as document", async () => {
      mockPrisma.matter.findUnique.mockResolvedValue({
        id: "m123",
        status: "ACTIVE"
      } as any);
      mockPrisma.document.create.mockResolvedValue({
        id: "doc1",
        name: "类案_（2025）京01民初123号.md",
        path: "/fake/path/file.md"
      } as any);

      const result = await saveCaseToMatter({
        matterId: "m123",
        caseHit
      });

      expect(result.ok).toBe(true);
      expect(result.documentId).toBe("doc1");
      // Check storage write called
      expect(mockStorage.writeFile).toHaveBeenCalledWith(
        `m_${"m123"}`,
        expect.any(Buffer)
      );
      // Inspect document create args
      const createArgs = mockPrisma.document.create.mock.calls[0][0];
      expect(createArgs.data.matterId).toBe("m123");
      expect(createArgs.data.name).toContain("类案_");
      expect(createArgs.data.category).toBe("JUDGMENT");
      expect(createArgs.data.mimeType).toBe("text/markdown");
      expect(createArgs.data.sha256).toBe("abc123hash");
      expect(createArgs.data.encrypted).toBe(false);
      expect(createArgs.data.tags).toContain("类案");
      expect(createArgs.data.tags).toContain("元典");
      // audit
      const auditCall = mockAudit.mock.calls[0][0];
      expect(auditCall.action).toBe("YUANDIAN_CASE_SAVE");
      expect(auditCall.detail.caseId).toBe(caseHit.id);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/matters/m123");
    });

    it("should throw if matter not found", async () => {
      mockPrisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        saveCaseToMatter({ matterId: "m999", caseHit })
      ).rejects.toThrow("案件不存在");
    });

    it("should throw if matter archived", async () => {
      mockPrisma.matter.findUnique.mockResolvedValue({
        id: "m123",
        status: "ARCHIVED"
      } as any);
      await expect(
        saveCaseToMatter({ matterId: "m123", caseHit })
      ).rejects.toThrow("案件已归档（只读），不能再保存类案");
    });
  });

  describe("saveVectorCaseToMatter", () => {
    const vectorHit = {
      scid: "v123",
      ah: "（2025）京01民初456号",
      title: "Vector Case",
      ay: ["CIVIL"],
      anyou: ["Contract dispute"],
      jbdw: "Beijing Court",
      jaDate: 20250115,
      ajlb: "CIVIL",
      xzqh_p: "Beijing",
      wszl: "Judgment",
      content: "Vector content",
      detailUrl: "https://example.com/vector/1",
      score: 0.95
    } as any;

    it("should save vector case as document", async () => {
      mockPrisma.matter.findUnique.mockResolvedValue({
        id: "m123",
        status: "ACTIVE"
      } as any);
      mockPrisma.document.create.mockResolvedValue({
        id: "doc2",
        name: "类案_（2025）京01民初456号.md"
      } as any);

      const result = await saveVectorCaseToMatter({
        matterId: "m123",
        caseHit: vectorHit
      });

      expect(result.ok).toBe(true);
      expect(mockStorage.writeFile).toHaveBeenCalled();
      const createArgs = mockPrisma.document.create.mock.calls[0][0];
      expect(createArgs.data.matterId).toBe("m123");
      expect(createArgs.data.name).toContain("类案_");
      expect(createArgs.data.category).toBe("JUDGMENT");
      expect(createArgs.data.tags.some((t: string) => t === "语义")).toBe(true);
    });

    it("should throw if matter not found", async () => {
      mockPrisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        saveVectorCaseToMatter({ matterId: "m999", caseHit: vectorHit })
      ).rejects.toThrow("案件不存在");
    });
  });
});