// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTask,
  updateTask,
  deleteTask,
  getTask,
  listTasks,
} from "@/server/tasks/actions";
import { requireSession } from "@/lib/auth/session";
import { assertCanAssociateMatter } from "@/lib/permissions";
import { assertMatterWritable } from "@/lib/archive/guard";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/permissions");
vi.mock("@/lib/archive/guard");
vi.mock("@/server/audit");
vi.mock("@/server/notifications/create");
vi.mock("next/cache");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    legalTask: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    timelineEvent: { create: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockAssertCanAssociateMatter = vi.mocked(assertCanAssociateMatter, true);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable, true);
const mockAudit = vi.mocked(audit, true);
const mockCreateNotification = vi.mocked(createNotification, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER" },
  } as any);
  mockAssertCanAssociateMatter.mockResolvedValue(undefined);
  mockAssertMatterWritable.mockResolvedValue(undefined);
});

// Valid CUIDs: start with 'c', alphanumeric, length 25
const CUID1 = "c111111111111111111111111"; // 25 chars
const CUID2 = "c222222222222222222222222";
const CUID3 = "c333333333333333333333333";

describe("tasks/actions", () => {
  describe("createTask", () => {
    it("should create task with required fields only", async () => {
      mockPrisma.legalTask.create.mockResolvedValue({
        id: CUID1,
        title: "Task 1",
        matterId: CUID1,
        priority: 0,
      });

      const result = await createTask({
        matterId: CUID1,
        title: "Task 1",
      });

      expect(result).toEqual({ ok: true, id: CUID1 });
      expect(mockPrisma.legalTask.create).toHaveBeenCalledWith({
        data: {
          matterId: CUID1,
          title: "Task 1",
          description: null,
          assigneeId: null,
          dueAt: undefined,
          priority: 0,
          stageId: null,
        },
      });
      expect(mockAudit).toHaveBeenCalledWith({
        userId: "u1",
        action: "TASK_CREATE",
        targetType: "LegalTask",
        targetId: CUID1,
        detail: { matterId: CUID1, title: "Task 1" },
      });
    });

    it("should create timeline event after task created", async () => {
      mockPrisma.legalTask.create.mockResolvedValue({
        id: CUID1,
        title: "Created",
        matterId: CUID1,
      });

      await createTask({ matterId: CUID1, title: "Created" });

      expect(mockPrisma.timelineEvent.create).toHaveBeenCalledWith({
        data: {
          matterId: CUID1,
          eventType: "TASK_ADDED",
          title: "新增事项：Created",
          occurredAt: expect.any(Date),
          refType: "LegalTask",
          refId: CUID1,
        },
      });
    });

    it("should send notification to assignee if different from creator", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u1", role: "LAWYER" },
      } as any);
      mockPrisma.legalTask.create.mockResolvedValue({
        id: CUID1,
        title: "Assign test",
        matterId: CUID1,
        assigneeId: CUID2,
      });

      await createTask({
        matterId: CUID1,
        title: "Assign test",
        assigneeId: CUID2,
      });

      expect(mockCreateNotification).toHaveBeenCalledWith({
        userId: CUID2,
        type: "TASK_ASSIGNED",
        title: "您有新事项",
        content: `事项「Assign test」已指派给您`,
        href: expect.stringContaining(`/matters/${CUID1}`),
        refType: "LegalTask",
        refId: CUID1,
      });
    });

    it("should not send notification when assignee is self", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: CUID1, role: "LAWYER" },
      } as any);
      mockPrisma.legalTask.create.mockResolvedValue({
        id: CUID2,
        title: "Self",
        matterId: CUID1,
        assigneeId: CUID1,
      });

      await createTask({
        matterId: CUID1,
        title: "Self",
        assigneeId: CUID1,
      });

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should not send notification when no assignee", async () => {
      mockPrisma.legalTask.create.mockResolvedValue({
        id: CUID1,
        title: "No assignee",
        matterId: CUID1,
        assigneeId: null,
      });

      await createTask({
        matterId: CUID1,
        title: "No assignee",
      });

      expect(mockCreateNotification).not.toHaveBeenCalled();
    });
  });

  describe("updateTask", () => {
    it("should update task and revalidate matter path", async () => {
      mockPrisma.legalTask.update.mockResolvedValue({
        id: CUID1,
        title: "Updated",
        matterId: CUID1,
      });

      await updateTask({
        id: CUID1,
        matterId: CUID1,
        title: "Updated",
      });

      expect(mockPrisma.legalTask.update).toHaveBeenCalledWith({
        where: { id: CUID1 },
        data: {
          title: "Updated",
          description: null,
          assigneeId: null,
          dueAt: undefined,
          priority: 0,
          stageId: null,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID1}`);
      expect(mockAudit).toHaveBeenCalledWith({
        userId: "u1",
        action: "TASK_UPDATE",
        targetType: "LegalTask",
        targetId: CUID1,
        detail: expect.any(Object),
      });
    });
  });

  describe("deleteTask", () => {
    it("should delete task and revalidate matter path", async () => {
      mockPrisma.legalTask.findUnique.mockResolvedValue({
        id: CUID1,
        matterId: "m1",
      });
      mockPrisma.legalTask.delete.mockResolvedValue({
        id: CUID1,
        matterId: "m1",
      });

      await deleteTask(CUID1);

      expect(mockPrisma.legalTask.delete).toHaveBeenCalledWith({
        where: { id: CUID1 },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/m1`);
      expect(mockAudit).toHaveBeenCalledWith({
        userId: "u1",
        action: "TASK_DELETE",
        targetType: "LegalTask",
        targetId: CUID1,
        detail: {},
      });
    });

    it("should throw if task not found", async () => {
      mockPrisma.legalTask.findUnique.mockResolvedValue(null);
      await expect(deleteTask(CUID1)).rejects.toThrow("Task not found");
    });
  });

  describe("getTask", () => {
    it("should return task with matter info", async () => {
      mockPrisma.legalTask.findUnique.mockResolvedValue({
        id: CUID1,
        title: "My Task",
        matter: {
          id: "m1",
          internalCode: "CA-001",
          title: "Matter A",
        },
      });

      const result = await getTask(CUID1);

      expect(result).toEqual({
        id: CUID1,
        title: "My Task",
        matter: {
          id: "m1",
          internalCode: "CA-001",
          title: "Matter A",
        },
      });
    });

    it("should throw if task not found", async () => {
      mockPrisma.legalTask.findUnique.mockResolvedValue(null);
      await expect(getTask(CUID1)).rejects.toThrow("Task not found");
    });
  });

  describe("listTasks", () => {
    it("should list all tasks with default params", async () => {
      mockPrisma.legalTask.findMany.mockResolvedValue([]);

      await listTasks();

      expect(mockPrisma.legalTask.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          matter: {
            select: { id: true, internalCode: true, title: true },
          },
        },
        orderBy: [{ dueAt: "asc" }],
      });
    });

    it("should filter by matterId", async () => {
      mockPrisma.legalTask.findMany.mockResolvedValue([]);
      await listTasks({ matterId: "m1" });
      const where = mockPrisma.legalTask.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ matterId: "m1" });
    });

    it("should filter by assigneeId", async () => {
      mockPrisma.legalTask.findMany.mockResolvedValue([]);
      await listTasks({ assigneeId: "u2" });
      const where = mockPrisma.legalTask.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ assigneeId: "u2" });
    });

    it("should filter by completed", async () => {
      mockPrisma.legalTask.findMany.mockResolvedValue([]);
      await listTasks({ completed: true });
      const where = mockPrisma.legalTask.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ completed: true });
    });

    it("should combine multiple filters", async () => {
      mockPrisma.legalTask.findMany.mockResolvedValue([]);
      await listTasks({ matterId: "m1", completed: false });
      const where = mockPrisma.legalTask.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ matterId: "m1", completed: false });
    });
  });
});
