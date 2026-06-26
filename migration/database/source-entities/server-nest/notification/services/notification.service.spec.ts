import { Test, TestingModule } from "@nestjs/testing";
import { NotificationService } from "./notification.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  Notification,
  NotificationStatus,
} from "../entities/notification.entity";
import { Repository } from "typeorm";

type MockRepository = Partial<
  Record<keyof Repository<Notification>, jest.Mock>
>;

const mockNotification = (
  overrides: Partial<Notification> = {},
): Notification =>
  ({
    id: "123e4567-e89b-12d3-a456-426614174000",
    userId: "user-1",
    payload: { type: "info" },
    status: NotificationStatus.UNREAD,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as unknown as Notification;

const mockRepository = (): MockRepository => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
});

describe("NotificationService", () => {
  let service: NotificationService;
  let repo: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    repo = module.get<MockRepository>(getRepositoryToken(Notification));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a notification", async () => {
      const createDto = { userId: "user-1", type: "info", payload: {} };
      const saved = mockNotification();
      repo.create!.mockReturnValue({ ...createDto });
      repo.save!.mockResolvedValue(saved);

      const result = await service.create("user-1", "info", {});

      expect(repo.create).toHaveBeenCalledWith({
        userId: "user-1",
        payload: { type: "info" },
      });
      expect(result).toEqual(saved);
    });
  });

  describe("list", () => {
    it("should list notifications by user", async () => {
      const notifications = [mockNotification()];
      repo.find!.mockResolvedValue(notifications);

      const result = await service.list("user-1");

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(notifications);
    });

    it("should filter by status", async () => {
      const notifications = [mockNotification()];
      repo.find!.mockResolvedValue(notifications);

      await service.list("user-1", NotificationStatus.READ);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: "user-1", status: NotificationStatus.READ },
        order: { createdAt: "DESC" },
      });
    });
  });

  describe("markRead", () => {
    it("should mark notification as read", async () => {
      repo.update!.mockResolvedValue({ affected: 1 } as any);

      await service.markRead("notif-1");

      expect(repo.update).toHaveBeenCalledWith(
        { id: "notif-1" },
        { status: NotificationStatus.READ },
      );
    });
  });

  describe("markAllRead", () => {
    it("should mark all unread as read", async () => {
      repo.update!.mockResolvedValue({ affected: 2 } as any);

      await service.markAllRead("user-1");

      expect(repo.update).toHaveBeenCalledWith(
        { userId: "user-1", status: NotificationStatus.UNREAD },
        { status: NotificationStatus.READ },
      );
    });
  });
});
