import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead
} from "@/server/notifications/actions";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

vi.mock("@/lib/prisma");
vi.mock("@/lib/auth/session");

const mockPrisma = vi.mocked(prisma, true);
const mockRequireSession = vi.mocked(requireSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({
    user: { id: "u1", role: "LAWYER", name: "User" }
  } as any);
  mockPrisma.notification = {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  } as any;
});

describe("notifications actions", () => {
  describe("getNotifications", () => {
    it("should list notifications with default limit", async () => {
      const mockNotifs = [{ id: "n1" }] as any;
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifs);

      const result = await getNotifications();

      expect(result).toBe(mockNotifs);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: { createdAt: "desc" },
        take: 30
      });
    });

    it("should filter unread only", async () => {
      await getNotifications({ unreadOnly: true });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "u1", read: false },
        orderBy: { createdAt: "desc" },
        take: 30
      });
    });

    it("should respect custom limit", async () => {
      await getNotifications({ limit: 10 });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: { createdAt: "desc" },
        take: 10
      });
    });
  });

  describe("getUnreadCount", () => {
    it("should return count of unread", async () => {
      mockPrisma.notification.count.mockResolvedValue(5);
      const result = await getUnreadCount();
      expect(result).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: "u1", read: false }
      });
    });
  });

  describe("markNotificationRead", () => {
    it("should mark as read", async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ id: "id1", userId: "u1" } as any);
      mockPrisma.notification.update.mockResolvedValue({ id: "id1", read: true } as any);

      const result = await markNotificationRead("id1");

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: "id1" },
        data: { read: true, readAt: expect.any(Date) }
      });
    });

    it("should throw if notification not found", async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      await expect(markNotificationRead("id1")).rejects.toThrow("通知不存在");
    });

    it("should reject if not owned (same as not found)", async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      await expect(markNotificationRead("id1")).rejects.toThrow("通知不存在");
    });
  });

  describe("markAllNotificationsRead", () => {
    it("should mark all as read", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({} as any);

      const result = await markAllNotificationsRead();

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "u1", read: false },
        data: { read: true, readAt: expect.any(Date) }
      });
    });
  });
});