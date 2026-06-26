import { Test, TestingModule } from "@nestjs/testing";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "../services/notification.service";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { Permissions } from "@auth/decorators/permissions.decorator";

const mockNotificationService = () => ({
  list: jest.fn(),
  markAllRead: jest.fn(),
  markRead: jest.fn(),
});

describe("NotificationController", () => {
  let controller: NotificationController;
  let service: ReturnType<typeof mockNotificationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService() },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideProvider(Permissions)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get(NotificationService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("list", () => {
    it("should call service.list with userId", async () => {
      const userId = "user-uuid";
      const mockNotifications = [
        {
          id: "n1",
          userId,
          message: "Test",
          read: false,
          createdAt: new Date(),
        },
      ];
      service.list.mockResolvedValue(mockNotifications);

      const result = await controller.list(userId);

      expect(service.list).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockNotifications);
    });

    it("should handle empty list", async () => {
      service.list.mockResolvedValue([]);

      const result = await controller.list("user-uuid");

      expect(result).toEqual([]);
    });

    it("should propagate service errors", async () => {
      service.list.mockRejectedValue(new Error("Database error"));

      await expect(controller.list("user-uuid")).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("markAllRead", () => {
    it("should call service.markAllRead and return ok", async () => {
      const userId = "user-uuid";
      service.markAllRead.mockResolvedValue({ modifiedCount: 3 } as any);

      const result = await controller.markAllRead(userId);

      expect(service.markAllRead).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ ok: true });
    });

    it("should handle service errors", async () => {
      service.markAllRead.mockRejectedValue(new Error("Failed"));

      await expect(controller.markAllRead("user-uuid")).rejects.toThrow(
        "Failed",
      );
    });
  });

  describe("markRead", () => {
    it("should call service.markRead with id and return ok", async () => {
      const id = "notif-uuid";
      service.markRead.mockResolvedValue({ modified: 1 } as any);

      const result = await controller.markRead(id);

      expect(service.markRead).toHaveBeenCalledWith(id);
      expect(result).toEqual({ ok: true });
    });

    it("should handle not found", async () => {
      service.markRead.mockRejectedValue(new Error("Not found"));

      await expect(controller.markRead("invalid")).rejects.toThrow("Not found");
    });
  });
});
