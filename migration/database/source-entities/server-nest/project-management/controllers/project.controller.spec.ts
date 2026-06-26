import { Test, TestingModule } from "@nestjs/testing";
import { ProjectController } from "./project.controller";
import { ProjectService } from "../services/project.service";
import { Project, ProjectStatus } from "../entities/project.entity";
import { CreateProjectDto } from "../dto/create-project.dto";
import { UpdateProjectDto } from "../dto/update-project.dto";

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
    ...overrides,
  }) as unknown as Project;

const mockProjectService = () => ({
  findAll: jest.fn(),
  findPaged: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  restore: jest.fn(),
  findByOwnerId: jest.fn(),
  findByStatus: jest.fn(),
  getProjectStatistics: jest.fn(),
  getActiveProjects: jest.fn(),
  getCompletedProjects: jest.fn(),
  getOverdueProjects: jest.fn(),
  getUpcomingProjects: jest.fn(),
});

describe("ProjectController", () => {
  let controller: ProjectController;
  let service: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [{ provide: ProjectService, useValue: mockProjectService() }],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
    service = module.get(ProjectService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a project", async () => {
      const dto: CreateProjectDto = {
        name: "New",
        ownerId: "user-1",
        status: ProjectStatus.ACTIVE,
      };
      const saved = mockProject(dto);
      service.create.mockResolvedValue(saved);

      const result = await controller.create(dto as any);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(saved);
    });
  });

  describe("findOne", () => {
    it("should return a project", async () => {
      const project = mockProject();
      service.findOne.mockResolvedValue(project);

      const result = await controller.findOne(project.id as any);

      expect(service.findOne).toHaveBeenCalledWith(project.id, false);
      expect(result).toBe(project);
    });
  });

  describe("findAll", () => {
    it("should return paginated projects", async () => {
      const resultDto = { data: [mockProject()], total: 1, page: 1, limit: 20 };
      service.findPaged.mockResolvedValue(resultDto);

      const result = await controller.findAll();

      expect(service.findPaged).toHaveBeenCalledWith(1, 20, undefined, false);
      expect(result).toEqual(resultDto);
    });
  });

  describe("update", () => {
    it("should update a project", async () => {
      const project = mockProject();
      service.findOne.mockResolvedValue(project);
      service.update.mockResolvedValue(project);

      const updateDto: UpdateProjectDto = { name: "Updated" };
      const result = await controller.update(
        project.id as any,
        updateDto as any,
      );

      expect(service.update).toHaveBeenCalledWith(project.id, updateDto);
      expect(result).toBe(project);
    });
  });

  describe("remove", () => {
    it("should soft remove a project", async () => {
      const project = mockProject();
      service.findOne.mockResolvedValue(project);
      service.remove.mockResolvedValue(undefined);

      await controller.remove(project.id as any);

      expect(service.remove).toHaveBeenCalledWith(project.id);
    });
  });

  describe("restore", () => {
    it("should restore a project", async () => {
      service.restore.mockResolvedValue({ restored: true });

      const result = await controller.restore("123");

      expect(service.restore).toHaveBeenCalledWith("123");
      expect(result).toEqual({ restored: true });
    });
  });

  describe("findByOwnerId", () => {
    it("should return projects by owner", async () => {
      const projects = [mockProject()];
      service.findByOwnerId.mockResolvedValue(projects);

      const result = await controller.findByOwnerId("user-1");

      expect(service.findByOwnerId).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(projects);
    });
  });

  describe("getProjectStatistics", () => {
    it("should return statistics", async () => {
      const stats = {
        totalProjects: 5,
        statusBreakdown: { active: 3, completed: 2 },
      };
      service.getProjectStatistics.mockResolvedValue(stats);

      const result = await controller.getProjectStatistics();

      expect(result).toEqual(stats);
    });
  });

  describe("getActiveProjects", () => {
    it("should return active projects", async () => {
      const projects = [mockProject({ status: ProjectStatus.ACTIVE })];
      service.getActiveProjects.mockResolvedValue(projects);

      const result = await controller.getActiveProjects();

      expect(service.getActiveProjects).toHaveBeenCalled();
      expect(result).toEqual(projects);
    });
  });
});
