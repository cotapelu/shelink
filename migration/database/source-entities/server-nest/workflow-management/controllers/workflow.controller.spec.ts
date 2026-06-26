import { Test, TestingModule } from "@nestjs/testing";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "../services/workflow.service";
import { Workflow, WorkflowStatus } from "../entities/workflow.entity";
import { CreateWorkflowDto } from "../dto/create-workflow.dto";
import { UpdateWorkflowDto } from "../dto/update-workflow.dto";
import { WorkflowStepDto } from "../dto/workflow-step.dto";

const mockWorkflow = (overrides: Partial<Workflow> = {}): Workflow =>
  ({
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test Workflow",
    description: null,
    status: WorkflowStatus.ACTIVE,
    category: null,
    steps: [],
    ownerId: "user-1",
    owner: {
      id: "user-1",
      email: "owner@example.com",
      firstName: "Owner",
      lastName: "User",
      role: "MEMBER" as any,
      status: "active" as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as any,
    tasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as unknown as Workflow;

const mockWorkflowService = () => ({
  create: jest.fn(),
  findPaged: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  restore: jest.fn(),
  searchWorkflows: jest.fn(),
  getWorkflowStatistics: jest.fn(),
  getWorkflowsByDateRange: jest.fn(),
  getActiveWorkflows: jest.fn(),
  getArchivedWorkflows: jest.fn(),
  getWorkflowsWithTaskCount: jest.fn(),
  findByOwnerId: jest.fn(),
  findByStatus: jest.fn(),
  findByCategory: jest.fn(),
  getWorkflowSteps: jest.fn(),
  addWorkflowStep: jest.fn(),
  updateWorkflowStep: jest.fn(),
  removeWorkflowStep: jest.fn(),
});

describe("WorkflowController", () => {
  let controller: WorkflowController;
  let service: ReturnType<typeof mockWorkflowService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [
        { provide: WorkflowService, useValue: mockWorkflowService() },
      ],
    }).compile();

    controller = module.get<WorkflowController>(WorkflowController);
    service = module.get(WorkflowService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a workflow", async () => {
      const dto: CreateWorkflowDto = {
        name: "New Workflow",
        ownerId: "user-1",
        steps: [{ id: "s1", name: "Step 1", order: 1 }],
      };
      const saved = mockWorkflow(dto);
      service.create.mockResolvedValue(saved);

      const result = await controller.create(dto as any);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(saved);
    });
  });

  describe("findOne", () => {
    it("should return a workflow by id", async () => {
      const workflow = mockWorkflow();
      service.findOne.mockResolvedValue(workflow);

      const result = await controller.findOne(workflow.id as any, "false");

      expect(service.findOne).toHaveBeenCalledWith(workflow.id, false);
      expect(result).toBe(workflow);
    });
  });

  describe("findAll", () => {
    it("should return paginated workflows", async () => {
      const workflows = [mockWorkflow(), mockWorkflow({ id: "2" })];
      service.findPaged.mockResolvedValue({
        data: workflows,
        total: 2,
        page: 1,
        limit: 20,
      });

      const result = await controller.findAll();

      expect(service.findPaged).toHaveBeenCalledWith(1, 20, false);
      expect(result).toEqual({ data: workflows, total: 2, page: 1, limit: 20 });
    });
  });

  describe("update", () => {
    it("should update a workflow", async () => {
      const workflow = mockWorkflow();
      service.findOne.mockResolvedValue(workflow);
      service.update.mockResolvedValue(workflow);

      const updateDto: UpdateWorkflowDto = { name: "Updated" };
      const result = await controller.update(
        workflow.id as any,
        updateDto as any,
      );

      expect(service.update).toHaveBeenCalledWith(workflow.id, updateDto);
      expect(result).toBe(workflow);
    });
  });

  describe("remove", () => {
    it("should soft delete a workflow", async () => {
      const workflow = mockWorkflow();
      service.findOne.mockResolvedValue(workflow);
      service.remove.mockResolvedValue(undefined);

      await controller.remove(workflow.id as any);

      expect(service.remove).toHaveBeenCalledWith(workflow.id);
    });
  });

  describe("restore", () => {
    it("should restore a workflow", async () => {
      service.restore.mockResolvedValue({ restored: true });

      const result = await controller.restore("123");

      expect(service.restore).toHaveBeenCalledWith("123");
      expect(result).toEqual({ restored: true });
    });
  });

  describe("searchWorkflows", () => {
    it("should search workflows by query", async () => {
      const workflows = [mockWorkflow()];
      service.searchWorkflows.mockResolvedValue(workflows);

      const result = await controller.searchWorkflows("test");

      expect(service.searchWorkflows).toHaveBeenCalledWith("test");
      expect(result).toEqual(workflows);
    });
  });

  describe("getWorkflowStatistics", () => {
    it("should return workflow statistics", async () => {
      const stats = {
        totalWorkflows: 5,
        statusBreakdown: { active: 3, archived: 2 },
      };
      service.getWorkflowStatistics.mockResolvedValue(stats);

      const result = await controller.getWorkflowStatistics();

      expect(result).toEqual(stats);
    });
  });

  describe("getWorkflowsByDateRange", () => {
    it("should return workflows in date range", async () => {
      const workflows = [mockWorkflow()];
      service.getWorkflowsByDateRange.mockResolvedValue(workflows);

      const result = await controller.getWorkflowsByDateRange(
        "2024-01-01",
        "2024-12-31",
      );

      expect(service.getWorkflowsByDateRange).toHaveBeenCalledWith(
        new Date("2024-01-01"),
        new Date("2024-12-31"),
      );
      expect(result).toEqual(workflows);
    });
  });

  describe("getActiveWorkflows", () => {
    it("should return active workflows", async () => {
      const workflows = [mockWorkflow({ status: WorkflowStatus.ACTIVE })];
      service.getActiveWorkflows.mockResolvedValue(workflows);

      const result = await controller.getActiveWorkflows();

      expect(service.getActiveWorkflows).toHaveBeenCalled();
      expect(result).toEqual(workflows);
    });
  });

  describe("getArchivedWorkflows", () => {
    it("should return archived workflows", async () => {
      const workflows = [mockWorkflow({ status: WorkflowStatus.ARCHIVED })];
      service.getArchivedWorkflows.mockResolvedValue(workflows);

      const result = await controller.getArchivedWorkflows();

      expect(service.getArchivedWorkflows).toHaveBeenCalled();
      expect(result).toEqual(workflows);
    });
  });

  describe("findByOwnerId", () => {
    it("should return workflows by owner", async () => {
      const workflows = [mockWorkflow()];
      service.findByOwnerId.mockResolvedValue(workflows);

      const result = await controller.findByOwnerId("user-1");

      expect(service.findByOwnerId).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(workflows);
    });
  });

  describe("findByStatus", () => {
    it("should return workflows by status", async () => {
      const workflows = [mockWorkflow()];
      service.findByStatus.mockResolvedValue(workflows);

      const result = await controller.findByStatus("active");

      expect(service.findByStatus).toHaveBeenCalledWith("active");
      expect(result).toEqual(workflows);
    });
  });

  describe("findByCategory", () => {
    it("should return workflows by category", async () => {
      const workflows = [mockWorkflow()];
      service.findByCategory.mockResolvedValue(workflows);

      const result = await controller.findByCategory("marketing");

      expect(service.findByCategory).toHaveBeenCalledWith("marketing");
      expect(result).toEqual(workflows);
    });
  });

  describe("getWorkflowSteps", () => {
    it("should return workflow steps", async () => {
      const steps = [{ id: "s1", name: "Step 1", order: 1 }];
      service.getWorkflowSteps.mockResolvedValue(steps);

      const result = await controller.getWorkflowSteps("wf-id");

      expect(service.getWorkflowSteps).toHaveBeenCalledWith("wf-id");
      expect(result).toEqual(steps);
    });
  });

  describe("addWorkflowStep", () => {
    it("should add a step to workflow", async () => {
      const workflow = mockWorkflow();
      service.addWorkflowStep.mockResolvedValue(workflow);
      const step: WorkflowStepDto = { id: "s2", name: "Step 2", order: 2 };

      const result = await controller.addWorkflowStep("wf-id", step);

      expect(service.addWorkflowStep).toHaveBeenCalledWith("wf-id", step);
      expect(result).toBe(workflow);
    });
  });

  describe("updateWorkflowStep", () => {
    it("should update a workflow step", async () => {
      const workflow = mockWorkflow();
      service.updateWorkflowStep.mockResolvedValue(workflow);
      const step: WorkflowStepDto = { id: "s1", name: "Updated", order: 1 };

      const result = await controller.updateWorkflowStep("wf-id", "s1", step);

      expect(service.updateWorkflowStep).toHaveBeenCalledWith(
        "wf-id",
        "s1",
        step,
      );
      expect(result).toBe(workflow);
    });
  });

  describe("removeWorkflowStep", () => {
    it("should remove a workflow step", async () => {
      service.removeWorkflowStep.mockResolvedValue(undefined);

      await controller.removeWorkflowStep("wf-id", "s1");

      expect(service.removeWorkflowStep).toHaveBeenCalledWith("wf-id", "s1");
    });
  });

  describe("getWorkflowsWithTaskCount", () => {
    it("should return workflows with task count", async () => {
      const data = [{ id: "1", name: "WF1", taskCount: 5 }];
      service.getWorkflowsWithTaskCount.mockResolvedValue(data);

      const result = await controller.getWorkflowsWithTaskCount();

      expect(result).toEqual(data);
    });
  });
});
