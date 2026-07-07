// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCaseCycleAnalysis,
  getReviewIssueAnalysis,
} from "@/server/reports/analytics";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    matter: {
      findMany: vi.fn(),
    },
    reviewRecord: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reports analytics", () => {
  describe("getCaseCycleAnalysis", () => {
    it("should return empty array when no closed matters", async () => {
      mockPrisma.matter.findMany.mockResolvedValue([]);

      const result = await getCaseCycleAnalysis({
        start: new Date("2025-01-01"),
        end: new Date("2025-12-31"),
      });

      expect(result).toEqual([]);
    });

    it("should calculate stats correctly", async () => {
      const now = new Date();
      const oneDayLater = new Date(now.getTime() + 86400000);
      mockPrisma.matter.findMany.mockResolvedValue([
        {
          category: "CIVIL_COMMERCIAL",
          createdAt: now,
          closedAt: oneDayLater,
        },
        {
          category: "CIVIL_COMMERCIAL",
          createdAt: now,
          closedAt: new Date(now.getTime() + 3 * 86400000),
        },
      ]);

      const result = await getCaseCycleAnalysis({
        start: new Date("2025-01-01"),
        end: new Date("2026-12-31"),
      });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("CIVIL_COMMERCIAL");
      expect(result[0].count).toBe(2);
      expect(result[0].avgDays).toBe(2);
      expect(result[0].minDays).toBe(1);
      expect(result[0].maxDays).toBe(3);
    });

    it("should ignore cases with negative days", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000);
      mockPrisma.matter.findMany.mockResolvedValue([
        {
          category: "CRIMINAL",
          createdAt: now,
          closedAt: past,
        },
      ]);

      const result = await getCaseCycleAnalysis({
        start: new Date("2025-01-01"),
        end: new Date("2026-12-31"),
      });

      expect(result).toEqual([]);
    });

    it("should handle single case median correctly", async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 5 * 86400000);
      mockPrisma.matter.findMany.mockResolvedValue([
        {
          category: "FAMILY",
          createdAt: now,
          closedAt: later,
        },
      ]);

      const result = await getCaseCycleAnalysis({
        start: new Date("2025-01-01"),
        end: new Date("2026-12-31"),
      });

      expect(result[0].medianDays).toBe(5);
    });

    it("should calculate median for even count", async () => {
      const base = new Date("2025-01-01");
      mockPrisma.matter.findMany.mockResolvedValue([
        {
          category: "LABOR",
          createdAt: base,
          closedAt: new Date(base.getTime() + 1 * 86400000),
        },
        {
          category: "LABOR",
          createdAt: base,
          closedAt: new Date(base.getTime() + 2 * 86400000),
        },
        {
          category: "LABOR",
          createdAt: base,
          closedAt: new Date(base.getTime() + 3 * 86400000),
        },
        {
          category: "LABOR",
          createdAt: base,
          closedAt: new Date(base.getTime() + 4 * 86400000),
        },
      ]);

      const result = await getCaseCycleAnalysis({
        start: new Date("2025-01-01"),
        end: new Date("2026-12-31"),
      });

      expect(result[0].medianDays).toBe(2.5);
    });
  });

  describe("getReviewIssueAnalysis", () => {
    it("should return zeroed stats when no review records", async () => {
      mockPrisma.reviewRecord.findMany.mockResolvedValue([]);

      const result = await getReviewIssueAnalysis({
        start: new Date("2025-01-01"),
        end: new Date("2025-12-31"),
      });

      expect(result).toEqual({
        recordCount: 0,
        documentCount: 0,
        totalItems: 0,
        bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
        byType: { MISSING: 0, RISK: 0, ISSUE: 0, SUGGESTION: 0 },
        topIssues: [],
      });
    });

    it("should aggregate review issues by title and severity", async () => {
      const base = new Date("2025-01-01");
      mockPrisma.reviewRecord.findMany.mockResolvedValue([
        {
          itemsJson: [
            { title: "Missing signature", severity: "HIGH" as const, type: "ISSUE" as const },
            { title: "Invalid date", severity: "MEDIUM" as const, type: "ISSUE" as const },
          ],
          createdAt: base,
          documentId: "doc1",
        },
        {
          itemsJson: [
            { title: "Missing signature", severity: "HIGH" as const, type: "ISSUE" as const },
            { title: "Missing signature", severity: "LOW" as const, type: "MISSING" as const },
          ],
          createdAt: base,
          documentId: "doc2",
        },
      ]);

      const result = await getReviewIssueAnalysis({
        start: new Date("2025-01-01"),
        end: new Date("2026-12-31"),
      });

      expect(result.recordCount).toBe(2);
      expect(result.documentCount).toBe(2);
      expect(result.totalItems).toBe(4);
      expect(result.bySeverity.HIGH).toBe(2);
      expect(result.bySeverity.MEDIUM).toBe(1);
      expect(result.bySeverity.LOW).toBe(1);
      expect(result.byType.ISSUE).toBe(3); // 2 from first record + 1 from second
      expect(result.byType.MISSING).toBe(1);

      expect(result.topIssues).toHaveLength(2);
      const missingSig = result.topIssues.find((r) => r.title === "Missing signature");
      expect(missingSig).toBeDefined();
      expect(missingSig?.occurrences).toBe(3);
      expect(missingSig?.severityCounts.HIGH).toBe(2);
      expect(missingSig?.severityCounts.LOW).toBe(1);
    });

    it("should limit to top N results", async () => {
      const base = new Date("2025-01-01");
      const records = Array.from({ length: 20 }, (_, idx) => ({
        itemsJson: [{ title: `Issue ${idx}`, severity: "MEDIUM" as const, type: "ISSUE" as const }],
        createdAt: base,
        documentId: `doc${idx}`
      }));
      mockPrisma.reviewRecord.findMany.mockResolvedValue(records);

      const result = await getReviewIssueAnalysis({
        start: new Date("2025-01-01"),
        end: new Date("2026-12-31"),
      });

      expect(result.topIssues).toHaveLength(10);
    });

    it("should filter by period correctly", async () => {
      const start = new Date("2025-01-01");
      const end = new Date("2025-12-31");
      mockPrisma.reviewRecord.findMany.mockResolvedValue([]);

      await getReviewIssueAnalysis({ start, end });

      expect(mockPrisma.reviewRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            reviewedAt: { gte: start, lt: end },
          },
          select: { id: true, documentId: true, itemsJson: true },
        })
      );
    });
  });
});
