import { Test, TestingModule } from "@nestjs/testing";
import { EventService } from "./event.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Event } from "../entities/event.entity";
import { NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";

type MockRepository = Partial<Record<keyof Repository<Event>, jest.Mock>>;

const mockEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Test Event",
    description: null,
    event_date: new Date(),
    person_id: "person-1",
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  }) as unknown as Event;

const mockRepository = (): MockRepository => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  })),
});

describe("EventService", () => {
  let service: EventService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: getRepositoryToken(Event), useValue: mockRepository() },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    repository = module.get<MockRepository>(getRepositoryToken(Event));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create an event", async () => {
      const createDto = {
        title: "New Event",
        event_date: new Date(),
        person_id: "person-1",
      };
      const savedEvent = mockEvent({ ...createDto, id: "new-id" });
      repository.create!.mockReturnValue(createDto);
      repository.save!.mockResolvedValue(savedEvent);

      const result = await service.create(createDto as any);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(savedEvent);
    });
  });

  describe("findAll", () => {
    it("should return all events with no filters", async () => {
      const events = [mockEvent(), mockEvent({ id: "2" })];
      repository.createQueryBuilder!.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(events),
      } as any);

      const result = await service.findAll();

      expect(result).toEqual(events);
    });

    it("should filter by personId", async () => {
      const events = [mockEvent()];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(events),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findAll("person-1");

      expect(qb.where).toHaveBeenCalledWith("event.person_id = :personId", {
        personId: "person-1",
      });
      expect(result).toEqual(events);
    });

    it("should filter by upcoming", async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      await service.findAll(undefined, true);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "event.event_date >= CURRENT_DATE",
      );
    });

    it("should apply limit", async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      await service.findAll(undefined, false, 5);

      expect(qb.limit).toHaveBeenCalledWith(5);
    });
  });

  describe("findOne", () => {
    it("should throw NotFoundException when event not found", async () => {
      repository.findOne!.mockResolvedValue(null);
      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return event when found", async () => {
      const event = mockEvent();
      repository.findOne!.mockResolvedValue(event);

      const result = await service.findOne(event.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: event.id },
      });
      expect(result).toBe(event);
    });
  });

  describe("update", () => {
    it("should update an event", async () => {
      const existing = mockEvent();
      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockResolvedValue(existing);

      const updateDto = { title: "Updated Event" };
      const result = await service.update(existing.id, updateDto as any);

      expect(result).toMatchObject(updateDto);
    });

    it("should throw NotFoundException when event not found for update", async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(
        service.update("non-existent", { title: "Update" } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove an event", async () => {
      const event = mockEvent();
      repository.findOne!.mockResolvedValue(event);
      repository.remove!.mockResolvedValue({ success: true } as any);

      const result = await service.remove(event.id);

      expect(repository.remove).toHaveBeenCalledWith(event);
      expect(result).toEqual({ success: true });
    });

    it("should throw NotFoundException when event not found for removal", async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.remove("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("count", () => {
    it("should return total event count", async () => {
      repository.count!.mockResolvedValue(42);
      const result = await service.count();
      expect(result).toEqual({ total: 42 });
    });
  });
});
