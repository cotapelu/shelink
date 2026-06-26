import { Test, TestingModule } from "@nestjs/testing";
import { TaskAssignmentController } from "./task-assignment.controller";
import { TaskAssignmentService } from "../services/task-assignment.service";
import { TaskAssignmentDto } from "../dto/task-assignment.dto";
import { CreateTaskAssignmentDto } from "../dto/create-task-assignment.dto";
import { UpdateTaskAssignmentDto } from "../dto/update-task-assignment.dto";

type MockTaskAssignmentService = Partial<
  Record<keyof TaskAssignmentService, jest.Mock>
>;

const mockTaskAssignmentService = (): MockTaskAssignmentService => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  restore: jest.fn(),
  findByTaskId: jest.fn(),
  findByAssigneeId: jest.fn(),
  findByAssignerId: jest.fn(),
  findByStatus: jest.fn(),
  getOverdueAssignments: jest.fn(),
  getPendingAssignments: jest.fn(),
  getAssignmentsByDateRange: jest.fn(),
  getUpcomingAssignments: jest.fn(),
  getAssignmentStatistics: jest.fn(),
});

describe("TaskAssignmentController", () => {
  let controller: TaskAssignmentController;
  let service: MockTaskAssignmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskAssignmentController],
      providers: [
        {
          provide: TaskAssignmentService,
          useValue: mockTaskAssignmentService(),
        },
      ],
    }).compile();

    controller = module.get<TaskAssignmentController>(TaskAssignmentController);
    service = module.get<MockTaskAssignmentService>(TaskAssignmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a task assignment", async () => {
      const createDto = {
        taskId: "t1",
        assignerId: "u1",
        assigneeId: "u2",
      } as any;
      const saved = { id: "a1", ...createDto } as any;
      service.create!.mockResolvedValue(saved);

      const result = await controller.create(createDto as any);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toBe(saved);
    });
  });

  describe("findOne", () => {
    it("should find an assignment by id", async () => {
      const assignment = { id: "a1" } as any;
      service.findOne!.mockResolvedValue(assignment);

      const result = await controller.findOne("a1");

      expect(service.findOne).toHaveBeenCalledWith("a1", false);
      expect(result).toBe(assignment);
    });
  });

  describe("update", () => {
    it("should update an assignment", async () => {
      const updateDto = { status: "completed" } as any;
      const updated = { id: "a1", ...updateDto } as any;
      service.update!.mockResolvedValue(updated);

      const result = await controller.update("a1", updateDto);

      expect(service.update).toHaveBeenCalledWith("a1", updateDto);
      expect(result).toBe(updated);
    });
  });

  describe("remove", () => {
    it("should remove an assignment", async () => {
      service.remove!.mockResolvedValue({ success: true } as any);

      const result = await controller.remove("a1");

      expect(service.remove).toHaveBeenCalledWith("a1");
      expect(result).toEqual({ success: true });
    });
  });

  describe("restore", () => {
    it("should restore an assignment", async () => {
      service.restore!.mockResolvedValue({ id: "a1", deletedAt: null } as any);

      const result = await controller.restore("a1");

      expect(service.restore).toHaveBeenCalledWith("a1");
      expect(result).not.toBeNull();
    });
  });

  describe("findByTaskId", () => {
    it("should return assignments for a task", async () => {
      const assignments = [{ id: "a1" }, { id: "a2" }] as any;
      service.findByTaskId!.mockResolvedValue(assignments);

      const result = await controller.findByTaskId("task-1");

      expect(service.findByTaskId).toHaveBeenCalledWith("task-1");
      expect(result).toEqual(assignments);
    });
  });

  describe("findByAssigneeId", () => {
    it("should return assignments for an assignee", async () => {
      const assignments = [{ id: "a1" }] as any;
      service.findByAssigneeId!.mockResolvedValue(assignments);

      const result = await controller.findByAssigneeId("user-1");

      expect(service.findByAssigneeId).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(assignments);
    });
  });

  describe("findByAssignerId", () => {
    it("should return assignments for an assigner", async () => {
      const assignments = [{ id: "a1" }] as any;
      service.findByAssignerId!.mockResolvedValue(assignments);

      const result = await controller.findByAssignerId("user-1");

      expect(service.findByAssignerId).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(assignments);
    });
  });

  describe("findByStatus", () => {
    it("should return assignments by status", async () => {
      const assignments = [{ id: "a1", status: "pending" }] as any;
      service.findByStatus!.mockResolvedValue(assignments);

      const result = await controller.findByStatus("pending");

      expect(service.findByStatus).toHaveBeenCalledWith("pending");
      expect(result).toEqual(assignments);
    });
  });

  describe("getOverdueAssignments", () => {
    it("should get overdue assignments", async () => {
      const assignments = [{ id: "a1" }] as any;
      service.getOverdueAssignments!.mockResolvedValue(assignments);

      const result = await controller.getOverdueAssignments();

      expect(service.getOverdueAssignments).toHaveBeenCalled();
      expect(result).toEqual(assignments);
    });
  });

  describe("getPendingAssignments", () => {
    it("should get pending assignments", async () => {
      const assignments = [{ id: "a1" }] as any;
      service.getPendingAssignments!.mockResolvedValue(assignments);

      const result = await controller.getPendingAssignments();

      expect(service.getPendingAssignments).toHaveBeenCalled();
      expect(result).toEqual(assignments);
    });
  });

  describe("getAssignmentsByDateRange", () => {
    it("should get assignments within date range", async () => {
      const start = new Date("2025-01-01");
      const end = new Date("2025-01-31");
      const assignments = [{ id: "a1" }] as any;
      service.getAssignmentsByDateRange!.mockResolvedValue(assignments);

      const result = await controller.getAssignmentsByDateRange(
        start.toISOString(),
        end.toISOString(),
      );

      expect(service.getAssignmentsByDateRange).toHaveBeenCalledWith(
        start,
        end,
      );
      expect(result).toEqual(assignments);
    });
  });

  describe("getUpcomingAssignments", () => {
    it("should get upcoming assignments with default days", async () => {
      const assignments = [{ id: "a1" }] as any;
      service.getUpcomingAssignments!.mockResolvedValue(assignments);

      const result = await controller.getUpcomingAssignments();

      expect(service.getUpcomingAssignments).toHaveBeenCalledWith(7);
      expect(result).toEqual(assignments);
    });

    it("should get upcoming assignments with custom days", async () => {
      const assignments = [{ id: "a1" }] as any;
      service.getUpcomingAssignments!.mockResolvedValue(assignments);

      const result = await controller.getUpcomingAssignments(14);

      expect(service.getUpcomingAssignments).toHaveBeenCalledWith(14);
      expect(result).toEqual(assignments);
    });
  });

  describe("getAssignmentStatistics", () => {
    it("should get assignment statistics", async () => {
      const stats = { total: 10, statusBreakdown: { pending: 5 } } as any;
      service.getAssignmentStatistics!.mockResolvedValue(stats);

      const result = await controller.getAssignmentStatistics();

      expect(service.getAssignmentStatistics).toHaveBeenCalled();
      expect(result).toBe(stats);
    });
  });

  describe("findAll (paged)", () => {
    it("should return paginated assignments with defaults", async () => {
      const response = {
        data: [{ id: "a1" }],
        total: 1,
        page: 1,
        limit: 20,
      } as any;
      service.findPaged!.mockResolvedValue(response);

      const result = await controller.findAll();

      expect(service.findPaged).toHaveBeenCalledWith(1, 20, false);
      expect(result).toBe(response);
    });
  });
});
