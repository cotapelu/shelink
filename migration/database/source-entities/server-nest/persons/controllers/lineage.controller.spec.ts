import { Test, TestingModule } from "@nestjs/testing";
import { LineageController } from "./lineage.controller";
import { PersonService } from "../services/person.service";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { NotFoundException } from "@nestjs/common";

const mockPersonService = () => ({
  getLineageTree: jest.fn(),
  findRootPerson: jest.fn(),
});

describe("LineageController", () => {
  let controller: LineageController;
  let service: ReturnType<typeof mockPersonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LineageController],
      providers: [{ provide: PersonService, useValue: mockPersonService() }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideProvider(Permissions)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<LineageController>(LineageController);
    service = module.get(PersonService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getTree", () => {
    it("should call service with root id and default maxDepth", async () => {
      const mockResult = { person: { id: "root" }, children: [], spouses: [] };
      service.getLineageTree.mockResolvedValue(mockResult);

      const result = await controller.getTree("root-id");

      expect(service.getLineageTree).toHaveBeenCalledWith("root-id", undefined);
      expect(result).toBe(mockResult);
    });

    it("should parse maxDepth as integer", async () => {
      service.getLineageTree.mockResolvedValue({
        person: { id: "root" },
        children: [],
        spouses: [],
      });

      await controller.getTree("root-id", "5");

      expect(service.getLineageTree).toHaveBeenCalledWith("root-id", 5);
    });

    it("should pass zero maxDepth", async () => {
      service.getLineageTree.mockResolvedValue({
        person: { id: "root" },
        children: [],
        spouses: [],
      });

      await controller.getTree("root-id", "0");

      expect(service.getLineageTree).toHaveBeenCalledWith("root-id", 0);
    });
  });

  describe("getRoot", () => {
    it("should return root person", async () => {
      const mockRoot = { id: "root-id", full_name: "Root" };
      service.findRootPerson.mockResolvedValue(mockRoot);

      const result = await controller.getRoot();

      expect(service.findRootPerson).toHaveBeenCalled();
      expect(result).toBe(mockRoot);
    });

    it("should return null if no root found", async () => {
      service.findRootPerson.mockResolvedValue(null);

      const result = await controller.getRoot();

      expect(result).toBeNull();
    });

    it("should propagate NotFoundException", async () => {
      service.findRootPerson.mockRejectedValue(
        new NotFoundException("No root"),
      );

      await expect(controller.getRoot()).rejects.toThrow(NotFoundException);
    });
  });
});
