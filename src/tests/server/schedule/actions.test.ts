// @ts-nocheck
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { listScheduleItems } from "@/server/schedule/actions";
import { requireSession } from "@/lib/auth/session";
import {
  matterAssociationFilter,
  matterVisibilityFilter,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/permissions");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    hearing: { findMany: vi.fn() },
    deadline: { findMany: vi.fn() },
    workTask: { findMany: vi.fn() },
  },
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockMatterAssoc = vi.mocked(matterAssociationFilter, true);
const mockMatterVis = vi.mocked(matterVisibilityFilter, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockMatterAssoc.mockReturnValue({ ownerId: "u1" });
  mockMatterVis.mockReturnValue({});
});

// Helper to create a date at midnight
function midnight(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

describe("schedule/actions", () => {
  describe("listScheduleItems", () => {
    it("should require authentication", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));

      await expect(
        listScheduleItems({ from: new Date() })
      ).rejects.toThrow("Unauthorized");
    });

    it("should use default from (today start) and to (1 year later)", async () => {
      const now = new Date();
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      await listScheduleItems();

      // Capture the calls to verify date ranges
      const hearingWhere = mockPrisma.hearing.findMany.mock.calls[0][0].where as any;
      const deadlineWhere = mockPrisma.deadline.findMany.mock.calls[0][0].where as any;

      expect(hearingWhere.startsAt.gte).toBeInstanceOf(Date);
      expect(deadlineWhere.dueAt.gte).toBeInstanceOf(Date);
      expect(hearingWhere.startsAt.lte.getTime()).toBeGreaterThan(
        hearingWhere.startsAt.gte.getTime()
      );
    });

    it("should pass onlyMine flag to matterAssociationFilter", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      await listScheduleItems({ onlyMine: true });

      expect(mockMatterAssoc).toHaveBeenCalledWith("u1");
      expect(mockMatterVis).not.toHaveBeenCalled();
    });

    it("should pass onlyMine false to matterVisibilityFilter", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      await listScheduleItems({ onlyMine: false });

      expect(mockMatterVis).toHaveBeenCalledWith("u1", "LAWYER");
      expect(mockMatterAssoc).not.toHaveBeenCalled();
    });

    it("should include hearings and map correctly", async () => {
      const now = new Date();
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([
        {
          id: "h1",
          title: "Hearing 1",
          startsAt: new Date(now.getTime() + 86400000),
          procedure: {
            type: "TRIAL",
            customLabel: "开庭",
            matter: {
              id: "m1",
              internalCode: "CA-001",
              title: "Case A",
              primaryClient: { name: "Client A" },
              clientLinks: [],
            },
          },
        },
      ]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      const result = await listScheduleItems({ from: now, to: new Date(now.getTime() + 7 * 86400000) });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "h-h1",
        type: "hearing",
        title: "Hearing 1",
        occurredAt: expect.any(Date),
        matter: { id: "m1", internalCode: "CA-001", title: "Case A" },
        clientName: "Client A",
        procedureLabel: "开庭",
      });
    });

    it("should include deadlines and map correctly", async () => {
      const now = new Date();
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([]);
      mockPrisma.deadline.findMany.mockResolvedValue([
        {
          id: "d1",
          title: "Deadline 1",
          dueAt: new Date(now.getTime() + 2 * 86400000),
          completed: false,
          remindDays: 1,
          category: "SUBMISSION",
          procedure: {
            type: "FILING",
            customLabel: null,
            matter: {
              id: "m2",
              internalCode: "CA-002",
              title: "Case B",
              primaryClient: null,
              clientLinks: [
                { isPrimary: false, client: { name: "Client B1" } },
                { isPrimary: true, client: { name: "Client B2" } },
              ],
            },
          },
        },
      ]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      const result = await listScheduleItems({ from: now, to: new Date(now.getTime() + 7 * 86400000) });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "d-d1",
        type: "deadline",
        title: "Deadline 1",
        occurredAt: expect.any(Date),
        matter: { id: "m2", internalCode: "CA-002", title: "Case B" },
        clientName: "Client B2", // primary true
        procedureLabel: "FILING", // fallback
        completed: false,
        remindDays: 1,
        category: "SUBMISSION",
      });
    });

    // Tasks are currently not fetched (placeholder empty array) – verify that no task items appear
    it("should not include tasks (feature placeholder)", async () => {
      const now = new Date();
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      const result = await listScheduleItems({ from: now, to: new Date(now.getTime() + 7 * 86400000) });

      expect(result.every(item => item.type !== 'task')).toBe(true);
    });

    it("should sort items by occurredAt ascending", async () => {
      const now = new Date();
      const day1 = new Date(now.getTime() + 1 * 86400000);
      const day2 = new Date(now.getTime() + 2 * 86400000);
      const day3 = new Date(now.getTime() + 3 * 86400000);

      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([
        { id: "h1", title: "H1", startsAt: day2, procedure: { type: "TRIAL", customLabel: null, matter: { id: "m1", internalCode: "C1", title: "M1", primaryClient: null, clientLinks: [] } } },
      ]);
      mockPrisma.deadline.findMany.mockResolvedValue([
        { id: "d1", title: "D1", dueAt: day1, completed: false, remindDays: null, category: null, procedure: { type: "FILING", customLabel: null, matter: { id: "m2", internalCode: "C2", title: "M2", primaryClient: null, clientLinks: [] } } },
      ]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      const result = await listScheduleItems({ from: now, to: new Date(now.getTime() + 7 * 86400000) });

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("deadline");
      expect(result[1].type).toBe("hearing");
    });

    it("should handle includeCompleted flag for deadlines", async () => {
      const now = new Date();
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([]);
      mockPrisma.deadline.findMany.mockResolvedValue([
        {
          id: "d1",
          title: "D1",
          dueAt: now,
          completed: true,
          remindDays: null,
          category: null,
          procedure: { type: "FILING", customLabel: null, matter: { id: "m1", internalCode: "C1", title: "M1", primaryClient: null, clientLinks: [] } },
        },
      ]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      // without includeCompleted
      await listScheduleItems({ from: now, to: new Date(now.getTime() + 86400000) });
      const where1 = mockPrisma.deadline.findMany.mock.calls[0][0].where as any;
      expect(where1.completed).toBe(false);

      // with includeCompleted
      await listScheduleItems({ from: now, to: new Date(now.getTime() + 86400000), includeCompleted: true });
      const where2 = mockPrisma.deadline.findMany.mock.calls[1][0].where as any;
      expect(where2).not.toHaveProperty("completed");
    });

    it("should spread matter filter correctly for onlyMine", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      await listScheduleItems({ onlyMine: true });

      const hearingWhere = mockPrisma.hearing.findMany.mock.calls[0][0].where as any;
      expect(hearingWhere.procedure.matter).toMatchObject({
        deletedAt: null,
        ownerId: "u1",
      });
    });

    it("should spread matter filter correctly for visibility (role-based)", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      await listScheduleItems({ onlyMine: false });

      const hearingWhere = mockPrisma.hearing.findMany.mock.calls[0][0].where as any;
      expect(hearingWhere.procedure.matter).toMatchObject({
        deletedAt: null,
      });
      // visibility filter may add more like members/visibility but we don't care exact
    });

    it("should handle empty clientLinks and no primary", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([
        {
          id: "h1",
          title: "H1",
          startsAt: new Date(),
          procedure: {
            type: "TRIAL",
            customLabel: null,
            matter: {
              id: "m1",
              internalCode: "C1",
              title: "M1",
              primaryClient: null,
              clientLinks: [],
            },
          },
        },
      ]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      const result = await listScheduleItems({});

      expect(result[0].clientName).toBeNull();
    });

    it("should handle clientLinks without primary and take first", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([
        {
          id: "h1",
          title: "H1",
          startsAt: new Date(),
          procedure: {
            type: "TRIAL",
            customLabel: null,
            matter: {
              id: "m1",
              internalCode: "C1",
              title: "M1",
              primaryClient: null,
              clientLinks: [
                { isPrimary: false, client: { name: "Client X" } },
                { isPrimary: false, client: { name: "Client Y" } },
              ],
            },
          },
        },
      ]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      const result = await listScheduleItems({});

      expect(result[0].clientName).toBe("Client X");
    });

    it("should use procedure customLabel when present (preserve whitespace)", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([
        {
          id: "h1",
          title: "H1",
          startsAt: new Date(),
          procedure: {
            type: "arbitral",
            customLabel: " 仲裁", // leading whitespace preserved
            matter: {
              id: "m1",
              internalCode: "C1",
              title: "M1",
              primaryClient: null,
              clientLinks: [],
            },
          },
        },
      ]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      const result = await listScheduleItems({});

      expect(result[0].procedureLabel).toBe(" 仲裁");
    });

    it("should fallback to procedure type when customLabel is null", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.hearing.findMany.mockResolvedValue([
        {
          id: "h1",
          title: "H1",
          startsAt: new Date(),
          procedure: {
            type: "TRIAL",
            customLabel: null,
            matter: {
              id: "m1",
              internalCode: "C1",
              title: "M1",
              primaryClient: null,
              clientLinks: [],
            },
          },
        },
      ]);
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.workTask.findMany.mockResolvedValue([]);

      const result = await listScheduleItems({});

      expect(result[0].procedureLabel).toBe("TRIAL");
    });
  });
});
