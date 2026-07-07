// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createNote,
  updateNote,
  deleteNote,
  listNotes,
} from "@/server/notes/actions";
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
    note: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
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
    user: { id: "u1", role: "LAWYER" },
  } as any);
  mockAssertCanAccessMatter.mockResolvedValue(undefined);
  mockAssertMatterWritable.mockResolvedValue(undefined);
});

// 25-char CUIDs
const CUID1 = "c111111111111111111111111";
const CUID2 = "c222222222222222222222222";
const CUID3 = "c333333333333333333333333";

describe("notes/actions", () => {
  describe("createNote", () => {
    it("should create note with required fields", async () => {
      mockPrisma.note.create.mockResolvedValue({
        id: CUID1,
        matterId: CUID1,
        content: "Test note",
        authorId: "u1",
        channel: "OTHER",
      });

      const result = await createNote({
        matterId: CUID1,
        content: "Test note",
      });

      expect(result).toEqual({ ok: true, id: CUID1 });
      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matterId: CUID1,
          authorId: "u1",
          content: "Test note",
          withWhom: null,
          channel: "OTHER",
          tags: [],
        }),
      });
      expect(mockAudit).toHaveBeenCalledWith({
        userId: "u1",
        action: "NOTE_CREATE",
        targetType: "Note",
        targetId: CUID1,
        detail: { matterId: CUID1, channel: "OTHER" },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID1}`);
    });

    it("should accept all optional fields", async () => {
      mockPrisma.note.create.mockResolvedValue({
        id: CUID1,
        matterId: CUID1,
        content: "Full",
        channel: "PHONE",
        withWhom: "John",
        occurredAt: new Date("2025-07-07"),
        tags: ["important"],
      });

      await createNote({
        matterId: CUID1,
        content: "Full",
        channel: "PHONE",
        withWhom: "John",
        occurredAt: new Date("2025-07-07"),
        tags: ["important"],
      });

      const data = mockPrisma.note.create.mock.calls[0][0].data;
      expect(data.channel).toBe("PHONE");
      expect(data.withWhom).toBe("John");
      expect(data.occurredAt).toEqual(new Date("2025-07-07"));
      expect(data.tags).toEqual(["important"]);
    });
  });

  describe("updateNote", () => {
    it("should update note and revalidate matter path", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({
        id: CUID1,
        matterId: CUID1,
        authorId: "u1",
      });
      mockPrisma.note.update.mockResolvedValue({ id: CUID1 });

      await updateNote({
        id: CUID1,
        matterId: CUID1,
        content: "Updated content",
        channel: "EMAIL",
        withWhom: "",
        occurredAt: new Date("2025-07-07"),
        tags: [],
      });

      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: CUID1 },
        data: expect.objectContaining({
          content: "Updated content",
          channel: "EMAIL",
          withWhom: null,
          occurredAt: new Date("2025-07-07"),
          tags: [],
        }),
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID1}`);
      expect(mockAudit).toHaveBeenCalledWith({
        userId: "u1",
        action: "NOTE_UPDATE",
        targetType: "Note",
        targetId: CUID1,
      });
    });
  });

  describe("deleteNote", () => {
    it("should delete note and revalidate matter path", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({
        id: CUID1,
        matterId: CUID1,
        authorId: "u1",
      });
      mockPrisma.note.update.mockResolvedValue({ id: CUID1 });

      await deleteNote(CUID1);

      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: CUID1 },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/matters/${CUID1}`);
      expect(mockAudit).toHaveBeenCalledWith({
        userId: "u1",
        action: "NOTE_DELETE",
        targetType: "Note",
        targetId: CUID1,
      });
    });
  });

  describe("listNotes", () => {
    it("should list notes for a matter", async () => {
      mockPrisma.note.findMany.mockResolvedValue([
        {
          id: CUID1,
          content: "Note 1",
          channel: "EMAIL",
          occurredAt: new Date(),
          author: { id: "u1", name: "User" },
        },
      ]);

      const result = await listNotes(CUID1);

      expect(result).toHaveLength(1);
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { matterId: CUID1, deletedAt: null },
          include: expect.objectContaining({
            author: { select: { id: true, name: true } },
          }),
          orderBy: { occurredAt: "desc" },
        })
      );
    });

    it("should call assertCanAccessMatter", async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);
      await listNotes(CUID1);
      expect(mockAssertCanAccessMatter).toHaveBeenCalledWith(
        "u1",
        "LAWYER",
        CUID1
      );
    });
  });
});
