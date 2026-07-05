import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listAnnouncements,
  listActiveBanners,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement
} from "@/server/announcements/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

vi.mock("@/lib/prisma");
vi.mock("@/lib/auth/session");
vi.mock("@/server/audit");
vi.mock("next/cache");

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  // Default session: regular user for read, admin for write (set per test)
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", name: "User", role: "LAWYER" }
  } as any);
  mockPrisma.announcement = {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn()
  } as any;
});

describe("announcements actions", () => {
  describe("listAnnouncements", () => {
    it("should list all including archived when requested", async () => {
      const mockList = [{ id: "a1" }] as any;
      mockPrisma.announcement.findMany.mockResolvedValue(mockList);

      const result = await listAnnouncements({ includeArchived: true });

      expect(result).toEqual(mockList);
      expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        include: { author: { select: { id: true, name: true } } }
      });
    });

    it("should list only non-archived by default", async () => {
      const mockList = [{ id: "a2" }] as any;
      mockPrisma.announcement.findMany.mockResolvedValue(mockList);

      await listAnnouncements();

      expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith({
        where: { archivedAt: null },
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        include: { author: { select: { id: true, name: true } } }
      });
    });
  });

  describe("listActiveBanners", () => {
    it("should list pinned, unarchived, non-expired banners", async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 86400000);
      const mockList = [
        { id: "b1", pinned: true, expiresAt: null },
        { id: "b2", pinned: true, expiresAt: future }
      ] as any;
      mockPrisma.announcement.findMany.mockResolvedValue(mockList);

      const result = await listActiveBanners();

      expect(result).toEqual(mockList);
      expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith({
        where: {
          pinned: true,
          archivedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
        },
        orderBy: { publishedAt: "desc" },
        select: { id: true, title: true, content: true, publishedAt: true }
      });
    });
  });

  describe("createAnnouncement", () => {
    const validInput = {
      title: "Test Announcement",
      content: "This is a test",
      pinned: false,
      expiresAt: null
    };

    it("should create announcement as ADMIN", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin1", role: "ADMIN", name: "Admin" }
      } as any);
      mockPrisma.announcement.create.mockResolvedValue({
        id: "new1",
        ...validInput,
        authorId: "admin1"
      } as any);

      const result = await createAnnouncement(validInput);

      expect(result).toHaveProperty("id", "new1");
      expect(mockPrisma.announcement.create).toHaveBeenCalledWith({
        data: {
          title: "Test Announcement",
          content: "This is a test",
          pinned: false,
          expiresAt: null,
          authorId: "admin1"
        }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ANNOUNCEMENT_CREATE",
          targetType: "Announcement",
          detail: { title: "Test Announcement", pinned: false }
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/announcements");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("should reject non-ADMIN/PRINCIPAL_LAWYER", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u2", role: "LAWYER", name: "Lawyer" }
      } as any);

      await expect(createAnnouncement(validInput)).rejects.toThrow(
        "仅管理员 / 主任律师可发布公告"
      );
    });

    it("should validate required fields", async () => {
      // empty title - need ADMIN to pass role check
      mockRequireSession.mockResolvedValue({
        user: { id: "admin4", role: "ADMIN", name: "Admin" }
      } as any);
      await expect(
        createAnnouncement({ ...validInput, title: "" } as any)
      ).rejects.toThrow("标题必填");
    });
  });

  describe("updateAnnouncement", () => {
    const updateInput = {
      id: "a123",
      title: "Updated Title",
      content: "Updated content",
      pinned: true,
      expiresAt: new Date()
    };

    it("should update as ADMIN", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin2", role: "ADMIN", name: "Admin" }
      } as any);
      const validId = "cjs4omfcw0000ml5tyivrzcse"; // valid cuid pattern
      const input = { ...updateInput, id: validId } as any;
      mockPrisma.announcement.update.mockResolvedValue({
        id: validId,
        title: input.title,
        content: input.content,
        pinned: input.pinned,
        expiresAt: input.expiresAt
      } as any);

      const result = await updateAnnouncement(input);

      expect(result.title).toBe("Updated Title");
      expect(mockPrisma.announcement.update).toHaveBeenCalledWith({
        where: { id: validId },
        data: {
          title: "Updated Title",
          content: "Updated content",
          pinned: true,
          expiresAt: input.expiresAt
        }
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/announcements");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("should reject unauthorized role", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u3", role: "ASSISTANT", name: "Assist" }
      } as any);

      await expect(updateAnnouncement(updateInput as any)).rejects.toThrow(
        "仅管理员 / 主任律师可发布公告"
      );
    });
  });

  describe("archiveAnnouncement", () => {
    it("should archive announcement as ADMIN", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "admin3", role: "ADMIN", name: "Admin" }
      } as any);
      mockPrisma.announcement.update.mockResolvedValue({} as any);

      await archiveAnnouncement("a999");

      expect(mockPrisma.announcement.update).toHaveBeenCalledWith({
        where: { id: "a999" },
        data: { archivedAt: expect.any(Date) }
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ANNOUNCEMENT_ARCHIVE",
          targetType: "Announcement",
          targetId: "a999"
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/announcements");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("should reject non-privileged role", async () => {
      mockRequireSession.mockResolvedValue({
        user: { id: "u4", role: "LAWYER", name: "Lawyer" }
      } as any);

      await expect(archiveAnnouncement("a888")).rejects.toThrow(
        "仅管理员 / 主任律师可发布公告"
      );
    });
  });
});