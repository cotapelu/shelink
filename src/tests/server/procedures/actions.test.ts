// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addProcedure,
  updateProcedure,
  deleteProcedure,
  addDeadline,
  toggleDeadlineCompleted,
  deleteDeadline,
  addHearing,
  deleteHearing,
  addProcedureMemo,
  toggleProcedureMemo,
  deleteProcedureMemo,
} from "@/server/procedures/actions";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";
import { assertMatterWritable } from "@/lib/archive/guard";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/permissions");
vi.mock("@/lib/archive/guard");
vi.mock("@/server/audit");
vi.mock("next/cache");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    matterProcedure: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    deadline: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    hearing: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    procedureMemo: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    timelineEvent: {
      create: vi.fn(),
    },
  },
}));

const mockRequireSession = vi.mocked(requireSession, true);
const mockAssertCanAccessMatter = vi.mocked(assertCanAccessMatter, true);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable, true);
const mockAudit = vi.mocked(audit, true);
const mockRevalidatePath = vi.mocked(revalidatePath, true);
const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: CUID(1), role: "LAWYER" },
  } as any);
  mockAssertCanAccessMatter.mockResolvedValue(undefined);
  mockAssertMatterWritable.mockResolvedValue(undefined);
});

const CUID = (n: number) => `c${n.toString().padStart(24, "0")}`; // 25-char CUID

describe("procedures/actions", () => {
  describe("addProcedure", () => {
    it("should create procedure and timeline event with correct fields", async () => {
      const input = {
        matterId: CUID(1),
        type: "FIRST_INSTANCE",
        customLabel: "Test Procedure",
        engagement: "ENGAGED",
      };
      mockPrisma.matterProcedure.findFirst.mockResolvedValue(null);
      const createdProc = {
        id: CUID(2),
        matterId: CUID(1),
        type: "FIRST_INSTANCE",
        customLabel: "Test Procedure",
        engagement: "ENGAGED",
        order: 1,
        caseNumber: null,
        jurisdiction: null,
        handlingAgency: null,
        panel: null,
        handler: null,
        acceptedAt: undefined,
        leadLawyerId: null,
        isExternalLead: false,
        status: "IN_PROGRESS",
      };
      mockPrisma.matterProcedure.create.mockResolvedValue(createdProc);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);

      const result = await addProcedure(input as any);

      expect(mockPrisma.matterProcedure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matterId: CUID(1),
            type: "FIRST_INSTANCE",
            customLabel: "Test Procedure",
            engagement: "ENGAGED",
            order: 1,
            caseNumber: null,
            jurisdiction: null,
            handlingAgency: null,
            panel: null,
            handler: null,
            acceptedAt: undefined,
            leadLawyerId: null,
            isExternalLead: false,
            status: "IN_PROGRESS",
          }),
        })
      );
      expect(mockPrisma.timelineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matterId: CUID(1),
            eventType: "PROCEDURE_ADDED",
            title: `新增程序：Test Procedure`,
            occurredAt: expect.any(Date),
            refType: "MatterProcedure",
            refId: CUID(2),
          }),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(1)}`);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "PROCEDURE_CREATE",
          targetType: "MatterProcedure",
          targetId: CUID(2),
          detail: { matterId: CUID(1), type: "FIRST_INSTANCE" },
        })
      );
      expect(result).toEqual({ ok: true, id: CUID(2) });
    });

    it("should compute order from existing procedures", async () => {
      const input = {
        matterId: CUID(1),
        type: "SECOND_INSTANCE",
        engagement: "ENGAGED",
      };
      mockPrisma.matterProcedure.findFirst.mockResolvedValue({ order: 3 });
      const createdProc = {
        id: CUID(2),
        matterId: CUID(1),
        type: "SECOND_INSTANCE",
        customLabel: null,
        order: 4,
        status: "IN_PROGRESS",
      };
      mockPrisma.matterProcedure.create.mockResolvedValue(createdProc);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);

      await addProcedure(input as any);

      expect(mockPrisma.matterProcedure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 4, status: "IN_PROGRESS" }),
        })
      );
    });

    it("should set status to CONCLUDED when engagement is INFORMATIONAL", async () => {
      const input = {
        matterId: CUID(1),
        type: "CUSTOM",
        engagement: "INFORMATIONAL",
      };
      mockPrisma.matterProcedure.findFirst.mockResolvedValue(null);
      mockPrisma.matterProcedure.create.mockResolvedValue({
        id: CUID(2),
        matterId: CUID(1),
        type: "CUSTOM",
        order: 1,
        status: "CONCLUDED",
      } as any);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);

      await addProcedure(input as any);

      expect(mockPrisma.matterProcedure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "CONCLUDED" }),
        })
      );
    });
  });

  describe("updateProcedure", () => {
    it("should update procedure and revalidate", async () => {
      const input = {
        id: CUID(1),
        matterId: CUID(2),
        type: "FIRST_INSTANCE",
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue({
        id: CUID(1),
        matterId: CUID(2),
      });
      mockPrisma.matterProcedure.update.mockResolvedValue({
        id: CUID(1),
        matterId: CUID(2),
        type: "FIRST_INSTANCE",
      } as any);

      await updateProcedure(input as any);

      expect(mockPrisma.matterProcedure.update).toHaveBeenCalledWith({
        where: { id: CUID(1) },
        data: expect.objectContaining({ type: "FIRST_INSTANCE" }),
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "PROCEDURE_UPDATE",
          targetType: "MatterProcedure",
          targetId: CUID(1),
        })
      );
    });

    it("should throw if procedure not found", async () => {
      const input = {
        id: CUID(1),
        matterId: CUID(2),
        type: "FIRST_INSTANCE",
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue(null);

      await expect(updateProcedure(input as any)).rejects.toThrow("程序不存在");
    });
  });

  describe("deleteProcedure", () => {
    it("should delete procedure and revalidate", async () => {
      const procedure = {
        id: CUID(1),
        matterId: CUID(2),
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue(procedure);
      mockPrisma.matterProcedure.delete.mockResolvedValue(procedure);

      const result = await deleteProcedure(CUID(1));

      expect(mockPrisma.matterProcedure.delete).toHaveBeenCalledWith({
        where: { id: CUID(1) },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "PROCEDURE_DELETE",
          targetType: "MatterProcedure",
          targetId: CUID(1),
          detail: { matterId: CUID(2) },
        })
      );
      expect(result).toEqual({ ok: true });
    });

    it("should return { ok: false } if not found", async () => {
      mockPrisma.matterProcedure.findUnique.mockResolvedValue(null);
      const result = await deleteProcedure(CUID(1));
      expect(result).toEqual({ ok: false });
    });
  });

  describe("addDeadline", () => {
    it("should create deadline and timeline event", async () => {
      const input = {
        procedureId: CUID(1),
        title: "Statute of limitations",
        category: "LIMITATION",
        dueAt: new Date("2025-08-01T00:00:00"),
        remindDays: 3,
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue({
        matterId: CUID(2),
      });
      const createdDeadline = {
        id: CUID(3),
        procedureId: CUID(1),
        title: input.title,
        category: "LIMITATION",
        dueAt: input.dueAt,
        remindDays: 3,
      };
      mockPrisma.deadline.create.mockResolvedValue(createdDeadline);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);

      const result = await addDeadline(input as any);

      expect(mockPrisma.deadline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            procedureId: CUID(1),
            title: input.title,
            category: "LIMITATION",
            dueAt: input.dueAt,
            remindDays: 3,
          }),
        })
      );
      expect(mockPrisma.timelineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matterId: CUID(2),
            eventType: "DEADLINE_ADDED",
            title: `新增期限：${input.title}`,
            occurredAt: expect.any(Date),
            refType: "Deadline",
            refId: CUID(3),
          }),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "DEADLINE_CREATE",
          targetType: "Deadline",
          targetId: CUID(3),
          detail: { matterId: CUID(2), procedureId: CUID(1) },
        })
      );
      expect(result).toEqual({ ok: true, id: CUID(3) });
    });

    it("should throw if procedure does not exist", async () => {
      const input = {
        procedureId: CUID(1),
        title: "Test",
        category: "CUSTOM",
        dueAt: new Date(),
        remindDays: 3,
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue(null);
      await expect(addDeadline(input as any)).rejects.toThrow("程序不存在");
    });
  });

  describe("toggleDeadlineCompleted", () => {
    it("should toggle completed flag and audit for completion", async () => {
      const id = CUID(1);
      const current = {
        id,
        completed: false,
        procedure: {
          matterId: CUID(2),
        },
      };
      mockPrisma.deadline.findUnique.mockResolvedValue(current);
      mockPrisma.deadline.update.mockResolvedValue({
        ...current,
        completed: true,
        completedAt: expect.any(Date),
      } as any);

      await toggleDeadlineCompleted(id);

      expect(mockPrisma.deadline.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          completed: true,
          completedAt: expect.any(Date),
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "DEADLINE_COMPLETE",
          targetType: "Deadline",
          targetId: id,
        })
      );
    });

    it("should toggle back to not done and audit for reopen", async () => {
      const id = CUID(1);
      const current = {
        id,
        completed: true,
        completedAt: new Date(),
        procedure: {
          matterId: CUID(2),
        },
      };
      mockPrisma.deadline.findUnique.mockResolvedValue(current);
      mockPrisma.deadline.update.mockResolvedValue({
        ...current,
        completed: false,
        completedAt: null,
      } as any);

      await toggleDeadlineCompleted(id);

      expect(mockPrisma.deadline.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          completed: false,
          completedAt: null,
        },
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DEADLINE_REOPEN",
        })
      );
    });

    it("should return { ok: false } if deadline not found", async () => {
      mockPrisma.deadline.findUnique.mockResolvedValue(null);
      const result = await toggleDeadlineCompleted(CUID(1));
      expect(result).toEqual({ ok: false });
    });
  });

  describe("deleteDeadline", () => {
    it("should delete deadline and revalidate", async () => {
      const id = CUID(1);
      const current = {
        id,
        procedure: {
          matterId: CUID(2),
        },
      };
      mockPrisma.deadline.findUnique.mockResolvedValue(current);
      mockPrisma.deadline.delete.mockResolvedValue({ id } as any);

      const result = await deleteDeadline(id);

      expect(mockPrisma.deadline.delete).toHaveBeenCalledWith({
        where: { id },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "DEADLINE_DELETE",
          targetType: "Deadline",
          targetId: id,
        })
      );
      expect(result).toEqual({ ok: true });
    });

    it("should return { ok: false } if not found", async () => {
      mockPrisma.deadline.findUnique.mockResolvedValue(null);
      const result = await deleteDeadline(CUID(1));
      expect(result).toEqual({ ok: false });
    });
  });

  describe("addHearing", () => {
    it("should create hearing and timeline event", async () => {
      const input = {
        procedureId: CUID(1),
        title: "Opening Hearing",
        startsAt: new Date("2025-09-01T10:00:00"),
        endsAt: new Date("2025-09-01T12:00:00"),
        room: "Court A",
        address: "123 Court St",
        judge: "Judge Smith",
        contact: "Clerk",
        notes: "Preliminary",
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue({
        matterId: CUID(2),
      });
      const createdHearing = {
        id: CUID(3),
        procedureId: CUID(1),
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        room: "Court A",
        address: "123 Court St",
        judge: "Judge Smith",
        contact: "Clerk",
        notes: "Preliminary",
      };
      mockPrisma.hearing.create.mockResolvedValue(createdHearing);
      mockPrisma.timelineEvent.create.mockResolvedValue({} as any);

      const result = await addHearing(input as any);

      expect(mockPrisma.hearing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            procedureId: CUID(1),
            title: "Opening Hearing",
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            room: "Court A",
            address: "123 Court St",
            judge: "Judge Smith",
            contact: "Clerk",
            notes: "Preliminary",
          }),
        })
      );
      expect(mockPrisma.timelineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matterId: CUID(2),
            eventType: "HEARING_SCHEDULED",
            title: `开庭：Opening Hearing`,
            occurredAt: input.startsAt,
            refType: "Hearing",
            refId: CUID(3),
          }),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "HEARING_CREATE",
          targetType: "Hearing",
          targetId: CUID(3),
          detail: { matterId: CUID(2), procedureId: CUID(1) },
        })
      );
      expect(result).toEqual({ ok: true, id: CUID(3) });
    });

    it("should throw if procedure not found", async () => {
      const input = {
        procedureId: CUID(1),
        title: "Test",
        startsAt: new Date(),
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue(null);
      await expect(addHearing(input as any)).rejects.toThrow("程序不存在");
    });
  });

  describe("deleteHearing", () => {
    it("should delete hearing and revalidate", async () => {
      const id = CUID(1);
      const current = {
        id,
        procedure: {
          matterId: CUID(2),
        },
      };
      mockPrisma.hearing.findUnique.mockResolvedValue(current);
      mockPrisma.hearing.delete.mockResolvedValue({ id } as any);

      const result = await deleteHearing(id);

      expect(mockPrisma.hearing.delete).toHaveBeenCalledWith({
        where: { id },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: CUID(1),
          action: "HEARING_DELETE",
          targetType: "Hearing",
          targetId: id,
        })
      );
      expect(result).toEqual({ ok: true });
    });

    it("should return { ok: false } if hearing not found", async () => {
      mockPrisma.hearing.findUnique.mockResolvedValue(null);
      const result = await deleteHearing(CUID(1));
      expect(result).toEqual({ ok: false });
    });
  });

  describe("addProcedureMemo", () => {
    it("should create memo with content and procedureId", async () => {
      const input = {
        procedureId: CUID(1),
        content: "Test memo content",
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue({
        matterId: CUID(2),
      });
      const createdMemo = {
        id: CUID(3),
        procedureId: CUID(1),
        content: "Test memo content",
        createdById: CUID(1),
        done: false,
        doneAt: null,
      };
      mockPrisma.procedureMemo.create.mockResolvedValue(createdMemo);

      const result = await addProcedureMemo(input as any);

      expect(mockPrisma.procedureMemo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            procedureId: CUID(1),
            content: "Test memo content",
            createdById: CUID(1),
          }),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(mockAudit).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true, id: CUID(3) });
    });

    it("should throw if content empty after trim", async () => {
      const input = {
        procedureId: CUID(1),
        content: "   ",
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue({
        matterId: CUID(2),
      });

      await expect(addProcedureMemo(input as any)).rejects.toThrow("备忘内容不能为空");
    });

    it("should throw if content too long", async () => {
      const longContent = "a".repeat(1001);
      const input = {
        procedureId: CUID(1),
        content: longContent,
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue({
        matterId: CUID(2),
      });

      await expect(addProcedureMemo(input as any)).rejects.toThrow("备忘内容过长（≤1000字）");
    });

    it("should throw if procedure does not exist", async () => {
      const input = {
        procedureId: CUID(1),
        content: "Memo",
      };
      mockPrisma.matterProcedure.findUnique.mockResolvedValue(null);
      await expect(addProcedureMemo(input as any)).rejects.toThrow("程序不存在");
    });
  });

  describe("toggleProcedureMemo", () => {
    it("should toggle done flag to true", async () => {
      const id = CUID(1);
      const current = {
        id,
        done: false,
        doneAt: null,
        procedure: {
          matterId: CUID(2),
        },
      };
      mockPrisma.procedureMemo.findUnique.mockResolvedValue(current);
      const updated = {
        ...current,
        done: true,
        doneAt: expect.any(Date),
      };
      mockPrisma.procedureMemo.update.mockResolvedValue(updated);

      await toggleProcedureMemo(id);

      expect(mockPrisma.procedureMemo.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          done: true,
          doneAt: expect.any(Date),
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
    });

    it("should toggle done flag to false", async () => {
      const id = CUID(1);
      const current = {
        id,
        done: true,
        doneAt: new Date(),
        procedure: {
          matterId: CUID(2),
        },
      };
      mockPrisma.procedureMemo.findUnique.mockResolvedValue(current);
      const updated = {
        ...current,
        done: false,
        doneAt: null,
      };
      mockPrisma.procedureMemo.update.mockResolvedValue(updated);

      await toggleProcedureMemo(id);

      expect(mockPrisma.procedureMemo.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          done: false,
          doneAt: null,
        },
      });
    });

    it("should return { ok: false } if not found", async () => {
      mockPrisma.procedureMemo.findUnique.mockResolvedValue(null);
      const result = await toggleProcedureMemo(CUID(1));
      expect(result).toEqual({ ok: false });
    });
  });

  describe("deleteProcedureMemo", () => {
    it("should delete memo and revalidate", async () => {
      const id = CUID(1);
      const current = {
        id,
        procedure: {
          matterId: CUID(2),
        },
      };
      mockPrisma.procedureMemo.findUnique.mockResolvedValue(current);
      mockPrisma.procedureMemo.delete.mockResolvedValue({ id } as any);

      const result = await deleteProcedureMemo(id);

      expect(mockPrisma.procedureMemo.delete).toHaveBeenCalledWith({
        where: { id },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID(2)}`);
      expect(mockAudit).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it("should return { ok: false } if not found", async () => {
      mockPrisma.procedureMemo.findUnique.mockResolvedValue(null);
      const result = await deleteProcedureMemo(CUID(1));
      expect(result).toEqual({ ok: false });
    });
  });
});
