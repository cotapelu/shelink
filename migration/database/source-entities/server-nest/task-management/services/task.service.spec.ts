import { Test, TestingModule } from "@nestjs/testing";
import { TaskService } from "./task.service";
import { Task, TaskStatus, TaskPriority } from "../entities/task.entity";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { CreateTaskDto } from "../dto/create-task.dto";
import { UpdateTaskDto } from "../dto/update-task.dto";

const mockTask = (overrides: Partial<Task> = {}): any => ({
  id: "task-id-1",
  title: "Test Task",
  description: "Description",
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  creatorId: "user-1",
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

const mockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
  })),
  count: jest.fn(),
  remove: jest.fn(),
  softRemove: jest.fn(),
  restore: jest.fn(),
});

describe("TaskService", () => {
  let service: TaskService;
  let repository: jest.Mocked<Repository<Task>>;

  beforeEach(async () => {
    repository = mockRepository() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: "TaskRepository", useValue: repository },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    (service as any).taskRepository = repository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a task", async () => {
      const createDto: CreateTaskDto = {
        title: "New Task",
        description: "Desc",
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        creatorId: "user-1",
      };
      const created = mockTask();
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });
  });

  describe("findOne", () => {
    it("should return task by id", async () => {
      const task = mockTask();
      repository.findOne.mockResolvedValue(task);

      const result = await service.findOne("task-id-1");

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: "task-id-1" },
        relations: ["creator"],
        withDeleted: false,
      });
      expect(result).toBe(task);
    });

    it("should return task including deleted when withDeleted true", async () => {
      const task = mockTask();
      repository.findOne.mockResolvedValue(task);

      const result = await service.findOne(task.id, true);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: task.id },
        relations: ["creator"],
        withDeleted: true,
      });
      expect(result).toBe(task);
    });

    it("should throw NotFoundException when task not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return all tasks", async () => {
      const tasks = [mockTask(), mockTask()];
      repository.find.mockResolvedValue(tasks);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        relations: ["creator"],
        withDeleted: false,
      });
      expect(result).toEqual(tasks);
    });

    it("should return all tasks including deleted when withDeleted true", async () => {
      const tasks = [mockTask(), mockTask()];
      repository.find.mockResolvedValue(tasks);

      const result = await service.findAll(true);

      expect(repository.find).toHaveBeenCalledWith({
        relations: ["creator"],
        withDeleted: true,
      });
      expect(result).toEqual(tasks);
    });
  });

  describe("findPaged", () => {
    it("should return paginated tasks without search", async () => {
      const qb = repository.createQueryBuilder();
      qb.where = jest.fn().mockReturnThis();
      qb.orderBy = jest.fn().mockReturnThis();
      qb.skip = jest.fn().mockReturnThis();
      qb.take = jest.fn().mockReturnThis();
      qb.getCount = jest.fn().mockResolvedValue(50);
      const mockData = [mockTask()];
      qb.getMany = jest.fn().mockResolvedValue(mockData);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findPaged(1, 10);

      expect(result).toEqual({
        data: mockData,
        total: 50,
        page: 1,
        limit: 10,
      });
    });

    it("should include deleted tasks when withDeleted true", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
        getMany: jest.fn().mockResolvedValue([mockTask()]),
        withDeleted: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findPaged(1, 10, undefined, true);

      expect(qb.withDeleted).toHaveBeenCalled();
    });

    it("should apply search filter for SQLite", async () => {
      const qb = repository.createQueryBuilder();
      qb.where = jest.fn().mockReturnThis();
      qb.orderBy = jest.fn().mockReturnThis();
      qb.skip = jest.fn().mockReturnThis();
      qb.take = jest.fn().mockReturnThis();
      qb.getCount = jest.fn().mockResolvedValue(1);
      qb.getMany = jest.fn().mockResolvedValue([mockTask()]);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      // Force SQLite path
      process.env.DB_TYPE = "sqlite";

      await service.findPaged(1, 10, "query");

      expect(qb.where).toHaveBeenCalledWith(expect.any(String), {
        q: "%query%",
      });
    });

    it("should apply search filter for PostgreSQL", async () => {
      const qb = repository.createQueryBuilder();
      qb.where = jest.fn().mockReturnThis();
      qb.orderBy = jest.fn().mockReturnThis();
      qb.skip = jest.fn().mockReturnThis();
      qb.take = jest.fn().mockReturnThis();
      qb.getCount = jest.fn().mockResolvedValue(1);
      qb.getMany = jest.fn().mockResolvedValue([mockTask()]);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      // Not SQLite
      process.env.DB_TYPE = "postgres";

      await service.findPaged(1, 10, "query");

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining("task.title ILIKE :q"),
        { q: "%query%" },
      );
    });
  });

  describe("update", () => {
    it("should update task", async () => {
      const existing = mockTask();
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(existing);

      const updateDto: UpdateTaskDto = { title: "Updated Title" };
      const result = await service.update("task-id-1", updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect((result as any).title).toBe("Updated Title");
    });

    it("should throw NotFoundException if task does not exist", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update("non-existent", { title: "X" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should soft delete task", async () => {
      const task = mockTask();
      repository.findOne.mockResolvedValue(task);

      await service.remove("task-id-1");

      expect(repository.softRemove).toHaveBeenCalledWith(task);
    });

    it("should throw NotFoundException if task not found for deletion", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("restore", () => {
    it("should restore task", async () => {
      await service.restore("task-id-1");
      expect(repository.restore).toHaveBeenCalledWith("task-id-1");
    });
  });

  describe("findByStatus", () => {
    it("should return tasks with given status", async () => {
      const tasks = [mockTask()];
      repository.find.mockResolvedValue(tasks);

      const result = await service.findByStatus(TaskStatus.TODO);

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: TaskStatus.TODO },
        relations: ["creator"],
      });
      expect(result).toBe(tasks);
    });
  });

  describe("findByCreator", () => {
    it("should return tasks for creator", async () => {
      const tasks = [mockTask()];
      repository.find.mockResolvedValue(tasks);

      const result = await service.findByCreator("user-1");

      expect(repository.find).toHaveBeenCalledWith({
        where: { creatorId: "user-1" },
        relations: ["creator"],
      });
      expect(result).toBe(tasks);
    });
  });

  describe("findByPriority", () => {
    it("should return tasks with given priority", async () => {
      const tasks = [mockTask()];
      repository.find.mockResolvedValue(tasks);

      const result = await service.findByPriority(TaskPriority.HIGH);

      expect(repository.find).toHaveBeenCalledWith({
        where: { priority: TaskPriority.HIGH },
        relations: ["creator"],
      });
      expect(result).toBe(tasks);
    });
  });

  describe("searchTasks", () => {
    it("should return empty array for empty query", async () => {
      const result = await service.searchTasks("");
      expect(result).toEqual([]);
    });

    it("should search using SQLite when DB_TYPE=sqlite", async () => {
      const qb = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue([mockTask()]);
      repository.createQueryBuilder.mockReturnValue(qb as any);
      process.env.DB_TYPE = "sqlite";

      await service.searchTasks("test");

      expect(qb.where).toHaveBeenCalledWith(expect.any(String), {
        query: "%test%",
      });
    });

    it("should search using ILIKE for PostgreSQL", async () => {
      const qb = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue([mockTask()]);
      repository.createQueryBuilder.mockReturnValue(qb as any);
      process.env.DB_TYPE = "postgres";

      await service.searchTasks("test");

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining("task.title ILIKE :query"),
        { query: "%test%" },
      );
    });
  });

  describe("getTaskStatistics", () => {
    it("should compute statistics", async () => {
      repository.count.mockResolvedValue(10);
      repository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: TaskStatus.TODO, count: "5" },
          { status: TaskStatus.COMPLETED, count: "5" },
        ]),
      } as any);

      const stats = await service.getTaskStatistics();

      expect(stats.totalTasks).toBe(10);
      expect(stats.statusBreakdown).toEqual({
        todo: 5,
        completed: 5,
      });
    });
  });

  describe("getTasksByDateRange", () => {
    it("should return tasks in date range", async () => {
      const start = new Date();
      const end = new Date();
      const qb = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue([mockTask()]);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getTasksByDateRange(start, end);

      expect(qb.where).toHaveBeenCalledWith(
        "task.createdAt BETWEEN :startDate AND :endDate",
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("getOverdueTasks", () => {
    it("should return overdue tasks", async () => {
      const now = new Date();
      const qb = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue([mockTask()]);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getOverdueTasks();

      expect(qb.where).toHaveBeenCalledWith(
        "task.dueDate < :now AND task.status != :completed",
        expect.objectContaining({
          now: expect.any(Date),
          completed: "completed",
        }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
