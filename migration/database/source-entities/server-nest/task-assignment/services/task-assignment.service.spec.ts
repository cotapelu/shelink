import { Test, TestingModule } from "@nestjs/testing";
import { TaskAssignmentService } from "./task-assignment.service";
import {
  TaskAssignment,
  AssignmentStatus,
} from "../entities/task-assignment.entity";
import { Repository } from "typeorm";
// Using any to simplify mocking
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { CreateTaskAssignmentDto } from "../dto/create-task-assignment.dto";
import { UpdateTaskAssignmentDto } from "../dto/update-task-assignment.dto";

const mockTaskAssignment = (overrides: any = {}): any => ({
  id: "assignment-id-1",
  taskId: "task-1",
  assignerId: "user-1",
  assigneeId: "user-2",
  assignedAt: new Date(),
  dueDate: null,
  status: AssignmentStatus.PENDING,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  // Minimal relations (any shape fine for tests)
  task: { id: "task-1" },
  assigner: { id: "user-1" },
  assignee: { id: "user-2" },
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
    getMany: jest.fn(),
    getCount: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
  })),
  count: jest.fn(),
  remove: jest.fn(),
  softRemove: jest.fn(),
  restore: jest.fn(),
});

describe("TaskAssignmentService", () => {
  let service: TaskAssignmentService;
  let repository: jest.Mocked<Repository<any>>;
  let taskAssignmentRepository: jest.Mocked<Repository<any>>;

  beforeEach(async () => {
    repository = mockRepository() as any;
    taskAssignmentRepository = repository;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAssignmentService,
        { provide: "TaskAssignmentRepository", useValue: repository },
      ],
    }).compile();

    service = module.get<TaskAssignmentService>(TaskAssignmentService);
    // Inject mock directly
    (service as any).taskAssignmentRepository = repository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new task assignment", async () => {
      const createDto: CreateTaskAssignmentDto = {
        taskId: "task-1",
        assignerId: "user-1",
        assigneeId: "user-2",
        assignedAt: new Date(),
        dueDate: null,
        status: AssignmentStatus.PENDING,
        notes: null,
      };

      const created = mockTaskAssignment();
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it("should throw BadRequestException if assignment already exists", async () => {
      const createDto: CreateTaskAssignmentDto = {
        taskId: "task-1",
        assignerId: "user-1",
        assigneeId: "user-2",
        assignedAt: new Date(),
        dueDate: null,
        status: AssignmentStatus.PENDING,
        notes: null,
      };

      repository.findOne.mockResolvedValue(mockTaskAssignment()); // existing

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findOne", () => {
    it("should return task assignment by id", async () => {
      const assignment = mockTaskAssignment();
      repository.findOne.mockResolvedValue(assignment);

      const result = await service.findOne("assignment-id-1");

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: "assignment-id-1" },
        relations: ["task", "assigner", "assignee"],
        withDeleted: false,
      });
      expect(result).toBe(assignment);
    });

    it("should throw NotFoundException when assignment not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return all task assignments", async () => {
      const assignments = [mockTaskAssignment(), mockTaskAssignment()];
      repository.find.mockResolvedValue(assignments);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        relations: ["task", "assigner", "assignee"],
        withDeleted: false,
      });
      expect(result).toEqual(assignments);
    });
  });

  describe("findPaged", () => {
    it("should return paginated assignments", async () => {
      const qb = repository.createQueryBuilder();
      qb.where = jest.fn().mockReturnThis();
      qb.orderBy = jest.fn().mockReturnThis();
      qb.skip = jest.fn().mockReturnThis();
      qb.take = jest.fn().mockReturnThis();
      qb.getCount = jest.fn().mockResolvedValue(50);
      const mockData = [mockTaskAssignment()];
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

    it("should include deleted assignments when withDeleted true", async () => {
      const qb = repository.createQueryBuilder();
      qb.where = jest.fn().mockReturnThis();
      qb.orderBy = jest.fn().mockReturnThis();
      qb.skip = jest.fn().mockReturnThis();
      qb.take = jest.fn().mockReturnThis();
      qb.getCount = jest.fn().mockResolvedValue(10);
      qb.getMany = jest.fn().mockResolvedValue([mockTaskAssignment()]);
      qb.withDeleted = jest.fn().mockReturnThis();

      repository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findPaged(1, 10, true);

      expect(qb.withDeleted).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update task assignment", async () => {
      const existing = mockTaskAssignment();
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(existing);

      const updateDto: UpdateTaskAssignmentDto = {
        status: AssignmentStatus.COMPLETED,
      };

      const result = await service.update("assignment-id-1", updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect((result as any).status).toBe(AssignmentStatus.COMPLETED);
    });

    it("should throw NotFoundException if assignment does not exist for update", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update("non-existent", { status: AssignmentStatus.COMPLETED }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should soft remove task assignment", async () => {
      const assignment = mockTaskAssignment();
      repository.findOne.mockResolvedValue(assignment);

      await service.remove("assignment-id-1");

      expect(repository.softRemove).toHaveBeenCalledWith(assignment);
    });

    it("should throw NotFoundException if assignment not found for removal", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("restore", () => {
    it("should restore task assignment", async () => {
      await service.restore("assignment-id-1");
      expect(repository.restore).toHaveBeenCalledWith("assignment-id-1");
    });
  });

  describe("getAssignmentStatistics", () => {
    it("should compute statistics", async () => {
      repository.count.mockResolvedValue(5);
      repository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: AssignmentStatus.PENDING, count: "3" },
          { status: AssignmentStatus.COMPLETED, count: "2" },
        ]),
      } as any);

      const stats = await service.getAssignmentStatistics();

      expect(stats.totalAssignments).toBe(5);
      expect(stats.statusBreakdown).toEqual({
        pending: 3,
        completed: 2,
      });
    });
  });

  describe("getAssignmentsByTaskIds", () => {
    it("should return assignments for given task IDs", async () => {
      const assignments = [
        mockTaskAssignment(),
        mockTaskAssignment({ taskId: "task-2" }),
      ];
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(assignments),
      } as any;
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getAssignmentsByTaskIds([
        "task-1",
        "task-2",
      ]);

      expect(qb.where).toHaveBeenCalledWith(
        "assignment.taskId IN (:...taskIds)",
        { taskIds: ["task-1", "task-2"] },
      );
      expect(result).toEqual(assignments);
    });

    it("should return empty array when no assignments match", async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any;
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getAssignmentsByTaskIds(["nonexistent"]);

      expect(result).toEqual([]);
    });
  });

  describe("getOverdueAssignments", () => {
    it("should return overdue assignments", async () => {
      const now = new Date();
      const overdue = [mockTaskAssignment()];
      const qb = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue(overdue);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getOverdueAssignments();

      expect(qb.where).toHaveBeenCalledWith(
        "assignment.dueDate < :now AND assignment.status != :completed",
        expect.objectContaining({
          completed: "completed",
          now: expect.any(Date),
        }),
      );
      expect(result).toBe(overdue);
    });

    it("should return empty array when no overdue assignments", async () => {
      const qb = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue([]);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getOverdueAssignments();

      expect(result).toEqual([]);
    });
  });

  describe("getUpcomingAssignments", () => {
    it("should return upcoming assignments within days", async () => {
      const now = new Date();
      const future = new Date();
      future.setDate(now.getDate() + 7);

      const upcoming = [mockTaskAssignment()];
      const qb = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.andWhere = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue(upcoming);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getUpcomingAssignments(7);

      expect(qb.where).toHaveBeenCalledWith(
        "assignment.dueDate BETWEEN :now AND :futureDate",
        expect.objectContaining({
          now: expect.any(Date),
          futureDate: expect.any(Date),
        }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        "assignment.status != :completed",
        expect.objectContaining({ completed: "completed" }),
      );
      expect(result).toBe(upcoming);
    });

    it("should return empty array when no upcoming assignments", async () => {
      const qb = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.andWhere = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue([]);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getUpcomingAssignments(7);

      expect(result).toEqual([]);
    });
  });

  describe("getAssignmentsByDateRange", () => {
    it("should return assignments within date range", async () => {
      const start = new Date();
      const end = new Date();
      const qb = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue([mockTaskAssignment()]);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getAssignmentsByDateRange(start, end);

      expect(qb.where).toHaveBeenCalledWith(
        "assignment.assignedAt BETWEEN :startDate AND :endDate",
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it("should return empty array when no assignments in range", async () => {
      const qb = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue([]);
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getAssignmentsByDateRange(
        new Date(),
        new Date(),
      );

      expect(result).toEqual([]);
    });
  });

  // Additional tests for missing default parameter branches
  describe("Default parameter coverage", () => {
    it("should use default findPaged values when called with no arguments", async () => {
      const qb: any = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.orderBy = jest.fn().mockReturnThis();
      qb.skip = jest.fn().mockReturnThis();
      qb.take = jest.fn().mockReturnThis();
      qb.getCount = jest.fn().mockResolvedValue(10);
      const mockAssignment = mockTaskAssignment();
      qb.getMany = jest.fn().mockResolvedValue([mockAssignment]);
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findPaged();

      expect(qb.skip).toHaveBeenCalledWith((1 - 1) * 20);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        data: [mockAssignment],
        total: 10,
        page: 1,
        limit: 20,
      });
    });

    it("should use default days=7 for getUpcomingAssignments when no argument", async () => {
      const qb: any = repository.createQueryBuilder();
      qb.leftJoinAndSelect = jest.fn().mockReturnThis();
      qb.where = jest.fn().mockReturnThis();
      qb.andWhere = jest.fn().mockReturnThis();
      qb.getMany = jest.fn().mockResolvedValue([mockTaskAssignment()]);
      repository.createQueryBuilder.mockReturnValue(qb);

      await service.getUpcomingAssignments();

      // Verify that the BETWEEN query was called
      expect(qb.where).toHaveBeenCalledWith(
        "assignment.dueDate BETWEEN :now AND :futureDate",
        expect.objectContaining({
          now: expect.any(Date),
          futureDate: expect.any(Date),
        }),
      );
      // Ensure futureDate is about 7 days ahead of now
      const [, params] = qb.where.mock.calls[0];
      const now = new Date();
      const diff = params.futureDate.getTime() - params.now.getTime();
      expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
      expect(diff).toBeLessThan(8 * 24 * 60 * 60 * 1000);
    });
  });
});
