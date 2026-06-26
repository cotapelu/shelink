import { Test, TestingModule } from "@nestjs/testing";
import { WorkflowTransitionService } from "./workflow-transition.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  Task,
  TaskStatus,
} from "@modules/task-management/entities/task.entity";
import { WorkflowAudit } from "../entities/workflow-audit.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";

type MockRepository = Partial<Record<keyof Repository<any>, jest.Mock>>;

const mockTask = (overrides: Partial<Task> = {}): Task => {
  return {
    id: "task-1",
    title: "Test Task",
    status: TaskStatus.TODO,
    creatorId: "user-1",
    workflowId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Task;
};

const mockWorkflowAudit = (
  overrides: Partial<WorkflowAudit> = {},
): WorkflowAudit => {
  return {
    id: "audit-1",
    taskId: "task-1",
    workflowId: null,
    fromStatus: TaskStatus.TODO,
    toStatus: TaskStatus.IN_PROGRESS,
    actorId: "user-1",
    notes: null,
    createdAt: new Date(),
    ...overrides,
  } as unknown as WorkflowAudit;
};

const mockRepository = (): MockRepository => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

describe("WorkflowTransitionService", () => {
  let service: WorkflowTransitionService;
  let tasksRepo: MockRepository;
  let auditsRepo: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowTransitionService,
        { provide: getRepositoryToken(Task), useValue: mockRepository() },
        {
          provide: getRepositoryToken(WorkflowAudit),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<WorkflowTransitionService>(WorkflowTransitionService);
    tasksRepo = module.get<MockRepository>(getRepositoryToken(Task));
    auditsRepo = module.get<MockRepository>(getRepositoryToken(WorkflowAudit));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("transition", () => {
    it("should throw NotFoundException when task not found", async () => {
      tasksRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.transition("non-existent", TaskStatus.IN_PROGRESS, "user-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for disallowed transition", async () => {
      const task = mockTask({ status: TaskStatus.COMPLETED });
      tasksRepo.findOne!.mockResolvedValue(task);

      await expect(
        service.transition(task.id, TaskStatus.IN_PROGRESS, "user-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should perform allowed transition", async () => {
      const task = mockTask({ status: TaskStatus.TODO });
      tasksRepo.findOne!.mockResolvedValue(task);
      tasksRepo.save!.mockResolvedValue(task);
      auditsRepo.create!.mockReturnValue({});
      auditsRepo.save!.mockResolvedValue(mockWorkflowAudit());

      const result = await service.transition(
        task.id,
        TaskStatus.IN_PROGRESS,
        "user-1",
        "some notes",
      );

      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
      expect(tasksRepo.save).toHaveBeenCalledWith(task);
      expect(auditsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: task.id,
          fromStatus: TaskStatus.TODO,
          toStatus: TaskStatus.IN_PROGRESS,
          actorId: "user-1",
          notes: "some notes",
        }),
      );
      expect(result).toBe(task);
    });

    it("should create audit without notes when notes omitted", async () => {
      const task = mockTask({ status: TaskStatus.TODO });
      tasksRepo.findOne!.mockResolvedValue(task);
      tasksRepo.save!.mockResolvedValue(task);
      auditsRepo.create!.mockReturnValue({});
      auditsRepo.save!.mockResolvedValue(mockWorkflowAudit());

      await service.transition(task.id, TaskStatus.IN_PROGRESS, "user-1");

      expect(auditsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: task.id,
          fromStatus: TaskStatus.TODO,
          toStatus: TaskStatus.IN_PROGRESS,
          actorId: "user-1",
          notes: null,
        }),
      );
    });

    it("should set audit workflowId from task.workflowId when present", async () => {
      const task = mockTask({ status: TaskStatus.TODO, workflowId: "wf-123" });
      tasksRepo.findOne!.mockResolvedValue(task);
      tasksRepo.save!.mockResolvedValue(task);
      auditsRepo.create!.mockReturnValue({});
      auditsRepo.save!.mockResolvedValue(mockWorkflowAudit());

      await service.transition(task.id, TaskStatus.IN_PROGRESS, "user-1");

      expect(auditsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: task.id,
          workflowId: "wf-123",
          fromStatus: TaskStatus.TODO,
          toStatus: TaskStatus.IN_PROGRESS,
          actorId: "user-1",
          notes: null,
        }),
      );
    });

    it("should allow transition from TODO to CANCELLED", async () => {
      const task = mockTask({ status: TaskStatus.TODO });
      tasksRepo.findOne!.mockResolvedValue(task);
      tasksRepo.save!.mockResolvedValue(task);
      auditsRepo.create!.mockReturnValue({});
      auditsRepo.save!.mockResolvedValue(mockWorkflowAudit());

      await service.transition(task.id, TaskStatus.CANCELLED, "user-1");

      expect(task.status).toBe(TaskStatus.CANCELLED);
    });

    it("should allow transition from IN_PROGRESS to REVIEW", async () => {
      const task = mockTask({ status: TaskStatus.IN_PROGRESS });
      tasksRepo.findOne!.mockResolvedValue(task);
      tasksRepo.save!.mockResolvedValue(task);
      auditsRepo.create!.mockReturnValue({});
      auditsRepo.save!.mockResolvedValue(mockWorkflowAudit());

      await service.transition(task.id, TaskStatus.REVIEW, "user-1");

      expect(task.status).toBe(TaskStatus.REVIEW);
    });

    it("should allow transition from REVIEW to COMPLETED", async () => {
      const task = mockTask({ status: TaskStatus.REVIEW });
      tasksRepo.findOne!.mockResolvedValue(task);
      tasksRepo.save!.mockResolvedValue(task);
      auditsRepo.create!.mockReturnValue({});
      auditsRepo.save!.mockResolvedValue(mockWorkflowAudit());

      await service.transition(task.id, TaskStatus.COMPLETED, "user-1");

      expect(task.status).toBe(TaskStatus.COMPLETED);
    });

    it("should not allow transition from COMPLETED to any state", async () => {
      const task = mockTask({ status: TaskStatus.COMPLETED });
      tasksRepo.findOne!.mockResolvedValue(task);

      await expect(
        service.transition(task.id, TaskStatus.IN_PROGRESS, "user-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should not allow transition from CANCELLED to any state", async () => {
      const task = mockTask({ status: TaskStatus.CANCELLED });
      tasksRepo.findOne!.mockResolvedValue(task);

      await expect(
        service.transition(task.id, TaskStatus.TODO, "user-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
