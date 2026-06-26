import { Test, TestingModule } from "@nestjs/testing";
import { RelationshipController } from "./relationship.controller";
import { RelationshipService } from "../services/relationship.service";
import {
  Relationship,
  RelationshipType,
} from "../entities/relationship.entity";
import { Person } from "../entities/person.entity";
import { BadRequestException } from "@nestjs/common";
import { CreateRelationshipDto } from "../dto/create-relationship.dto";
import { RelationshipDto } from "../dto/relationship.dto";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { Permissions } from "@auth/decorators/permissions.decorator";

const mockRelationship = (
  overrides: Partial<Relationship> = {},
): Relationship => ({
  id: "rel-id-1",
  person_a: "person-1",
  person_b: "person-2",
  personA: {
    id: "person-1",
    full_name: "Person A",
    gender: "male",
    generation: 3,
    is_deceased: false,
    is_in_law: false,
    birth_order: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as Person,
  personB: {
    id: "person-2",
    full_name: "Person B",
    gender: "female",
    generation: 2,
    is_deceased: false,
    is_in_law: false,
    birth_order: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as Person,
  type: "biological_child" as RelationshipType,
  note: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const mockRelationshipService = () => ({
  create: jest.fn(),
  findAllByPerson: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
});

describe("RelationshipController", () => {
  let controller: RelationshipController;
  let service: ReturnType<typeof mockRelationshipService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RelationshipController],
      providers: [
        { provide: RelationshipService, useValue: mockRelationshipService() },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideProvider(Permissions)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<RelationshipController>(RelationshipController);
    service = module.get(RelationshipService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a relationship", async () => {
      const createDto: CreateRelationshipDto = {
        person_a: "person-1",
        person_b: "person-2",
        type: "biological_child",
      };
      const created = mockRelationship(createDto);
      service.create.mockResolvedValue(created);

      const result = await controller.create(createDto as any);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toBe(created);
    });
  });

  describe("findAll", () => {
    it("should return empty array when no filter (no person_id)", async () => {
      const result = await controller.findAll();

      expect(result).toEqual([]);
    });

    it("should filter by person_id", async () => {
      const rels = [mockRelationship({ person_a: "filter-person" })];
      service.findAllByPerson.mockResolvedValue(rels);

      const result = await controller.findAll("filter-person");

      expect(service.findAllByPerson).toHaveBeenCalledWith("filter-person");
      expect(result).toBe(rels);
    });
  });

  describe("findOne", () => {
    it("should return a relationship by id", async () => {
      const rel = mockRelationship();
      service.findOne.mockResolvedValue(rel);

      const result = await controller.findOne(rel.id);

      expect(service.findOne).toHaveBeenCalledWith(rel.id);
      expect(result).toBe(rel);
    });

    it("should throw when relationship not found", async () => {
      service.findOne.mockRejectedValue(new BadRequestException("Not found"));

      await expect(controller.findOne("missing")).rejects.toThrow();
    });
  });

  describe("remove", () => {
    it("should delete a relationship", async () => {
      service.remove.mockResolvedValue({ success: true });

      const result = await controller.remove("rel-id");

      expect(service.remove).toHaveBeenCalledWith("rel-id");
      expect(result).toEqual({ success: true });
    });
  });
});
