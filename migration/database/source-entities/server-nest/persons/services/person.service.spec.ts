import { Test, TestingModule } from "@nestjs/testing";
import { PersonService } from "./person.service";
import { Person, Gender } from "../entities/person.entity";
import { Repository } from "typeorm";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { CreatePersonDto } from "../dto/create-person.dto";
import { UpdatePersonDto } from "../dto/update-person.dto";

const mockPerson = (overrides: Partial<Person> = {}): Person => ({
  id: "person-id-1",
  full_name: "Test Person",
  gender: "male" as Gender,
  birth_year: 1990,
  birth_month: 5,
  birth_day: 15,
  death_year: null,
  death_month: null,
  death_day: null,
  is_deceased: false,
  is_in_law: false,
  birth_order: 1,
  generation: 1,
  other_names: null,
  avatar_url: null,
  note: null,
  phone_number: null,
  occupation: null,
  current_residence: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const mockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
  })),
  query: jest.fn(),
  count: jest.fn(),
  remove: jest.fn(),
});

describe("PersonService", () => {
  let service: PersonService;
  let personRepository: jest.Mocked<Repository<Person>>;
  let relationshipRepository: jest.Mocked<Repository<any>>;

  beforeEach(async () => {
    personRepository = mockRepository() as any;
    relationshipRepository = mockRepository() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonService,
        { provide: "PersonRepository", useValue: personRepository },
        { provide: "RelationshipRepository", useValue: relationshipRepository },
      ],
    }).compile();

    service = module.get<PersonService>(PersonService);
    // Inject mocks directly
    (service as any).personRepository = personRepository;
    (service as any).relationshipRepository = relationshipRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a person successfully", async () => {
      const createDto: CreatePersonDto = {
        full_name: "New Person",
        gender: "male",
        birth_year: 1985,
      };
      const created = mockPerson({ full_name: createDto.full_name });
      personRepository.create.mockReturnValue(created);
      personRepository.save.mockResolvedValue(created);
      personRepository.findOne.mockResolvedValue(null); // no existing

      const result = await service.create(createDto);

      expect(personRepository.findOne).toHaveBeenCalledWith({
        where: { full_name: createDto.full_name, birth_year: 1985 },
      });
      expect(personRepository.create).toHaveBeenCalledWith(createDto);
      expect(personRepository.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it("should create person without birth_year in uniqueness check", async () => {
      const createDto: CreatePersonDto = {
        full_name: "No Year Person",
        gender: "female",
      };
      const created = mockPerson({
        full_name: createDto.full_name,
        birth_year: null,
      });
      personRepository.create.mockReturnValue(created);
      personRepository.save.mockResolvedValue(created);
      personRepository.findOne.mockResolvedValue(null);

      await service.create(createDto);

      expect(personRepository.findOne).toHaveBeenCalledWith({
        where: { full_name: createDto.full_name },
      });
    });

    it("should throw ConflictException if person exists", async () => {
      const createDto: CreatePersonDto = {
        full_name: "Existing",
        gender: "male",
        birth_year: 1990,
      };
      personRepository.findOne.mockResolvedValue(mockPerson());

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated persons with no filters", async () => {
      const persons = [mockPerson(), mockPerson({ id: "2" })];
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([persons, 2]),
      };
      personRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findAll();

      expect(result).toEqual({
        data: persons,
        total: 2,
        page: 1,
        totalPages: 1,
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        "person.full_name",
        "ASC",
      );
    });

    it("should apply search filter", async () => {
      const persons = [mockPerson()];
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([persons, 1]),
      };
      personRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(1, 10, "test");

      expect(queryBuilder.where).toHaveBeenCalledWith(
        "person.full_name ILIKE :search",
        { search: "%test%" },
      );
    });

    it("should apply all filters correctly", async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      personRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(2, 50, undefined, {
        gender: "female",
        generation: 3,
        minBirthYear: 1990,
        maxBirthYear: 2000,
        isDeceased: true,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "person.gender = :gender",
        { gender: "female" },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "person.generation = :generation",
        { generation: 3 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "person.birth_year >= :minBirthYear",
        { minBirthYear: 1990 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "person.birth_year <= :maxBirthYear",
        { maxBirthYear: 2000 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "person.is_deceased = :isDeceased",
        { isDeceased: true },
      );
    });

    it("should calculate totalPages correctly", async () => {
      const persons = [mockPerson(), mockPerson(), mockPerson()];
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([persons, 25]),
      };
      personRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findAll(1, 10);

      expect(result.totalPages).toBe(3); // 25/10 = 2.5 -> 3
    });
  });

  describe("findOne", () => {
    it("should return a person by id", async () => {
      const person = mockPerson();
      personRepository.findOne.mockResolvedValue(person);

      const result = await service.findOne(person.id);

      expect(personRepository.findOne).toHaveBeenCalledWith({
        where: { id: person.id },
      });
      expect(result).toBe(person);
    });

    it("should throw NotFoundException when person not found", async () => {
      personRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a person", async () => {
      const id = "update-id";
      const existing = mockPerson({ id });
      const updateDto: UpdatePersonDto = { full_name: "Updated" };
      const updated = mockPerson({ id, full_name: updateDto.full_name });

      personRepository.findOne.mockResolvedValue(existing);
      personRepository.save.mockResolvedValue(updated);

      const result = await service.update(id, updateDto);

      expect(result).toBe(updated);
      expect(existing.full_name).toBe(updateDto.full_name);
    });

    it("should throw NotFoundException if person not found", async () => {
      personRepository.findOne.mockResolvedValue(null);

      await expect(service.update("bad-id", {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("should delete a person", async () => {
      const person = mockPerson();
      personRepository.findOne.mockResolvedValue(person);
      personRepository.remove.mockResolvedValue({} as any);

      const result = await service.remove(person.id);

      expect(personRepository.remove).toHaveBeenCalledWith(person);
      expect(result).toEqual({ success: true });
    });

    it("should throw NotFoundException if person not found", async () => {
      personRepository.findOne.mockResolvedValue(null);

      await expect(service.remove("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("batchDelete", () => {
    it("should delete all successfully", async () => {
      const persons = [mockPerson({ id: "1" }), mockPerson({ id: "2" })];
      personRepository.findOne
        .mockResolvedValueOnce(persons[0])
        .mockResolvedValueOnce(persons[1]);

      const result = await service.batchDelete(["1", "2"]);

      expect(result).toEqual({ deleted: 2, errors: [] });
      expect(personRepository.remove).toHaveBeenCalledTimes(2);
    });

    it("should handle partial failures", async () => {
      personRepository.findOne
        .mockResolvedValueOnce(mockPerson({ id: "1" }))
        .mockRejectedValueOnce(new Error("DB error"));

      const result = await service.batchDelete(["1", "2"]);

      expect(result.deleted).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to delete 2");
    });
  });

  describe("batchUpdate", () => {
    it("should update all successfully", async () => {
      const persons = [mockPerson({ id: "1" }), mockPerson({ id: "2" })];
      personRepository.findOne
        .mockResolvedValueOnce(persons[0])
        .mockResolvedValueOnce(persons[1]);

      const updateData = { birth_year: 2000 };
      const result = await service.batchUpdate(["1", "2"], updateData);

      expect(result).toEqual({ updated: 2, errors: [] });
      expect(persons[0].birth_year).toBe(2000);
      expect(persons[1].birth_year).toBe(2000);
    });

    it("should handle partial failures", async () => {
      personRepository.findOne
        .mockResolvedValueOnce(mockPerson({ id: "1" }))
        .mockRejectedValueOnce(new Error("DB error"));

      const result = await service.batchUpdate(["1", "2"], {});

      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("count", () => {
    it("should return total count", async () => {
      personRepository.count.mockResolvedValue(100);

      const result = await service.count();

      expect(result).toEqual({ total: 100 });
    });
  });

  describe("getStatsByGeneration", () => {
    it("should return generation stats", async () => {
      personRepository.query.mockResolvedValue([
        { generation: 1, count: 10 },
        { generation: 2, count: 20 },
      ]);

      const result = await service.getStatsByGeneration();

      expect(personRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("GROUP BY generation"),
      );
      expect(result).toEqual([
        { generation: 1, count: 10 },
        { generation: 2, count: 20 },
      ]);
    });

    it("should handle empty results", async () => {
      personRepository.query.mockResolvedValue([]);

      const result = await service.getStatsByGeneration();

      expect(result).toEqual([]);
    });
  });

  describe("getStatsByGender", () => {
    it("should return gender stats", async () => {
      personRepository.query.mockResolvedValue([
        { gender: "male", count: 15 },
        { gender: "female", count: 20 },
      ]);

      const result = await service.getStatsByGender();

      expect(personRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("GROUP BY gender"),
      );
      expect(result).toEqual([
        { gender: "male", count: 15 },
        { gender: "female", count: 20 },
      ]);
    });
  });

  describe("getAgeDistribution", () => {
    it("should return age distribution", async () => {
      personRepository.query.mockResolvedValue([
        { age_group: "0-17", count: 5 },
        { age_group: "18-30", count: 10 },
      ]);

      const result = await service.getAgeDistribution();

      expect(personRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("CASE"),
      );
      expect(result).toEqual([
        { ageGroup: "0-17", count: 5 },
        { ageGroup: "18-30", count: 10 },
      ]);
    });

    it("should handle unknown age group", async () => {
      personRepository.query.mockResolvedValue([
        { age_group: "unknown", count: 3 },
      ]);

      const result = await service.getAgeDistribution();

      expect(result).toEqual([{ ageGroup: "unknown", count: 3 }]);
    });
  });

  describe("getLineageTree", () => {
    it("should throw if root person not found", async () => {
      personRepository.findOne.mockResolvedValue(null);

      await expect(service.getLineageTree("missing")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should build tree with default maxDepth", async () => {
      const root = mockPerson({ id: "root" });
      personRepository.findOne.mockResolvedValue(root);
      relationshipRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      } as any);

      const result = await service.getLineageTree("root");

      expect(result).toEqual({
        person: root,
        children: [],
        spouses: [],
      });
    });

    it("should respect maxDepth", async () => {
      const root = mockPerson({ id: "root" });
      personRepository.findOne.mockResolvedValue(root);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      };
      relationshipRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getLineageTree("root", 0);

      // With depth 0, we should not go deeper; implementation details may vary
      expect(qb.getMany).toHaveBeenCalled();
    });
  });

  describe("getKinshipRelation", () => {
    it("should return self for same person", async () => {
      const result = await service.getKinshipRelation("same", "same");

      expect(result).toEqual({ relationship: "self", path: [] });
    });

    it("should find direct relationship", async () => {
      const rel = { type: "parent_child", person_a: "a", person_b: "b" };
      relationshipRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([rel]),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      } as any);

      const result = await service.getKinshipRelation("a", "b");

      expect(result.relationship).toBe("parent_child");
      expect(result.path).toHaveLength(1);
    });

    it("should return null relationship if not found", async () => {
      relationshipRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
      } as any);

      const result = await service.getKinshipRelation("a", "b");

      expect(result).toEqual({ relationship: null, path: [] });
    });
  });

  describe("findRootPerson", () => {
    it("should find root person", async () => {
      const allPersons = [
        mockPerson({ id: "1", generation: 3 }),
        mockPerson({ id: "2", generation: null }),
        mockPerson({ id: "3", generation: 1 }),
      ];
      const relationships = [{ type: "biological_child", person_b: "1" }];
      relationshipRepository.find.mockResolvedValue(relationships);
      personRepository.find.mockResolvedValue(allPersons);

      const result = await service.findRootPerson();

      expect(personRepository.find).toHaveBeenCalled();
      // Should return person not in childIds (person '2' and '3' are roots, lowest generation wins)
      expect(result?.id).toBe("3");
    });

    it("should return null if no root found", async () => {
      relationshipRepository.find.mockResolvedValue([]);
      personRepository.find.mockResolvedValue([]);

      const result = await service.findRootPerson();

      expect(result).toBeNull();
    });
  });

  describe("import", () => {
    it("should import multiple valid persons", async () => {
      const personsData = [
        { full_name: "John Doe", gender: "male", birth_year: 1990 },
        { full_name: "Jane Doe", gender: "female", birth_year: 1992 },
      ];
      const savedPersons = personsData.map((data) =>
        mockPerson({ full_name: data.full_name }),
      );
      personRepository.create.mockImplementation((data) => data as any);
      personRepository.save.mockResolvedValue(savedPersons[0]);

      const result = await service.import(personsData as any);

      expect(personRepository.create).toHaveBeenCalledTimes(2);
      expect(personRepository.save).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ imported: 2, errors: [] });
    });

    it("should handle empty import list", async () => {
      const result = await service.import([]);
      expect(result).toEqual({ imported: 0, errors: [] });
    });

    it("should handle partial failures and return errors", async () => {
      const personsData = [
        { full_name: "Valid Person", gender: "male" },
        { full_name: "Invalid Person", gender: "invalid" } as any,
      ];
      personRepository.create.mockImplementation((data) => data as any);
      personRepository.save
        .mockResolvedValueOnce(mockPerson())
        .mockRejectedValueOnce(new Error("Validation failed"));

      const result = await service.import(personsData as any);

      expect(result.imported).toBe(1);
      expect(result.errors[0]).toContain(
        "Failed to import person Invalid Person",
      );
    });

    it("should strip null fields from data", async () => {
      const personsData = [
        {
          full_name: "Test",
          gender: "male",
          birth_year: null,
          phone_number: null,
          other_names: null,
        },
      ] as any;
      personRepository.create.mockImplementation((data) => {
        expect(data).not.toHaveProperty("birth_year");
        expect(data).not.toHaveProperty("phone_number");
        return mockPerson();
      });
      personRepository.save.mockResolvedValue(mockPerson());

      await service.import(personsData);
    });

    it("should handle repository save errors for all items", async () => {
      const personsData = [{ full_name: "John", gender: "male" }] as any;
      personRepository.create.mockReturnValue(mockPerson());
      personRepository.save.mockRejectedValue(new Error("Database error"));

      const result = await service.import(personsData);

      expect(result.imported).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain("Failed to import person John");
    });
  });

  describe("export methods", () => {
    it("should export all persons via exportJSON", async () => {
      const persons = [mockPerson(), mockPerson({ id: "2" })];
      personRepository.find.mockResolvedValue(persons);

      const result = await service.exportJSON();

      expect(personRepository.find).toHaveBeenCalledWith({
        order: { full_name: "ASC" },
      });
      expect(result).toEqual(persons);
    });

    it("should export CSV (same as JSON)", async () => {
      const persons = [mockPerson()];
      personRepository.find.mockResolvedValue(persons);

      const result = await service.exportCSV();

      expect(personRepository.find).toHaveBeenCalledWith({
        order: { full_name: "ASC" },
      });
      expect(result).toEqual(persons);
    });
  });
});
