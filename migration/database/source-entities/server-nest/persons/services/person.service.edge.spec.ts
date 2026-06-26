import { Test, TestingModule } from "@nestjs/testing";
import { PersonService } from "./person.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Person } from "../entities/person.entity";
import {
  Relationship,
  RelationshipType,
} from "../entities/relationship.entity";
import { NotFoundException, BadRequestException } from "@nestjs/common";

const mockPerson = (overrides: Partial<Person> = {}): any => ({
  id: "p1",
  full_name: "Test",
  gender: "male",
  birth_year: 1990,
  is_deceased: false,
  is_in_law: false,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const mockRelationship = (overrides: Partial<Relationship> = {}): any => ({
  id: "r1",
  person_a: "a",
  person_b: "b",
  type: "parent_child" as RelationshipType,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const mockRepo = () => ({
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
  }),
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  query: jest.fn(),
});

describe("PersonService (Edge Cases)", () => {
  let service: PersonService;
  let personRepo: any;
  let relRepo: any;

  beforeEach(async () => {
    personRepo = mockRepo();
    relRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonService,
        { provide: getRepositoryToken(Person), useValue: personRepo },
        { provide: getRepositoryToken(Relationship), useValue: relRepo },
      ],
    }).compile();

    service = module.get<PersonService>(PersonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getKinshipRelation", () => {
    it("should return self relationship when same person", async () => {
      relRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.getKinshipRelation("p1", "p1");

      expect(result.relationship).toBe("self");
      expect(result.path).toEqual([]);
    });

    it("should return null relationship when no path exists", async () => {
      const persons = [mockPerson({ id: "a" }), mockPerson({ id: "b" })];
      relRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);
      // Mock findOne to return persons? Actually the method uses find to get all persons? Let's see implementation: it fetches all persons then builds graph. It uses personRepo.find({ select: ['id'] }). So we need to mock that.
      personRepo.find.mockResolvedValue(persons);

      const result = await service.getKinshipRelation("a", "b");

      expect(result.relationship).toBeNull();
      expect(result.path).toEqual([]);
    });

    it("should return grandparent relationship with path", async () => {
      const persons = [
        mockPerson({ id: "a" }),
        mockPerson({ id: "b" }),
        mockPerson({ id: "c" }),
      ];
      const relationships = [
        mockRelationship({
          person_a: "a",
          person_b: "b",
          type: "biological_child" as RelationshipType,
        }),
        mockRelationship({
          person_a: "b",
          person_b: "c",
          type: "biological_child" as RelationshipType,
        }),
      ];
      personRepo.find.mockResolvedValue(persons);
      relRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(relationships),
      } as any);

      const result = await service.getKinshipRelation("a", "c");

      expect(result.relationship).toBe("biological_child");
      expect(result.path.length).toBeGreaterThan(0);
    });
  });

  describe("getLineageTree", () => {
    it("should throw NotFoundException when root person not found", async () => {
      personRepo.findOne.mockResolvedValue(null);

      await expect(service.getLineageTree("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return tree with empty children when no relationships", async () => {
      const root = mockPerson({ id: "root" });
      personRepo.findOne.mockResolvedValue(root);
      // Mock relationship query builder to return empty arrays for both children and spouse queries
      relRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.getLineageTree("root");

      expect(result.person.id).toBe("root");
      expect(result.children).toEqual([]);
      expect(result.spouses).toEqual([]);
    });

    it("should return tree with children when relationships exist", async () => {
      const root = mockPerson({ id: "root" });
      const child = mockPerson({ id: "child" });
      personRepo.findOne
        .mockResolvedValueOnce(root) // getLineageTree root fetch
        .mockResolvedValueOnce(root) // buildTree root fetch
        .mockResolvedValueOnce(child) // buildTree child fetch
        .mockResolvedValueOnce(null); // deeper calls

      // Children query for root returns relationship to child
      const childrenQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            person_b: child.id,
            type: "biological_child" as RelationshipType,
          },
        ]),
      };
      // Spouse query for root returns empty
      const spouseQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      // All subsequent queries (child's children, child's spouse) return empty
      const emptyQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      relRepo.createQueryBuilder
        .mockReturnValueOnce(childrenQb as any)
        .mockReturnValueOnce(spouseQb as any)
        .mockReturnValue(emptyQb as any);

      const result = await service.getLineageTree("root");

      expect(result.person.id).toBe("root");
      expect(result.children).toHaveLength(1);
      expect(result.children[0].person.id).toBe("child");
      // Child's children should be empty
      expect(result.children[0].children).toEqual([]);
    });
  });

  describe("batchDelete", () => {
    it("should return errors for IDs that do not exist", async () => {
      personRepo.findOne
        .mockResolvedValueOnce(mockPerson({ id: "id1" }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockPerson({ id: "id3" }));
      personRepo.remove.mockResolvedValue({} as any);

      const result = await service.batchDelete(["id1", "id2", "id3"]);

      expect(result.deleted).toBe(2);
      expect(
        result.errors.some((e) => e.includes("id2") && e.includes("not found")),
      ).toBe(true);
    });
  });

  describe("batchUpdate", () => {
    it("should skip non-existent persons and update valid ones", async () => {
      personRepo.findOne
        .mockResolvedValueOnce(mockPerson({ id: "id1" }))
        .mockResolvedValueOnce(null);
      personRepo.save.mockResolvedValue({} as any);

      const result = await service.batchUpdate(["id1", "id2"], {
        generation: 5,
      });

      expect(result.updated).toBe(1);
      expect(
        result.errors.some((e) => e.includes("id2") && e.includes("not found")),
      ).toBe(true);
    });
  });

  describe("getStatsByGeneration", () => {
    it("should return empty array when no persons", async () => {
      personRepo.query.mockResolvedValue([]);
      const result = await service.getStatsByGeneration();
      expect(result).toEqual([]);
    });

    it("should aggregate counts by generation", async () => {
      personRepo.query.mockResolvedValue([
        { generation: 1, count: 10 },
        { generation: 2, count: 20 },
      ]);
      const result = await service.getStatsByGeneration();
      expect(result).toEqual([
        { generation: 1, count: 10 },
        { generation: 2, count: 20 },
      ]);
    });
  });

  describe("getAgeDistribution", () => {
    it("should return distribution including unknown when birth_year is null", async () => {
      personRepo.query.mockResolvedValue([
        { age_group: "unknown", count: 5 },
        { age_group: "0-17", count: 3 },
      ]);
      const result = await service.getAgeDistribution();
      expect(result).toEqual([
        { ageGroup: "unknown", count: 5 },
        { ageGroup: "0-17", count: 3 },
      ]);
    });
  });

  describe("findRootPerson", () => {
    it("should return root person when some persons have no parents", async () => {
      const persons = [
        mockPerson({ id: "root1", generation: 2 }),
        mockPerson({ id: "root2", generation: 1 }),
        mockPerson({ id: "child", generation: 3 }),
      ];
      const relationships = [
        {
          person_a: "root1",
          person_b: "child",
          type: "biological_child",
        } as any,
        {
          person_a: "root2",
          person_b: "child",
          type: "biological_child",
        } as any,
      ];
      personRepo.find.mockResolvedValue(persons);
      relRepo.find.mockResolvedValue(relationships);

      const result = await service.findRootPerson();

      expect(result).not.toBeNull();
      expect(result!.generation).toBe(1);
    });

    it("should return null when all persons are children", async () => {
      const persons = [
        mockPerson({ id: "child1" }),
        mockPerson({ id: "child2" }),
      ];
      const relationships = [
        {
          person_a: "parent",
          person_b: "child1",
          type: "biological_child",
        } as any,
        {
          person_a: "parent",
          person_b: "child2",
          type: "biological_child",
        } as any,
      ];
      personRepo.find.mockResolvedValue(persons);
      relRepo.find.mockResolvedValue(relationships);

      const result = await service.findRootPerson();

      expect(result).toBeNull();
    });

    it("should handle empty database", async () => {
      personRepo.find.mockResolvedValue([]);
      relRepo.find.mockResolvedValue([]);

      const result = await service.findRootPerson();

      expect(result).toBeNull();
    });
  });

  describe("import (additional edge cases)", () => {
    it("should handle current_residence null to skip that branch", async () => {
      const personRepo = (service as any).personRepository;
      personRepo.create.mockReturnValue({});
      personRepo.save.mockResolvedValue({ id: "p1" });

      const rawData = [
        {
          full_name: "John",
          gender: "male" as any,
          birth_year: 1990,
          current_residence: null,
        },
      ] as any;

      const result = await service.import(rawData);

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
      // Verify that save was called with an object that does not have current_residence
      const savedArg = personRepo.save.mock.calls[0][0];
      expect(savedArg).not.toHaveProperty("current_residence");
    });
  });

  describe("getLineageTree (depth limit)", () => {
    it("should truncate children when depth exceeds maxDepth", async () => {
      // Setup: root with one child; call with maxDepth=0 so child should be truncated
      const root = mockPerson({ id: "root" });
      const child = mockPerson({ id: "child" });
      personRepo.findOne
        .mockResolvedValueOnce(root) // root fetch
        .mockResolvedValueOnce(root) // buildTree root
        .mockResolvedValueOnce(child); // buildTree child (depth=1)

      // Children query for root returns relationship to child
      const childrenQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            { person_b: child.id, type: "biological_child" as any },
          ]),
      };
      // Spouse query returns empty
      const emptyQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      relRepo.createQueryBuilder
        .mockReturnValueOnce(childrenQb as any)
        .mockReturnValueOnce(emptyQb as any)
        .mockReturnValue(emptyQb as any);

      const result = await service.getLineageTree("root", 0);

      expect(result.person.id).toBe("root");
      expect(result.children).toHaveLength(1);
      // Child should have empty children because depth limit exceeded
      expect(result.children[0].children).toEqual([]);
      expect(result.children[0].spouses).toEqual([]);
    });
  });
});
