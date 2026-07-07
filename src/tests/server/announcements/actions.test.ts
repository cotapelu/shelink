// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listAnnouncements,
  listActiveBanners,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
} from "@/server/announcements/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    announcement: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/server/audit");
vi.mock("next/cache");

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);
const mockAudit = vi.mocked(audit);
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", name: "Admin" } });
});

describe("announcements actions", () => {
  describe("listAnnouncements", () => {
    it("should list all with includeArchived=false default", async () => {
      mockPrisma.announcement.findMany.mockResolvedValue([{ id: "a1" }]);

      const result = await listAnnouncements();
      expect(result).toEqual([{ id: "a1" }]);
      expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith({
        where: { archivedAt: null },
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        include: { author: { select: { id: true, name: true } } },
      });
    });

    it("should include archived when requested", async () => {
      mockPrisma.announcement.findMany.mockResolvedValue([]);
      await listAnnouncements({ includeArchived: true });
      expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it("should throw when unauthorized", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      await expect(listAnnouncements()).rejects.toThrow("Unauthorized");
    });
  });

  describe("listActiveBanners", () => {
    it("should list pinned, unarchived, unexpired banners", async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 86400000);
      mockPrisma.announcement.findMany.mockResolvedValue([{ id: "a1" }]);

      const result = await listActiveBanners();
      expect(result).toEqual([{ id: "a1" }]);
      expect(mockPrisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            pinned: true,
            archivedAt: null,
            OR: [
              { expiresAt: null },
              { expiresAt: expect.objectContaining({ gt: expect.any(Date) }) }
            ],
          },
          select: { id: true, title: true, content: true, publishedAt: true },
        })
      );
    });

    it("should throw when unauthorized", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      await expect(listActiveBanners()).rejects.toThrow("Unauthorized");
    });
  });

  describe("createAnnouncement", () => {
    it("should create announcement with audit", async () => {
      const mockAnn = { id: "a1", title: "Test", pinned: false, authorId: "u1" };
      mockPrisma.announcement.create.mockResolvedValue(mockAnn);

      const result = await createAnnouncement({ title: "Test", content: "Body" });
      expect(result).toEqual(mockAnn);
      expect(mockPrisma.announcement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Test",
          content: "Body",
          pinned: false,
          expiresAt: null,
          authorId: "u1",
        }),
      });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ANNOUNCEMENT_CREATE",
          targetType: "Announcement",
          targetId: "a1",
        })
      );
    });

    it("should throw when unauthorized", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      await expect(createAnnouncement({ title: "T", content: "C" })).rejects.toThrow("Unauthorized");
    });
  });

  describe("updateAnnouncement", () => {
    it("should update announcement", async () => {
      const mockUpdated = { id: "a1", title: "Updated" };
      mockPrisma.announcement.update.mockResolvedValue(mockUpdated);

      const result = await updateAnnouncement({ id: "cl123456789", title: "Updated", content: "New" });
      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.announcement.update).toHaveBeenCalledWith({
        where: { id: "cl123456789" },
        data: { title: "Updated", content: "New", pinned: false, expiresAt: null },
      });
    });

    it("should throw when unauthorized", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      await expect(updateAnnouncement({ id: "a1", title: "T", content: "C" })).rejects.toThrow("Unauthorized");
    });
  });

  describe("archiveAnnouncement", () => {
    it("should archive announcement", async () => {
      mockPrisma.announcement.update.mockResolvedValue({});

      await archiveAnnouncement("a1");
      expect(mockPrisma.announcement.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { archivedAt: expect.any(Date) },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/announcements");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ANNOUNCEMENT_ARCHIVE",
          targetType: "Announcement",
          targetId: "a1",
        })
      );
    });

    it("should throw when unauthorized", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      await expect(archiveAnnouncement("a1")).rejects.toThrow("Unauthorized");
    });
  });
});
