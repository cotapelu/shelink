import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createNote,
  updateNote,
  deleteNote,
  listNotes
} from "@/server/notes/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAccessMatter } from "@/lib/permissions";

vi.mock("@/lib/prisma");
vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("@/lib/archive/guard");
vi.mock("@/lib/permissions");
vi.mock("next/cache");

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockAssertMatterWritable = vi.mocked(assertMatterWritable);
const mockAssertCanAccessMatter = vi.mocked(assertCanAccessMatter);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER", name: "User" }
  } as any);
  mockPrisma.note = {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn()
  } as any;
  mockPrisma.matter = { findUnique: vi.fn() } as any;
  mockAssertMatterWritable.mockResolvedValue(undefined as any);
  mockAssertCanAccessMatter.mockResolvedValue(undefined as any);
});

describe("notes actions", () => {
  describe("createNote", () => {
    const matterId = "cjx4omfcw0000ml5tyivrzcse"; // valid cuid
    const validInput = {
      matterId,
      channel: "PHONE" as const,
      withWhom: "John",
      occurredAt: new Date(),
      content: "Discussion about case",
      tags: ["important"]
    };

    it("should create note", async () => {
      mockAssertMatterWritable.mockResolvedValue(undefined as any);
      mockAssertCanAccessMatter.mockResolvedValue(undefined as any);
      mockPrisma.note.create.mockResolvedValue({
        id: "n1",
        ...validInput,
        authorId: "u1"
      } as any);

      const result = await createNote(validInput as any);

      expect(result).toEqual({ ok: true, id: "n1" });
      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: {
          matterId: matterId,
          authorId: "u1",
          channel: "PHONE",
          withWhom: "John",
          occurredAt: validInput.occurredAt,
          content: "Discussion about case",
          tags: ["important"]
        }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "NOTE_CREATE",
          targetType: "Note",
          targetId: "n1",
          userId: "u1",
          detail: { matterId: matterId, channel: "PHONE" }
        })
      );
    });

    it("should reject if matter not accessible", async () => {
      mockAssertCanAccessMatter.mockRejectedValue(new Error("No access"));
      await expect(createNote(validInput as any)).rejects.toThrow("No access");
    });
  });

  describe("updateNote", () => {
    const noteId = "cjs4omfcw0000ml5tyivrzcse"; // valid cuid
    const updateInput = {
      id: noteId,
      matterId: "cjx4omfcw0000ml5tyivrzcse",
      channel: "EMAIL" as const,
      withWhom: "Jane",
      occurredAt: new Date(),
      content: "Updated content",
      tags: ["follow-up"]
    };

    it("should update own note", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({
        id: noteId,
        authorId: "u1",
        matterId: "cjx4omfcw0000ml5tyivrzcse"
      } as any);
      mockAssertMatterWritable.mockResolvedValue(undefined as any);
      mockPrisma.note.update.mockResolvedValue({ id: noteId, ...updateInput } as any);

      const result = await updateNote(updateInput as any);

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: {
          channel: "EMAIL",
          withWhom: "Jane",
          occurredAt: updateInput.occurredAt,
          content: "Updated content",
          tags: ["follow-up"]
        }
      });
    });

    it("should reject updating others' note", async () => {
      mockPrisma.note.findUnique.mockResolvedValue({
        id: noteId,
        authorId: "other",
        matterId: "cjx4omfcw0000ml5tyivrzcse"
      } as any);
      // session stays as u1
      await expect(updateNote(updateInput as any)).rejects.toThrow(
        "只能编辑自己的沟通记录"
      );
    });

    it("should reject if note does not exist", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(null);
      await expect(updateNote(updateInput as any)).rejects.toThrow("沟通记录不存在");
    });
  });

  describe("deleteNote", () => {
    const noteId = "cjs4omfcw0000ml5tyivrzcse"; // valid cuid
    it("should soft delete note", async () => {
      const existing = { id: noteId, authorId: "u1", matterId: "cjx4omfcw0000ml5tyivrzcse" } as any;
      mockPrisma.note.findUnique.mockResolvedValue(existing);
      mockPrisma.note.update.mockResolvedValue(existing as any);

      const result = await deleteNote(noteId);

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: noteId },
        data: { deletedAt: expect.any(Date) }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "NOTE_DELETE",
          targetType: "Note",
          targetId: noteId
        })
      );
    });

    it("should return {ok:false} if note not found", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(null);
      const result = await deleteNote(noteId);
      expect(result).toEqual({ ok: false });
    });
  });

  describe("listNotes", () => {
    it("should list notes for matter", async () => {
      const mockNotes = [{ id: "n1" }] as any;
      mockPrisma.note.findMany.mockResolvedValue(mockNotes);
      const result = await listNotes("m123");
      expect(result).toBe(mockNotes);
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
        where: { matterId: "m123", deletedAt: null },
        orderBy: { occurredAt: "desc" },
        include: { author: { select: { id: true, name: true } } }
      });
    });
  });
});