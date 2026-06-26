import { Test, TestingModule } from "@nestjs/testing";
import { KinshipController } from "./kinship.controller";
import { PersonService } from "../services/person.service";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { Permissions } from "@auth/decorators/permissions.decorator";

const mockPersonService = () => ({
  getKinshipRelation: jest.fn(),
});

describe("KinshipController", () => {
  let controller: KinshipController;
  let service: ReturnType<typeof mockPersonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KinshipController],
      providers: [{ provide: PersonService, useValue: mockPersonService() }],
      // Mock guards
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideProvider(Permissions)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<KinshipController>(KinshipController);
    service = module.get(PersonService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getRelation", () => {
    it("should call service with correct parameters", async () => {
      const mockResult = { relationship: "parent_child", path: [] };
      service.getKinshipRelation.mockResolvedValue(mockResult);

      const result = await controller.getRelation("person-a", "person-b");

      expect(service.getKinshipRelation).toHaveBeenCalledWith(
        "person-a",
        "person-b",
      );
      expect(result).toBe(mockResult);
    });

    it("should handle same person case", async () => {
      const mockResult = { relationship: "self", path: [] };
      service.getKinshipRelation.mockResolvedValue(mockResult);

      const result = await controller.getRelation("same", "same");

      expect(service.getKinshipRelation).toHaveBeenCalledWith("same", "same");
      expect(result.relationship).toBe("self");
    });
  });

  describe("calculate", () => {
    it("should call service with person_a and person_b", async () => {
      const mockResult = {
        relationship: "sibling",
        path: [{ relationship: "parent", direction: "out" }],
      };
      service.getKinshipRelation.mockResolvedValue(mockResult);

      const result = await controller.calculate("a", "b");

      expect(service.getKinshipRelation).toHaveBeenCalledWith("a", "b");
      expect(result).toBe(mockResult);
    });
  });
});
