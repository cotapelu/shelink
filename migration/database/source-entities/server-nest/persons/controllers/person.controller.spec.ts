import { Test, TestingModule } from "@nestjs/testing";
import { PersonController } from "./person.controller";
import { PersonService } from "../services/person.service";
import { Person } from "../entities/person.entity";
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { CreatePersonDto } from "../dto/create-person.dto";
import { UpdatePersonDto } from "../dto/update-person.dto";

const mockPerson = (overrides: Partial<Person> = {}): Person => ({
  id: "person-id-1",
  full_name: "John Doe",
  birth_year: 1980,
  birth_month: 5,
  birth_day: 15,
  gender: "male",
  generation: 3,
  is_deceased: false,
  is_in_law: false,
  birth_order: null,
  death_year: null,
  death_month: null,
  death_day: null,
  phone_number: "1234567890",
  occupation: "Engineer",
  current_residence: "Hanoi",
  other_names: "Johnny",
  note: "Test note",
  avatar_url: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const mockPersonService = () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  batchDelete: jest.fn(),
  batchUpdate: jest.fn(),
  getStatsByGeneration: jest.fn(),
  getStatsByGender: jest.fn(),
  getAgeDistribution: jest.fn(),
  getLineageTree: jest.fn(),
  getKinshipRelation: jest.fn(),
  findRootPerson: jest.fn(),
});

describe("PersonController", () => {
  let controller: PersonController;
  let service: ReturnType<typeof mockPersonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonController],
      providers: [{ provide: PersonService, useValue: mockPersonService() }],
    }).compile();

    controller = module.get<PersonController>(PersonController);
    service = module.get(PersonService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a person successfully", async () => {
      const createDto: CreatePersonDto = {
        full_name: "Jane Doe",
        birth_year: 1990,
        gender: "female",
        generation: 2,
      };
      const saved = mockPerson({
        id: "new-id-1",
        full_name: createDto.full_name,
      });
      service.create.mockResolvedValue(saved);

      const result = await controller.create(createDto as any);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(saved);
    });

    it("should throw ConflictException when person already exists", async () => {
      const createDto: CreatePersonDto = {
        full_name: "John Doe",
        birth_year: 1980,
        gender: "male",
      };
      service.create.mockRejectedValue(
        new ConflictException(
          "Person with same name and birth year already exists",
        ),
      );

      await expect(controller.create(createDto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated persons with default values", async () => {
      const persons = [
        mockPerson(),
        mockPerson({ id: "2", full_name: "Jane" }),
      ];
      const result = {
        data: persons,
        total: 2,
        page: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(result);

      const response = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, {});
      expect(response).toEqual(result);
    });

    it("should handle pagination and search", async () => {
      const persons = [mockPerson()];
      const result = { data: persons, total: 1, page: 2, totalPages: 1 };
      service.findAll.mockResolvedValue(result);

      const response = await controller.findAll(
        "2",
        "10",
        "John",
        "male",
        "3",
        "1970",
        "2000",
        "false",
      );

      expect(service.findAll).toHaveBeenCalledWith(2, 10, "John", {
        gender: "male",
        generation: 3,
        minBirthYear: 1970,
        maxBirthYear: 2000,
        isDeceased: false,
      });
      expect(response).toEqual(result);
    });

    it("should handle isDeceased as true", async () => {
      service.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.findAll(
        "1",
        "20",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "true",
      );

      expect(service.findAll).toHaveBeenCalledWith(1, 20, undefined, {
        isDeceased: true,
      });
    });
  });

  describe("advancedSearch", () => {
    it("should call findAll with same parameters", async () => {
      service.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.advancedSearch(
        "John",
        "male",
        "3",
        "1970",
        "2000",
        "false",
        "2",
        "50",
      );

      expect(service.findAll).toHaveBeenCalledWith(2, 50, "John", {
        gender: "male",
        generation: 3,
        minBirthYear: 1970,
        maxBirthYear: 2000,
        isDeceased: false,
      });
    });
  });

  describe("findOne", () => {
    it("should return a person by id", async () => {
      const person = mockPerson();
      service.findOne.mockResolvedValue(person);

      const result = await controller.findOne(person.id as any);

      expect(service.findOne).toHaveBeenCalledWith(person.id);
      expect(result).toBe(person);
    });

    it("should throw NotFoundException when person not found", async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException("Person with ID nonexistent not found"),
      );

      await expect(controller.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a person", async () => {
      const id = "person-id-1";
      const updateDto: UpdatePersonDto = { occupation: "Doctor" };
      const updated = mockPerson({ id, occupation: "Doctor" });
      service.update.mockResolvedValue(updated);

      const result = await controller.update(id, updateDto as any);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException when updating non-existent person", async () => {
      service.update.mockRejectedValue(
        new NotFoundException("Person with ID nonexistent not found"),
      );

      await expect(
        controller.update("nonexistent", { occupation: "Test" } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a person", async () => {
      const id = "person-id-1";
      service.remove.mockResolvedValue({ success: true });

      const result = await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
      expect(result).toEqual({ success: true });
    });

    it("should throw NotFoundException when deleting non-existent person", async () => {
      service.remove.mockRejectedValue(
        new NotFoundException("Person with ID nonexistent not found"),
      );

      await expect(controller.remove("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("batchDelete", () => {
    it("should batch delete persons", async () => {
      const ids = ["id1", "id2"];
      service.batchDelete.mockResolvedValue({ deleted: 2, errors: [] });

      const result = await controller.batchDelete({ ids } as any);

      expect(service.batchDelete).toHaveBeenCalledWith(ids);
      expect(result).toEqual({ deleted: 2, errors: [] });
    });

    it("should handle partial failures", async () => {
      const ids = ["id1", "id2", "id3"];
      service.batchDelete.mockResolvedValue({
        deleted: 2,
        errors: ["Failed to delete id2: Not found"],
      });

      const result = await controller.batchDelete({ ids } as any);

      expect(result).toEqual({
        deleted: 2,
        errors: ["Failed to delete id2: Not found"],
      });
    });
  });

  describe("batchUpdate", () => {
    it("should batch update persons", async () => {
      const ids = ["id1", "id2"];
      const data = { generation: 4 };
      service.batchUpdate.mockResolvedValue({ updated: 2, errors: [] });

      const result = await controller.batchUpdate({ ids, data } as any);

      expect(service.batchUpdate).toHaveBeenCalledWith(ids, data);
      expect(result).toEqual({ updated: 2, errors: [] });
    });

    it("should handle partial failures", async () => {
      const ids = ["id1", "id2"];
      const data = { gender: "female" };
      service.batchUpdate.mockResolvedValue({
        updated: 1,
        errors: ["Failed to update id2: Not found"],
      });

      const result = await controller.batchUpdate({ ids, data } as any);

      expect(result).toEqual({
        updated: 1,
        errors: ["Failed to update id2: Not found"],
      });
    });
  });

  describe("getStatsByGeneration", () => {
    it("should return generation statistics", async () => {
      const stats = [
        { generation: 1, count: 5 },
        { generation: 2, count: 10 },
        { generation: 3, count: 15 },
      ];
      service.getStatsByGeneration.mockResolvedValue(stats);

      const result = await controller.getStatsByGeneration();

      expect(service.getStatsByGeneration).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe("getStatsByGender", () => {
    it("should return gender statistics", async () => {
      const stats = [
        { gender: "male", count: 20 },
        { gender: "female", count: 25 },
      ];
      service.getStatsByGender.mockResolvedValue(stats);

      const result = await controller.getStatsByGender();

      expect(service.getStatsByGender).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe("getAgeDistribution", () => {
    it("should return age distribution", async () => {
      const distribution = [
        { ageGroup: "0-17", count: 5 },
        { ageGroup: "18-30", count: 10 },
        { ageGroup: "31-50", count: 15 },
        { ageGroup: "51-70", count: 8 },
        { ageGroup: "71+", count: 2 },
      ];
      service.getAgeDistribution.mockResolvedValue(distribution);

      const result = await controller.getAgeDistribution();

      expect(service.getAgeDistribution).toHaveBeenCalled();
      expect(result).toEqual(distribution);
    });
  });

  describe("getLineageTree", () => {
    it("should return lineage tree with default maxDepth", async () => {
      const tree = {
        person: mockPerson(),
        children: [],
        spouses: [],
      };
      service.getLineageTree.mockResolvedValue(tree);

      const result = await controller.getLineageTree("root-id");

      expect(service.getLineageTree).toHaveBeenCalledWith("root-id", 3);
      expect(result).toEqual(tree);
    });

    it("should respect maxDepth parameter", async () => {
      const tree = { person: mockPerson(), children: [], spouses: [] };
      service.getLineageTree.mockResolvedValue(tree);

      await controller.getLineageTree("root-id", "5");

      expect(service.getLineageTree).toHaveBeenCalledWith("root-id", 5);
    });

    it("should throw NotFoundException for non-existent root", async () => {
      service.getLineageTree.mockRejectedValue(
        new NotFoundException("Person with ID nonexistent not found"),
      );

      await expect(controller.getLineageTree("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getKinshipRelation", () => {
    it("should return self relationship when ids are same", async () => {
      service.getKinshipRelation.mockResolvedValue({
        relationship: "self",
        path: [],
      });

      const result = await controller.getKinshipRelation("same-id", "same-id");

      expect(service.getKinshipRelation).toHaveBeenCalledWith(
        "same-id",
        "same-id",
      );
      expect(result).toEqual({ relationship: "self", path: [] });
    });

    it("should return relationship path when found", async () => {
      const relationship = {
        relationship: "biological_child",
        path: [
          {
            relationship: {
              type: "biological_child",
              person_a: "A",
              person_b: "B",
            },
            direction: "out",
          },
        ],
      };
      service.getKinshipRelation.mockResolvedValue(relationship);

      const result = await controller.getKinshipRelation("A", "B");

      expect(service.getKinshipRelation).toHaveBeenCalledWith("A", "B");
      expect(result).toEqual(relationship);
    });

    it("should return null relationship when no connection", async () => {
      service.getKinshipRelation.mockResolvedValue({
        relationship: null,
        path: [],
      });

      const result = await controller.getKinshipRelation("A", "Z");

      expect(result).toEqual({ relationship: null, path: [] });
    });
  });

  describe("findRootPerson", () => {
    it("should return root person", async () => {
      const root = mockPerson();
      service.findRootPerson.mockResolvedValue(root);

      const result = await controller.findRootPerson();

      expect(service.findRootPerson).toHaveBeenCalled();
      expect(result).toBe(root);
    });

    it("should return null when no root exists", async () => {
      service.findRootPerson.mockResolvedValue(null);

      const result = await controller.findRootPerson();

      expect(result).toBeNull();
    });
  });
});
