import { Test, TestingModule } from "@nestjs/testing";
import { RelationshipService } from "./relationship.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Relationship } from "../entities/relationship.entity";
import { CreateRelationshipDto } from "../dto/create-relationship.dto";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { Repository } from "typeorm";

type MockRepository = Partial<
  Record<keyof Repository<Relationship>, jest.Mock>
>;

const mockRelationship = (
  overrides: Partial<Relationship> = {},
): Relationship =>
  ({
    id: "rel-1",
    person_a: "person-1",
    person_b: "person-2",
    type: "marriage",
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  }) as unknown as Relationship;

const mockRepository = (): MockRepository => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
});

describe("RelationshipService", () => {
  let service: RelationshipService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationshipService,
        {
          provide: getRepositoryToken(Relationship),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<RelationshipService>(RelationshipService);
    repository = module.get<MockRepository>(getRepositoryToken(Relationship));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a relationship", async () => {
      const createDto: CreateRelationshipDto = {
        person_a: "person-1",
        person_b: "person-2",
        type: "marriage",
      };
      const saved = mockRelationship({ ...createDto, id: "new-id" });
      repository.create!.mockReturnValue(createDto);
      repository.save!.mockResolvedValue(saved);
      repository.findOne!.mockResolvedValue(null); // no existing

      const result = await service.create(createDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { person_a: "person-1", person_b: "person-2", type: "marriage" },
      });
      expect(repository.save).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(saved);
    });

    it("should throw ForbiddenException when relationship already exists", async () => {
      const existing = mockRelationship();
      repository.findOne!.mockResolvedValue(existing);

      const createDto: CreateRelationshipDto = {
        person_a: "person-1",
        person_b: "person-2",
        type: "marriage",
      };

      await expect(service.create(createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("findAllByPerson", () => {
    it("should return relationships for a person", async () => {
      const relationships = [mockRelationship(), mockRelationship({ id: "2" })];
      repository.find!.mockResolvedValue(relationships);

      const result = await service.findAllByPerson("person-1");

      expect(repository.find).toHaveBeenCalledWith({
        where: [{ person_a: "person-1" }, { person_b: "person-1" }],
        relations: ["personA", "personB"],
        order: { created_at: "DESC" },
      });
      expect(result).toEqual(relationships);
    });
  });

  describe("findOne", () => {
    it("should return a relationship by id", async () => {
      const rel = mockRelationship();
      repository.findOne!.mockResolvedValue(rel);

      const result = await service.findOne(rel.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: rel.id },
        relations: ["personA", "personB"],
      });
      expect(result).toBe(rel);
    });

    it("should throw NotFoundException when relationship not found", async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("should remove a relationship", async () => {
      const rel = mockRelationship();
      repository.findOne!.mockResolvedValue(rel);
      repository.remove!.mockResolvedValue({ success: true } as any);

      const result = await service.remove(rel.id);

      expect(repository.remove).toHaveBeenCalledWith(rel);
      expect(result).toEqual({ success: true });
    });
  });

  describe("removeByPersons", () => {
    it("should remove relationship by person IDs without type", async () => {
      const rel = mockRelationship();
      repository.findOne!.mockResolvedValue(rel);
      repository.remove!.mockResolvedValue({ success: true } as any);

      const result = await service.removeByPersons("person-1", "person-2");

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { person_a: "person-1", person_b: "person-2" },
      });
      expect(result).toEqual({ success: true });
    });

    it("should remove relationship by person IDs with type", async () => {
      const rel = mockRelationship();
      repository.findOne!.mockResolvedValue(rel);
      repository.remove!.mockResolvedValue({ success: true } as any);

      const result = await service.removeByPersons(
        "person-1",
        "person-2",
        "marriage",
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { person_a: "person-1", person_b: "person-2", type: "marriage" },
      });
      expect(result).toEqual({ success: true });
    });

    it("should return success even if no relationship found", async () => {
      repository.findOne!.mockResolvedValue(null);

      const result = await service.removeByPersons("person-1", "person-2");

      expect(repository.remove).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("should return success even if no relationship found with type", async () => {
      repository.findOne!.mockResolvedValue(null);

      const result = await service.removeByPersons(
        "person-1",
        "person-2",
        "marriage",
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { person_a: "person-1", person_b: "person-2", type: "marriage" },
      });
      expect(repository.remove).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe("count", () => {
    it("should return total count", async () => {
      repository.count!.mockResolvedValue(42);
      const result = await service.count();
      expect(result).toEqual({ total: 42 });
    });
  });
});
