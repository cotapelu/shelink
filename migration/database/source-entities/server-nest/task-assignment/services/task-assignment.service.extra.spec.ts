import { Test, TestingModule } from "@nestjs/testing";
import { TaskAssignmentService } from "./task-assignment.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  TaskAssignment,
  AssignmentStatus,
} from "../entities/task-assignment.entity";
import { NotFoundException } from "@nestjs/common";

// Create simple mock data without strict typing to avoid type errors
const mockAssignment = (overrides = {}): any => ({
  id: "assign-id-1",
  taskId: "task-1",
  assignerId: "user-1",
  assigneeId: "user-2",
  assignedAt: new Date(),
  dueDate: null,
  status: AssignmentStatus.PENDING,
  notes: null,
  task: { id: "task-1" },
  assigner: { id: "user-1" },
  assignee: { id: "user-2" },
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softRemove: jest.fn(),
  restore: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    withDeleted: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
  })),
});

describe("TaskAssignmentService (extra)", () => {
  let service: TaskAssignmentService;
  let repo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAssignmentService,
        { provide: getRepositoryToken(TaskAssignment), useValue: mockRepo() },
      ],
    }).compile();

    service = module.get<TaskAssignmentService>(TaskAssignmentService);
    repo = module.get(getRepositoryToken(TaskAssignment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findByTaskId", () => {
    it("should return assignments for a given task", async () => {
      const assignments = [mockAssignment()];
      repo.find.mockResolvedValue(assignments);

      const result = await service.findByTaskId("task-1");

      expect(repo.find).toHaveBeenCalledWith({
        where: { taskId: "task-1" },
        relations: ["task", "assigner", "assignee"],
      });
      expect(result).toEqual(assignments);
    });
  });

  describe("findByAssigneeId", () => {
    it("should return assignments for a given assignee", async () => {
      const assignments = [mockAssignment()];
      repo.find.mockResolvedValue(assignments);

      const result = await service.findByAssigneeId("user-2");

      expect(repo.find).toHaveBeenCalledWith({
        where: { assigneeId: "user-2" },
        relations: ["task", "assigner", "assignee"],
      });
      expect(result).toEqual(assignments);
    });
  });

  describe("findByAssignerId", () => {
    it("should return assignments for a given assigner", async () => {
      const assignments = [mockAssignment()];
      repo.find.mockResolvedValue(assignments);

      const result = await service.findByAssignerId("user-1");

      expect(repo.find).toHaveBeenCalledWith({
        where: { assignerId: "user-1" },
        relations: ["task", "assigner", "assignee"],
      });
      expect(result).toEqual(assignments);
    });
  });

  describe("findByStatus", () => {
    it("should return assignments with specified status", async () => {
      const assignments = [mockAssignment({ status: "pending" })];
      repo.find.mockResolvedValue(assignments);

      const result = await service.findByStatus("pending");

      expect(repo.find).toHaveBeenCalledWith({
        where: { status: "pending" },
        relations: ["task", "assigner", "assignee"],
      });
      expect(result).toEqual(assignments);
    });
  });

  describe("getOverdueAssignments", () => {
    it("should return assignments that are overdue and not completed", async () => {
      const past = new Date(Date.now() - 86400000); // yesterday
      const overdue = mockAssignment({ dueDate: past, status: "pending" });
      repo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        withDeleted: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([overdue]),
      } as any);

      const result = await service.getOverdueAssignments();

      expect(result).toHaveLength(1);
    });
  });

  describe("getPendingAssignments", () => {
    it("should return only pending assignments", async () => {
      const pending = mockAssignment({ status: "pending" });
      repo.find.mockResolvedValue([pending]);

      const result = await service.getPendingAssignments();

      expect(repo.find).toHaveBeenCalledWith({
        where: { status: "pending" },
        relations: ["task", "assigner", "assignee"],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("getAssignmentsByDateRange", () => {
    it("should return assignments within date range", async () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-31");
      const assignments = [mockAssignment()];
      repo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(assignments),
      } as any);

      const result = await service.getAssignmentsByDateRange(start, end);

      expect(repo.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual(assignments);
    });
  });

  describe("update", () => {
    it("should update an existing assignment", async () => {
      const existing = mockAssignment();
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue({ ...existing, status: "completed" });

      const result = await service.update(existing.id, {
        status: AssignmentStatus.COMPLETED,
      } as any);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: existing.id },
        relations: ["task", "assigner", "assignee"],
        withDeleted: false,
      });
      expect(result.status).toBe("completed");
    });

    it("should throw NotFoundException if assignment does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update("nonexistent", {
          status: AssignmentStatus.COMPLETED,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should soft delete an assignment", async () => {
      const existing = mockAssignment();
      repo.findOne.mockResolvedValue(existing);
      repo.softRemove.mockResolvedValue(existing);

      await service.remove(existing.id);

      expect(repo.softRemove).toHaveBeenCalledWith(existing);
    });
  });

  describe("restore", () => {
    it("should restore a soft-deleted assignment", async () => {
      const id = "restore-id";
      repo.restore.mockResolvedValue(undefined);

      await service.restore(id);

      expect(repo.restore).toHaveBeenCalledWith(id);
    });
  });
});
