// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { globalSearch } from "@/server/search/actions";
import { requireSession } from "@/lib/auth/session";
import {
  matterVisibilityFilter,
  clientVisibilityFilter,
  intakeVisibilityFilter,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/permissions");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: { findMany: vi.fn() },
    client: { findMany: vi.fn() },
    intake: { findMany: vi.fn() },
    document: { findMany: vi.fn() },
  },
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockMatterVis = vi.mocked(matterVisibilityFilter, true);
const mockClientVis = vi.mocked(clientVisibilityFilter, true);
const mockIntakeVis = vi.mocked(intakeVisibilityFilter, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  // Default permission filters return empty object (no constraints)
  mockMatterVis.mockReturnValue({});
  mockClientVis.mockReturnValue({});
  mockIntakeVis.mockReturnValue({});
});

describe("server/search/actions", () => {
  describe("globalSearch", () => {
    it("should return empty result for empty query", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);

      const result = await globalSearch("");

      expect(result).toEqual({ matters: [], clients: [], intakes: [], documents: [] });
      expect(mockPrisma.matter.findMany).not.toHaveBeenCalled();
    });

    it("should return empty result for whitespace-only query", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);

      const result = await globalSearch("   ");

      expect(result).toEqual({ matters: [], clients: [], intakes: [], documents: [] });
    });

    it("should call all four findMany with correct base filters and limit", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.matter.findMany.mockResolvedValue([]);
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.intake.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);

      await globalSearch("test");

      // Matter
      expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: expect.any(Array),
          }),
          take: 5,
          orderBy: { updatedAt: "desc" },
        })
      );
      // Client
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: expect.any(Array),
          }),
          take: 5,
        })
      );
      // Intake
      expect(mockPrisma.intake.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: "CONVERTED" },
            OR: expect.any(Array),
          }),
          take: 5,
        })
      );
      // Document
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            matter: expect.objectContaining({
              deletedAt: null,
            }),
            OR: expect.any(Array),
          }),
          take: 5,
        })
      );
    });

    it("should spread permission filters from visibility functions", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockMatterVis.mockReturnValue({ ownerId: "u1" });
      mockClientVis.mockReturnValue({ createdBy: { some: { userId: "u1" } } });
      mockIntakeVis.mockReturnValue({ assigneeId: "u1" });

      mockPrisma.matter.findMany.mockResolvedValue([]);
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.intake.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);

      await globalSearch("query");

      // Matter should include ownerId from visibility filter
      expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            ownerId: "u1",
            OR: expect.any(Array),
          }),
        })
      );
    });

    it("should map matters correctly", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.matter.findMany.mockResolvedValue([
        {
          id: "m1",
          title: "Case A",
          internalCode: "CA-2025-001",
          status: "ACTIVE",
        },
      ]);
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.intake.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await globalSearch("Case");

      expect(result.matters).toHaveLength(1);
      expect(result.matters[0]).toEqual({
        id: "m1",
        title: "Case A",
        subtitle: "CA-2025-001 · ACTIVE",
        href: "/matters/m1",
        type: "matter",
      });
    });

    it("should map clients correctly", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.matter.findMany.mockResolvedValue([]);
      mockPrisma.client.findMany.mockResolvedValue([
        {
          id: "c1",
          name: "Client Corp",
          type: "ENTERPRISE",
        },
      ]);
      mockPrisma.intake.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await globalSearch("Client");

      expect(result.clients).toHaveLength(1);
      expect(result.clients[0]).toEqual({
        id: "c1",
        title: "Client Corp",
        subtitle: "ENTERPRISE",
        href: "/clients/c1",
        type: "client",
      });
    });

    it("should map intakes correctly", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.matter.findMany.mockResolvedValue([]);
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.intake.findMany.mockResolvedValue([
        {
          id: "i1",
          title: "New Inquiry",
          status: "PENDING",
        },
      ]);
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await globalSearch("Inquiry");

      expect(result.intakes).toHaveLength(1);
      expect(result.intakes[0]).toEqual({
        id: "i1",
        title: "New Inquiry",
        subtitle: "PENDING",
        href: "/intakes/i1",
        type: "intake",
      });
    });

    it("should map documents correctly with matter reference", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.matter.findMany.mockResolvedValue([]);
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.intake.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: "d1",
          name: "Contract.pdf",
          category: "LEGAL_DOC",
          matter: { id: "m1", internalCode: "CA-001" },
        },
      ]);

      const result = await globalSearch("Contract");

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual({
        id: "d1",
        title: "Contract.pdf",
        subtitle: "CA-001",
        href: "/matters/m1",
        type: "document",
      });
    });

    it("should handle documents without matter gracefully", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.matter.findMany.mockResolvedValue([]);
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.intake.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: "d2",
          name: "Orphan.docx",
          category: "OTHER",
          matter: null,
        } as any,
      ]);

      const result = await globalSearch("Orphan");

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].subtitle).toBe("");
    });

    it("should limit each category to limit (5)", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.matter.findMany.mockResolvedValue(Array(10).fill({ id: "m", title: "x", internalCode: "", status: "" }));
      mockPrisma.client.findMany.mockResolvedValue(Array(10).fill({ id: "c", name: "x", type: "" }));
      mockPrisma.intake.findMany.mockResolvedValue(Array(10).fill({ id: "i", title: "x", status: "" }));
      mockPrisma.document.findMany.mockResolvedValue(Array(10).fill({ id: "d", name: "x", category: "", matter: { id: "", internalCode: "" } }));

      await globalSearch("x");

      expect(mockPrisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
      expect(mockPrisma.intake.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });

    it("should trim query and handle case-insensitive contains", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.matter.findMany.mockResolvedValue([]);
      mockPrisma.client.findMany.mockResolvedValue([]);
      mockPrisma.intake.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);

      await globalSearch("  MixedCase  ");

      // Check that the query used in contains is trimmed and case-insensitive by PG
      const matterWhere = mockPrisma.matter.findMany.mock.calls[0][0].where as any;
      expect(matterWhere.OR[0].title.contains).toBe("MixedCase");
    });
  });
});
