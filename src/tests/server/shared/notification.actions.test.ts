// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
} from "@/server/shared/notification.actions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("next/cache");

const mockPrisma = vi.mocked(prisma, true);
const mockGetServerSession = getServerSession as any;
const mockRevalidatePath = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "LAWYER", name: "Test" } });
});

describe("notification actions", () => {
  describe("listNotifications", () => {
    it("should list notifications for current user", async () => {
      const mockNotifications = [{ id: "n1", read: false, user: { id: "u1" } }];
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await listNotifications();
      expect(result).toEqual(mockNotifications);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, name: true } } },
      });
    });

    it("should list notifications for specified user when admin", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
      const mockNotifications = [{ id: "n2" }];
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      await listNotifications("u2");
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u2" },
        })
      );
    });

    it("should filter unread only", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      await listNotifications(undefined, { unreadOnly: true });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1", read: false },
        })
      );
    });

    it("should apply custom limit", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      await listNotifications(undefined, { limit: 10 });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(listNotifications()).rejects.toThrow("Unauthorized");
    });
  });

  describe("getUnreadNotificationCount", () => {
    it("should return count of unread notifications for current user", async () => {
      mockPrisma.notification.count.mockResolvedValue(5);
      const result = await getUnreadNotificationCount();
      expect(result).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: "u1", read: false },
      });
    });

    it("should count for specified user when admin", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
      mockPrisma.notification.count.mockResolvedValue(3);
      await getUnreadNotificationCount("u2");
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: "u2", read: false },
      });
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(getUnreadNotificationCount()).rejects.toThrow("Unauthorized");
    });
  });

  describe("markNotificationRead", () => {
    it("should mark notification as read", async () => {
      const mockUpdated = { id: "n1", read: true };
      mockPrisma.notification.update.mockResolvedValue(mockUpdated);
      const result = await markNotificationRead("n1");
      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: "n1" },
        data: { read: true },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(markNotificationRead("n1")).rejects.toThrow("Unauthorized");
    });
  });

  describe("markAllNotificationsRead", () => {
    it("should mark all as read for current user", async () => {
      mockPrisma.notification.update.mockResolvedValue({});

      await markAllNotificationsRead();

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "u1", read: false },
        data: { read: true },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("should mark all for specified user when admin", async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
      mockPrisma.notification.update.mockResolvedValue({});

      await markAllNotificationsRead("u2");

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "u2", read: false },
        data: { read: true },
      });
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(markAllNotificationsRead()).rejects.toThrow("Unauthorized");
    });
  });

  describe("createNotification", () => {
    it("should create notification with required fields", async () => {
      const mockCreated = { id: "n1", userId: "u2", type: "ALERT", title: "Test", message: null, metadata: null, read: false };
      mockPrisma.notification.create.mockResolvedValue(mockCreated);

      const result = await createNotification({ userId: "u2", type: "ALERT", title: "Test" });
      expect(result).toEqual(mockCreated);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "u2",
          type: "ALERT",
          title: "Test",
          message: null,
          metadata: null,
          read: false,
        } as any,
      });
    });

    it("should create notification with optional message and metadata", async () => {
      const mockCreated = { id: "n2", userId: "u3", type: "INFO", title: "Info", message: "Details", metadata: { key: "value" }, read: false };
      mockPrisma.notification.create.mockResolvedValue(mockCreated);

      const result = await createNotification({ userId: "u3", type: "INFO", title: "Info", message: "Details", metadata: { key: "value" } });
      expect(result).toEqual(mockCreated);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "u3",
          type: "INFO",
          title: "Info",
          message: "Details",
          metadata: { key: "value" },
          read: false,
        } as any,
      });
    });

    it("should throw when unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);
      await expect(createNotification({ userId: "u2", type: "ALERT", title: "Test" })).rejects.toThrow("Unauthorized");
    });
  });
});
