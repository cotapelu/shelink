import { Test, TestingModule } from "@nestjs/testing";
import { TaskController } from "./task.controller";
import { TaskService } from "../services/task.service";
import { TaskAttachmentService } from "../services/task-attachment.service";
import { Task, TaskStatus, TaskPriority } from "../entities/task.entity";
import { CreateTaskDto } from "../dto/create-task.dto";
import { UpdateTaskDto } from "../dto/update-task.dto";
import { SearchTasksDto } from "../dto/search-tasks.dto";

const mockTask = (overrides: Partial<Task> = {}): Task =>
  ({
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Test Task",
    description: "Test description",
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    creatorId: "user-1",
    workflowId: null,
    creator: {
      id: "user-1",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "MEMBER" as any,
      status: "active" as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as unknown as Task;

const mockTaskService = () => ({
  create: jest.fn(),
  findPaged: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  restore: jest.fn(),
  searchTasks: jest.fn(),
  getTaskStatistics: jest.fn(),
  getTasksByDateRange: jest.fn(),
  getOverdueTasks: jest.fn(),
  getUpcomingTasks: jest.fn(),
  findByStatus: jest.fn(),
  findByCreator: jest.fn(),
  findByPriority: jest.fn(),
});

const mockAttachmentService = () => ({
  listByTask: jest.fn(),
});

describe("TaskController", () => {
  let controller: TaskController;
  let taskService: ReturnType<typeof mockTaskService>;
  let attachmentService: ReturnType<typeof mockAttachmentService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        { provide: TaskService, useValue: mockTaskService() },
        { provide: TaskAttachmentService, useValue: mockAttachmentService() },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    taskService = module.get(TaskService) as any;
    attachmentService = module.get(TaskAttachmentService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a task", async () => {
      const dto: CreateTaskDto = {
        title: "New Task",
        description: "Desc",
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        creatorId: "user-1",
      };
      const saved = mockTask(dto);
      taskService.create.mockResolvedValue(saved);

      const result = await controller.create(dto as any);

      expect(taskService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(saved);
    });
  });

  describe("findOne", () => {
    it("should return a task by id", async () => {
      const task = mockTask();
      taskService.findOne.mockResolvedValue(task);

      const result = await controller.findOne(task.id as any, "false");

      expect(taskService.findOne).toHaveBeenCalledWith(task.id, false);
      expect(result).toBe(task);
    });
  });

  describe("findAll", () => {
    it("should return paginated tasks", async () => {
      const tasks = [mockTask(), mockTask({ id: "2" })];
      taskService.findPaged.mockResolvedValue({
        data: tasks,
        total: 2,
        page: 1,
        limit: 20,
      });

      const result = await controller.findAll();

      expect(taskService.findPaged).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        false,
      );
      expect(result).toEqual({ data: tasks, total: 2, page: 1, limit: 20 });
    });
  });

  describe("update", () => {
    it("should update a task", async () => {
      const task = mockTask();
      taskService.findOne.mockResolvedValue(task);
      taskService.update.mockResolvedValue(task);

      const updateDto: UpdateTaskDto = { title: "Updated" };
      const result = await controller.update(task.id as any, updateDto as any);

      expect(taskService.update).toHaveBeenCalledWith(task.id, updateDto);
      expect(result).toBe(task);
    });
  });

  describe("remove", () => {
    it("should soft delete a task", async () => {
      const task = mockTask();
      taskService.findOne.mockResolvedValue(task);
      taskService.remove.mockResolvedValue(undefined);

      await controller.remove(task.id as any);

      expect(taskService.remove).toHaveBeenCalledWith(task.id);
    });
  });

  describe("restore", () => {
    it("should restore a soft-deleted task", async () => {
      taskService.restore.mockResolvedValue({ restored: true });

      const result = await controller.restore("123");

      expect(taskService.restore).toHaveBeenCalledWith("123");
      expect(result).toEqual({ restored: true });
    });
  });

  describe("searchTasks", () => {
    it("should search tasks by query", async () => {
      const tasks = [mockTask()];
      taskService.searchTasks.mockResolvedValue(tasks);

      const result = await controller.searchTasks({ q: "test" } as any);

      expect(taskService.searchTasks).toHaveBeenCalledWith("test");
      expect(result).toEqual(tasks);
    });
  });

  describe("getTaskStatistics", () => {
    it("should return task statistics", async () => {
      const stats = {
        total: 10,
        byStatus: { todo: 5, inProgress: 3, completed: 2 },
      };
      taskService.getTaskStatistics.mockResolvedValue(stats);

      const result = await controller.getTaskStatistics();

      expect(result).toEqual(stats);
    });
  });

  describe("getTasksByDateRange", () => {
    it("should return tasks in date range", async () => {
      const tasks = [mockTask()];
      taskService.getTasksByDateRange.mockResolvedValue(tasks);

      const result = await controller.getTasksByDateRange(
        "2024-01-01",
        "2024-12-31",
      );

      expect(taskService.getTasksByDateRange).toHaveBeenCalledWith(
        new Date("2024-01-01"),
        new Date("2024-12-31"),
      );
      expect(result).toEqual(tasks);
    });
  });

  describe("getOverdueTasks", () => {
    it("should return overdue tasks", async () => {
      const tasks = [mockTask()];
      taskService.getOverdueTasks.mockResolvedValue(tasks);

      const result = await controller.getOverdueTasks();

      expect(taskService.getOverdueTasks).toHaveBeenCalled();
      expect(result).toEqual(tasks);
    });
  });

  describe("getUpcomingTasks", () => {
    it("should return upcoming tasks with default days", async () => {
      const tasks = [mockTask()];
      taskService.getUpcomingTasks.mockResolvedValue(tasks);

      const result = await controller.getUpcomingTasks();

      expect(taskService.getUpcomingTasks).toHaveBeenCalledWith(7);
      expect(result).toEqual(tasks);
    });

    it("should return upcoming tasks with custom days", async () => {
      const tasks = [mockTask()];
      taskService.getUpcomingTasks.mockResolvedValue(tasks);

      const result = await controller.getUpcomingTasks(30);

      expect(taskService.getUpcomingTasks).toHaveBeenCalledWith(30);
      expect(result).toEqual(tasks);
    });
  });

  describe("findByStatus", () => {
    it("should return tasks by status", async () => {
      const tasks = [mockTask({ status: TaskStatus.TODO })];
      taskService.findByStatus.mockResolvedValue(tasks);

      const result = await controller.findByStatus("todo");

      expect(taskService.findByStatus).toHaveBeenCalledWith("todo");
      expect(result).toEqual(tasks);
    });
  });

  describe("findByCreator", () => {
    it("should return tasks by creator", async () => {
      const tasks = [mockTask()];
      taskService.findByCreator.mockResolvedValue(tasks);

      const result = await controller.findByCreator("user-1");

      expect(taskService.findByCreator).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(tasks);
    });
  });

  describe("findByPriority", () => {
    it("should return tasks by priority", async () => {
      const tasks = [mockTask({ priority: TaskPriority.HIGH })];
      taskService.findByPriority.mockResolvedValue(tasks);

      const result = await controller.findByPriority("high");

      expect(taskService.findByPriority).toHaveBeenCalledWith("high");
      expect(result).toEqual(tasks);
    });
  });

  describe("listAttachments", () => {
    it("should list attachments for a task", async () => {
      const attachments = [{ id: "1", filename: "test.pdf" }];
      attachmentService.listByTask.mockResolvedValue(attachments);

      const result = await controller.listAttachments("task-id");

      expect(attachmentService.listByTask).toHaveBeenCalledWith("task-id");
      expect(result).toEqual(attachments);
    });
  });
});
