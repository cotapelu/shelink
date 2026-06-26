import { Test, TestingModule } from "@nestjs/testing";
import { ProjectService } from "./project.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Project, ProjectStatus } from "../entities/project.entity";
import { NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";

type MockRepository = Partial<Record<keyof Repository<Project>, jest.Mock>>;

const mockProject = (overrides: Partial<Project> = {}): Project =>
  ({
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test Project",
    description: "Test description",
    status: ProjectStatus.ACTIVE,
    ownerId: "user-1",
    startDate: new Date(),
    endDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    budget: null,
    currency: null,
    ...overrides,
  }) as unknown as Project;

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

describe("ProjectService", () => {
  let service: ProjectService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: getRepositoryToken(Project), useValue: mockRepository() },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    repository = module.get<MockRepository>(getRepositoryToken(Project));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a project", async () => {
      const createDto = {
        name: "New Project",
        description: "Desc",
        ownerId: "user-1",
        status: ProjectStatus.ACTIVE,
      };
      const savedProject = mockProject({ ...createDto, id: "new-id" });
      repository.create!.mockReturnValue(createDto);
      repository.save!.mockResolvedValue(savedProject);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(savedProject);
    });
  });

  describe("findOne", () => {
    it("should throw NotFoundException when project not found", async () => {
      repository.findOne!.mockResolvedValue(null);
      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return project when found", async () => {
      const project = mockProject();
      repository.findOne!.mockResolvedValue(project);

      const result = await service.findOne(project.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: project.id },
        relations: ["owner"],
        withDeleted: false,
      });
      expect(result).toBe(project);
    });

    it("should return project including deleted when withDeleted true", async () => {
      const project = mockProject();
      repository.findOne!.mockResolvedValue(project);

      const result = await service.findOne(project.id, true);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: project.id },
        relations: ["owner"],
        withDeleted: true,
      });
      expect(result).toBe(project);
    });
  });

  describe("findAll", () => {
    it("should return an array of projects", async () => {
      const projects = [mockProject(), mockProject({ id: "2" })];
      repository.find!.mockResolvedValue(projects);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        relations: ["owner"],
        withDeleted: false,
      });
      expect(result).toEqual(projects);
    });

    it("should return all projects including deleted when withDeleted true", async () => {
      const projects = [mockProject(), mockProject({ id: "2" })];
      repository.find!.mockResolvedValue(projects);

      const result = await service.findAll(true);

      expect(repository.find).toHaveBeenCalledWith({
        relations: ["owner"],
        withDeleted: true,
      });
      expect(result).toEqual(projects);
    });
  });

  describe("findPaged", () => {
    it("should return paginated projects", async () => {
      const projects = [mockProject()];
      const total = 1;
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
        getCount: jest.fn().mockResolvedValue(total),
        withDeleted: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findPaged(1, 10);

      expect(result).toEqual({ data: projects, total: 1, page: 1, limit: 10 });
    });

    it("should return paginated projects with withDeleted true", async () => {
      const projects = [mockProject()];
      const total = 1;
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
        getCount: jest.fn().mockResolvedValue(total),
        withDeleted: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findPaged(1, 10, undefined, true);

      expect(qb.withDeleted).toHaveBeenCalled();
      expect(result).toEqual({ data: projects, total: 1, page: 1, limit: 10 });
    });

    it("should return paginated projects with query (non-sqlite)", async () => {
      const projects = [mockProject()];
      const total = 1;
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
        getCount: jest.fn().mockResolvedValue(total),
        withDeleted: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findPaged(1, 10, "search", false);

      expect(qb.where).toHaveBeenCalledWith(
        "project.name ILIKE :q OR project.description ILIKE :q",
        { q: "%search%" },
      );
      expect(result).toEqual({ data: projects, total: 1, page: 1, limit: 10 });
    });

    it("should return paginated projects with query and sqlite", async () => {
      const projects = [mockProject()];
      const total = 1;
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
        getCount: jest.fn().mockResolvedValue(total),
        withDeleted: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);
      process.env.DB_TYPE = "sqlite";

      const result = await service.findPaged(1, 10, "search", false);

      expect(qb.where).toHaveBeenCalledWith(
        "LOWER(project.name) LIKE LOWER(:q) OR LOWER(project.description) LIKE LOWER(:q)",
        { q: "%search%" },
      );
      expect(result).toEqual({ data: projects, total: 1, page: 1, limit: 10 });

      process.env.DB_TYPE = undefined;
    });
  });

  describe("update", () => {
    it("should update a project", async () => {
      const existing = mockProject();
      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockResolvedValue(existing);

      const updateDto = { name: "Updated Project" };
      const result = await service.update(existing.id, updateDto);

      expect(result).toMatchObject(updateDto);
    });
  });

  describe("remove", () => {
    it("should soft remove a project", async () => {
      const project = mockProject();
      repository.findOne!.mockResolvedValue(project);
      repository.softRemove!.mockResolvedValue(project);

      await service.remove(project.id);

      expect(repository.softRemove).toHaveBeenCalledWith(project);
    });
  });

  describe("restore", () => {
    it("should restore a soft-deleted project", async () => {
      repository.restore!.mockResolvedValue({});

      await service.restore("123");

      expect(repository.restore).toHaveBeenCalledWith("123");
    });
  });

  describe("findByOwnerId", () => {
    it("should return projects by owner", async () => {
      const projects = [mockProject()];
      repository.find!.mockResolvedValue(projects);

      const result = await service.findByOwnerId("user-1");

      expect(repository.find).toHaveBeenCalledWith({
        where: { ownerId: "user-1" },
        relations: ["owner"],
      });
      expect(result).toEqual(projects);
    });
  });

  describe("findByStatus", () => {
    it("should return projects by status", async () => {
      const projects = [mockProject()];
      repository.find!.mockResolvedValue(projects);

      const result = await service.findByStatus(ProjectStatus.ACTIVE);

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: ProjectStatus.ACTIVE },
        relations: ["owner"],
      });
      expect(result).toEqual(projects);
    });
  });

  describe("searchProjects", () => {
    it("should search projects by query (PostgreSQL)", async () => {
      const projects = [mockProject()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.searchProjects("test");

      expect(result).toEqual(projects);
      expect(qb.where).toHaveBeenCalledWith(
        "project.name ILIKE :query OR project.description ILIKE :query",
        { query: "%test%" },
      );
    });

    it("should search projects by query (SQLite)", async () => {
      const originalDb = process.env.DB_TYPE;
      process.env.DB_TYPE = "sqlite";
      const projects = [mockProject()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.searchProjects("test");

      expect(result).toEqual(projects);
      expect(qb.where).toHaveBeenCalledWith(
        "LOWER(project.name) LIKE LOWER(:query) OR LOWER(project.description) LIKE LOWER(:query)",
        { query: "%test%" },
      );
      process.env.DB_TYPE = originalDb;
    });
  });

  describe("getProjectStatistics", () => {
    it("should return project statistics", async () => {
      const total = 5;
      const stats = [{ status: "active", count: "3" }];
      repository.count!.mockResolvedValue(total);
      repository.createQueryBuilder!.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(stats),
      } as any);

      const result = await service.getProjectStatistics();

      expect(result).toEqual({
        totalProjects: 5,
        statusBreakdown: { active: 3 },
      });
    });
  });

  describe("getProjectsByDateRange", () => {
    it("should return projects in date range", async () => {
      const projects = [mockProject()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getProjectsByDateRange(
        new Date(),
        new Date(),
      );

      expect(result).toEqual(projects);
    });
  });

  describe("getActiveProjects", () => {
    it("should return active projects", async () => {
      const projects = [mockProject({ status: ProjectStatus.ACTIVE })];
      repository.find!.mockResolvedValue(projects);

      const result = await service.getActiveProjects();

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: ProjectStatus.ACTIVE },
        relations: ["owner"],
      });
      expect(result).toEqual(projects);
    });
  });

  describe("getCompletedProjects", () => {
    it("should return completed projects", async () => {
      const projects = [mockProject({ status: ProjectStatus.COMPLETED })];
      repository.find!.mockResolvedValue(projects);

      const result = await service.getCompletedProjects();

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: ProjectStatus.COMPLETED },
        relations: ["owner"],
      });
      expect(result).toEqual(projects);
    });
  });

  describe("getOverdueProjects", () => {
    it("should return overdue projects", async () => {
      const projects = [mockProject()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getOverdueProjects();

      expect(result).toEqual(projects);
    });
  });

  describe("getUpcomingProjects", () => {
    it("should return upcoming projects", async () => {
      const projects = [mockProject()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getUpcomingProjects(30);

      expect(result).toEqual(projects);
    });
  });

  describe("getProjectsNeedingAttention", () => {
    it("should return projects needing attention", async () => {
      const projects = [mockProject()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getProjectsNeedingAttention();

      expect(result).toEqual(projects);
    });
  });

  describe("getProjectProgress", () => {
    it("should return progress based on environment", () => {
      // Non-development returns 0
      process.env.NODE_ENV = "production";
      const result1 = service.getProjectProgress("proj-1");
      expect(result1).resolves.toBe(0);

      // Development returns random 0-99
      process.env.NODE_ENV = "development";
      const result2 = service.getProjectProgress("proj-1");
      expect(result2).resolves.toBeGreaterThanOrEqual(0);
      expect(result2).resolves.toBeLessThan(100);
    });
  });

  describe("getProjectTasks", () => {
    it("should return mock tasks", async () => {
      const result = await service.getProjectTasks("proj-1");
      expect(result).toEqual([
        { id: "1", title: "Task 1", status: "completed" },
        { id: "2", title: "Task 2", status: "in-progress" },
        { id: "3", title: "Task 3", status: "todo" },
      ]);
    });
  });

  describe("getProjectTeamMembers", () => {
    it("should return mock team members", async () => {
      const result = await service.getProjectTeamMembers("proj-1");
      expect(result).toEqual([
        { id: "1", name: "John Doe", role: "Project Manager" },
        { id: "2", name: "Jane Smith", role: "Developer" },
        { id: "3", name: "Bob Johnson", role: "Designer" },
      ]);
    });
  });

  describe("getProjectBudgetUtilization", () => {
    it("should return budget utilization based on environment", () => {
      process.env.NODE_ENV = "production";
      expect(service.getProjectBudgetUtilization("proj-1")).resolves.toBe(0);

      process.env.NODE_ENV = "development";
      expect(
        service.getProjectBudgetUtilization("proj-1"),
      ).resolves.toBeGreaterThanOrEqual(0);
      expect(
        service.getProjectBudgetUtilization("proj-1"),
      ).resolves.toBeLessThan(100);
    });
  });

  describe("getProjectRiskScore", () => {
    it("should return risk score based on environment", () => {
      process.env.NODE_ENV = "production";
      expect(service.getProjectRiskScore("proj-1")).resolves.toBe(0);

      process.env.NODE_ENV = "development";
      expect(
        service.getProjectRiskScore("proj-1"),
      ).resolves.toBeGreaterThanOrEqual(0);
      expect(service.getProjectRiskScore("proj-1")).resolves.toBeLessThan(10);
    });
  });

  // Additional tests for missing default parameter branches
  describe("Default parameter coverage", () => {
    it("should use default page=1, limit=20, q=undefined, withDeleted=false for findPaged() with no args", async () => {
      const projects = [mockProject()];
      const total = 1;
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(projects),
        getCount: jest.fn().mockResolvedValue(total),
        withDeleted: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findPaged();

      expect(qb.skip).toHaveBeenCalledWith((1 - 1) * 20);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({ data: projects, total: 1, page: 1, limit: 20 });
    });

    it("should use default days=30 for getUpcomingProjects() with no args", async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProject()]),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      await service.getUpcomingProjects();

      // Verify that the BETWEEN query was called
      expect(qb.where).toHaveBeenCalledWith(
        "project.startDate BETWEEN :now AND :futureDate",
        expect.objectContaining({
          now: expect.any(Date),
          futureDate: expect.any(Date),
        }),
      );
      // Check that futureDate is approx 30 days ahead
      const [, params] = qb.where.mock.calls[0];
      const diff = params.futureDate.getTime() - params.now.getTime();
      expect(diff).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
      expect(diff).toBeLessThan(31 * 24 * 60 * 60 * 1000);
    });
  });
});
