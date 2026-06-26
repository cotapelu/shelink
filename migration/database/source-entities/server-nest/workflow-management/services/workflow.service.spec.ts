import { Test, TestingModule } from "@nestjs/testing";
import { WorkflowService } from "./workflow.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Workflow, WorkflowStatus } from "../entities/workflow.entity";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { WorkflowStepDto } from "../dto/workflow-step.dto";

type MockRepository = Partial<Record<keyof Repository<Workflow>, jest.Mock>>;

const mockWorkflow = (overrides: any = {}): Workflow =>
  ({
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test Workflow",
    description: null,
    status: WorkflowStatus.ACTIVE,
    category: null,
    steps: [],
    ownerId: "user-1",
    owner: { id: "user-1" } as any,
    tasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as unknown as Workflow;

const mockRepository = (): MockRepository => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softRemove: jest.fn(),
  restore: jest.fn(),
  count: jest.fn(),
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

describe("WorkflowService", () => {
  let service: WorkflowService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: getRepositoryToken(Workflow), useValue: mockRepository() },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    repository = module.get<MockRepository>(getRepositoryToken(Workflow));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a workflow with steps", async () => {
      const steps = [{ id: "s1", name: "Step 1", order: 1 }];
      const dto = { name: "New Workflow", ownerId: "user-1", steps };
      const saved = mockWorkflow({ ...dto, id: "new-id", steps });

      repository.create!.mockReturnValue(dto);
      repository.save!.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalledWith(dto);
      expect(result).toEqual(saved);
    });

    it("should throw if no steps provided", async () => {
      const dto = { name: "Workflow", ownerId: "user-1", steps: [] };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw if step order is not a number", async () => {
      const steps = [
        { id: "s1", name: "Step 1", order: "not a number" as any },
      ];
      const dto = { name: "Workflow", ownerId: "user-1", steps };
      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw if step missing id or name", async () => {
      const steps = [{ id: "s1", order: 1 }]; // missing name
      const dto = { name: "Workflow", ownerId: "user-1", steps };
      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    // Branch coverage: duplicate step orders
    it("should throw BadRequestException if duplicate step orders found", async () => {
      const steps = [
        { id: "s1", name: "Step 1", order: 1 },
        { id: "s2", name: "Step 2", order: 1 }, // duplicate order
      ];
      const dto = { name: "Workflow", ownerId: "user-1", steps };
      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findOne", () => {
    it("should return a workflow with owner", async () => {
      const wf = mockWorkflow();
      repository.findOne!.mockResolvedValue(wf);

      const result = await service.findOne(wf.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: wf.id },
        relations: ["owner"],
        withDeleted: false,
      });
      expect(result).toBe(wf);
    });

    it("should return workflow including deleted when withDeleted true", async () => {
      const wf = mockWorkflow();
      repository.findOne!.mockResolvedValue(wf);

      const result = await service.findOne(wf.id, true);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: wf.id },
        relations: ["owner"],
        withDeleted: true,
      });
      expect(result).toBe(wf);
    });

    it("should throw NotFoundException if not found", async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return all workflows with owner", async () => {
      const workflows = [mockWorkflow(), mockWorkflow({ id: "2" })];
      repository.find!.mockResolvedValue(workflows);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        relations: ["owner"],
        withDeleted: false,
      });
      expect(result).toEqual(workflows);
    });

    it("should return all workflows including deleted when withDeleted true", async () => {
      const workflows = [mockWorkflow(), mockWorkflow({ id: "2" })];
      repository.find!.mockResolvedValue(workflows);

      const result = await service.findAll(true);

      expect(repository.find).toHaveBeenCalledWith({
        relations: ["owner"],
        withDeleted: true,
      });
      expect(result).toEqual(workflows);
    });
  });

  describe("findPaged", () => {
    it("should return paginated workflows", async () => {
      const workflows = [mockWorkflow()];
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(workflows),
        getCount: jest.fn().mockResolvedValue(1),
        withDeleted: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findPaged(1, 10);

      expect(result).toEqual({ data: workflows, total: 1, page: 1, limit: 10 });
    });

    it("should include deleted workflows when withDeleted true", async () => {
      const workflows = [mockWorkflow()];
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(workflows),
        getCount: jest.fn().mockResolvedValue(1),
        withDeleted: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      await service.findPaged(1, 10, true);

      expect(qb.withDeleted).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update workflow steps if provided", async () => {
      const existing = mockWorkflow({
        steps: [{ id: "s1", name: "Old", order: 1 }],
      });
      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockResolvedValue(existing);

      const updateDto = { steps: [{ id: "s1", name: "Updated", order: 1 }] };
      const result = await service.update(existing.id, updateDto as any);

      expect(result.steps).toEqual(updateDto.steps);
    });

    it("should throw BadRequestException for empty steps", async () => {
      const existing = mockWorkflow();
      repository.findOne!.mockResolvedValue(existing);
      const updateDto = { steps: [] };
      await expect(
        service.update(existing.id, updateDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for duplicate step orders", async () => {
      const existing = mockWorkflow();
      repository.findOne!.mockResolvedValue(existing);
      const updateDto = {
        steps: [
          { id: "s1", name: "Step1", order: 1 },
          { id: "s2", name: "Step2", order: 1 },
        ],
      };
      await expect(
        service.update(existing.id, updateDto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should soft remove a workflow", async () => {
      const wf = mockWorkflow();
      repository.findOne!.mockResolvedValue(wf);
      repository.softRemove!.mockResolvedValue(wf);

      await service.remove(wf.id);

      expect(repository.softRemove).toHaveBeenCalledWith(wf);
    });
  });

  describe("restore", () => {
    it("should restore a soft-deleted workflow", async () => {
      repository.restore!.mockResolvedValue({});

      await service.restore("123");

      expect(repository.restore).toHaveBeenCalledWith("123");
    });
  });

  describe("findByOwnerId", () => {
    it("should return workflows by owner", async () => {
      const workflows = [mockWorkflow()];
      repository.find!.mockResolvedValue(workflows);

      const result = await service.findByOwnerId("user-1");

      expect(repository.find).toHaveBeenCalledWith({
        where: { ownerId: "user-1" },
        relations: ["owner"],
      });
      expect(result).toEqual(workflows);
    });
  });

  describe("findByStatus", () => {
    it("should return workflows by status", async () => {
      const workflows = [mockWorkflow()];
      repository.find!.mockResolvedValue(workflows);

      const result = await service.findByStatus(WorkflowStatus.ACTIVE);

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: WorkflowStatus.ACTIVE },
        relations: ["owner"],
      });
      expect(result).toEqual(workflows);
    });
  });

  describe("getWorkflowSteps", () => {
    it("should return sorted steps", async () => {
      const wf = mockWorkflow({
        steps: [
          { id: "s2", name: "Step 2", order: 2 },
          { id: "s1", name: "Step 1", order: 1 },
        ],
      });
      repository.findOne!.mockResolvedValue(wf);

      const result = await service.getWorkflowSteps(wf.id);

      expect(result).toEqual([
        { id: "s1", name: "Step 1", order: 1 },
        { id: "s2", name: "Step 2", order: 2 },
      ]);
    });

    it("should parse steps from JSON string and sort", async () => {
      const stepsArray = [
        { id: "s2", name: "Step 2", order: 2 },
        { id: "s1", name: "Step 1", order: 1 },
      ];
      const wf = mockWorkflow({ steps: JSON.stringify(stepsArray) });
      repository.findOne!.mockResolvedValue(wf);

      const result = await service.getWorkflowSteps(wf.id);

      expect(result).toEqual([
        { id: "s1", name: "Step 1", order: 1 },
        { id: "s2", name: "Step 2", order: 2 },
      ]);
    });

    it("should return empty array if steps JSON is malformed", async () => {
      const wf = mockWorkflow({ steps: "invalid json" });
      repository.findOne!.mockResolvedValue(wf);

      const result = await service.getWorkflowSteps(wf.id);

      expect(result).toEqual([]);
    });
  });

  describe("addWorkflowStep", () => {
    it("should add a new step", async () => {
      const wf = mockWorkflow({ steps: [] });
      repository.findOne!.mockResolvedValue(wf);
      repository.save!.mockResolvedValue(wf);

      const stepDto: WorkflowStepDto = { id: "s1", name: "New Step", order: 1 };
      const result = await service.addWorkflowStep(wf.id, stepDto);

      expect(result.steps).toContainEqual(stepDto);
    });

    it("should add step when existing steps are a JSON string", async () => {
      const wf = mockWorkflow({
        steps: JSON.stringify([{ id: "s1", name: "Old", order: 1 }]),
      });
      repository.findOne!.mockResolvedValue(wf);
      repository.save!.mockResolvedValue(wf);

      const stepDto: WorkflowStepDto = { id: "s2", name: "New", order: 2 };
      const result = await service.addWorkflowStep(wf.id, stepDto);

      expect(
        result.steps.some((s: any) => s.id === "s2" && s.name === "New"),
      ).toBe(true);
    });
  });

  describe("removeWorkflowStep", () => {
    it("should remove a step by id", async () => {
      const wf = mockWorkflow({
        steps: [{ id: "s1", name: "Step", order: 1 }],
      });
      repository.findOne!.mockResolvedValue(wf);
      repository.save!.mockResolvedValue(wf);

      await service.removeWorkflowStep(wf.id, "s1");

      expect(wf.steps).toHaveLength(0);
    });

    it("should remove step when steps stored as JSON string", async () => {
      const wf = mockWorkflow({
        steps: JSON.stringify([{ id: "s1", name: "Step", order: 1 }]),
      });
      repository.findOne!.mockResolvedValue(wf);
      repository.save!.mockResolvedValue(wf);

      await service.removeWorkflowStep(wf.id, "s1");

      expect(wf.steps).toEqual([]);
    });
  });

  describe("getWorkflowStatistics", () => {
    it("should return statistics", async () => {
      repository.count!.mockResolvedValue(2);
      repository.createQueryBuilder!.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: "active", count: "1" },
          { status: "archived", count: "1" },
        ]),
      } as any);

      const result = await service.getWorkflowStatistics();

      expect(result).toEqual({
        totalWorkflows: 2,
        statusBreakdown: { active: 1, archived: 1 },
      });
    });

    it("should return empty breakdown when no workflows", async () => {
      repository.count!.mockResolvedValue(0);
      repository.createQueryBuilder!.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.getWorkflowStatistics();

      expect(result).toEqual({
        totalWorkflows: 0,
        statusBreakdown: {},
      });
    });
  });

  describe("findByCategory", () => {
    it("should return workflows by category", async () => {
      const workflows = [mockWorkflow()];
      repository.find!.mockResolvedValue(workflows);

      const result = await service.findByCategory("marketing");

      expect(repository.find).toHaveBeenCalledWith({
        where: { category: "marketing" },
        relations: ["owner"],
      });
      expect(result).toEqual(workflows);
    });
  });

  describe("searchWorkflows", () => {
    it("should search workflows using ILIKE for PostgreSQL", async () => {
      const workflows = [mockWorkflow()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(workflows),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);
      process.env.DB_TYPE = "postgres";

      const result = await service.searchWorkflows("query");

      expect(qb.where).toHaveBeenCalledWith(
        "workflow.name ILIKE :query OR workflow.description ILIKE :query",
        { query: "%query%" },
      );
      expect(result).toEqual(workflows);

      process.env.DB_TYPE = undefined;
    });

    it("should search workflows using LOWER/LIKE for SQLite", async () => {
      const workflows = [mockWorkflow()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(workflows),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);
      process.env.DB_TYPE = "sqlite";

      const result = await service.searchWorkflows("query");

      expect(qb.where).toHaveBeenCalledWith(
        "LOWER(workflow.name) LIKE LOWER(:query) OR LOWER(workflow.description) LIKE LOWER(:query)",
        { query: "%query%" },
      );
      expect(result).toEqual(workflows);

      process.env.DB_TYPE = undefined;
    });
  });

  describe("getWorkflowsByDateRange", () => {
    it("should return workflows in date range", async () => {
      const workflows = [mockWorkflow()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(workflows),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getWorkflowsByDateRange(
        new Date(),
        new Date(),
      );

      expect(result).toEqual(workflows);
    });
  });

  describe("getActiveWorkflows", () => {
    it("should return active workflows", async () => {
      const workflows = [mockWorkflow({ status: WorkflowStatus.ACTIVE })];
      repository.find!.mockResolvedValue(workflows);

      const result = await service.getActiveWorkflows();

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: WorkflowStatus.ACTIVE },
        relations: ["owner"],
      });
      expect(result).toEqual(workflows);
    });
  });

  describe("getArchivedWorkflows", () => {
    it("should return archived workflows", async () => {
      const workflows = [mockWorkflow({ status: WorkflowStatus.ARCHIVED })];
      repository.find!.mockResolvedValue(workflows);

      const result = await service.getArchivedWorkflows();

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: WorkflowStatus.ARCHIVED },
        relations: ["owner"],
      });
      expect(result).toEqual(workflows);
    });
  });

  describe("getWorkflowsWithTaskCount", () => {
    it("should return workflows with task counts", async () => {
      const data = [{ id: "1", name: "WF1", taskCount: 5 }];
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(data),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getWorkflowsWithTaskCount();

      expect(result).toEqual(data);
    });
  });

  describe("updateWorkflowStep", () => {
    it("should update an existing step", async () => {
      const wf = mockWorkflow({ steps: [{ id: "s1", name: "Old", order: 1 }] });
      repository.findOne!.mockResolvedValue(wf);
      repository.save!.mockResolvedValue(wf);

      const stepDto: WorkflowStepDto = { id: "s1", name: "Updated", order: 1 };
      const result = await service.updateWorkflowStep(wf.id, "s1", stepDto);

      expect(result.steps[0].name).toBe("Updated");
    });

    it("should update step when steps stored as JSON string", async () => {
      const wf = mockWorkflow({
        steps: JSON.stringify([{ id: "s1", name: "Old", order: 1 }]),
      });
      repository.findOne!.mockResolvedValue(wf);
      repository.save!.mockResolvedValue(wf);

      const stepDto: WorkflowStepDto = { id: "s1", name: "Updated", order: 1 };
      const result = await service.updateWorkflowStep(wf.id, "s1", stepDto);

      expect(result.steps[0].name).toBe("Updated");
    });

    // Branch coverage: step not found
    it("should throw NotFoundException if step not found", async () => {
      const wf = mockWorkflow({ steps: [{ id: "s1", name: "Old", order: 1 }] });
      repository.findOne!.mockResolvedValue(wf);

      const stepDto: WorkflowStepDto = { id: "s2", name: "New", order: 2 };
      await expect(
        service.updateWorkflowStep(wf.id, "s2", stepDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
