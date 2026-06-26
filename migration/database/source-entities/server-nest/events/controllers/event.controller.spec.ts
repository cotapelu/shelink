import { Test, TestingModule } from "@nestjs/testing";
import { EventController } from "./event.controller";
import { EventService } from "../services/event.service";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
// EventDto is not used directly in tests but imported for completeness

type MockEventService = Partial<Record<keyof EventService, jest.Mock>>;

const mockEventService = (): MockEventService => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

describe("EventController", () => {
  let controller: EventController;
  let eventService: MockEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [{ provide: EventService, useValue: mockEventService() }],
    }).compile();

    controller = module.get<EventController>(EventController);
    eventService = module.get<MockEventService>(EventService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create an event", async () => {
      const createDto = {
        title: "New Event",
        event_date: new Date(),
        person_id: "person-1",
      } as any;
      const created = { id: "1", ...createDto } as any;
      eventService.create!.mockResolvedValue(created);

      const result = await controller.create(createDto);

      expect(eventService.create).toHaveBeenCalledWith(createDto);
      expect(result).toBe(created);
    });
  });

  describe("findAll", () => {
    it("should return all events with no filters", async () => {
      const events = [{ id: "1" }, { id: "2" }] as any;
      eventService.findAll!.mockResolvedValue(events);

      const result = await controller.findAll();

      expect(eventService.findAll).toHaveBeenCalledWith(
        undefined,
        false,
        undefined,
      );
      expect(result).toEqual(events);
    });

    it("should pass filters to service", async () => {
      const events = [{ id: "1" }] as any;
      eventService.findAll!.mockResolvedValue(events);

      await controller.findAll("person-1", "true", "10");

      expect(eventService.findAll).toHaveBeenCalledWith("person-1", true, 10);
    });
  });

  describe("findOne", () => {
    it("should return an event by id", async () => {
      const event = { id: "1" } as any;
      eventService.findOne!.mockResolvedValue(event);

      const result = await controller.findOne("1");

      expect(eventService.findOne).toHaveBeenCalledWith("1");
      expect(result).toBe(event);
    });
  });

  describe("update", () => {
    it("should update an event", async () => {
      const updateDto = { title: "Updated" } as any;
      const updated = { id: "1", ...updateDto } as any;
      eventService.update!.mockResolvedValue(updated);

      const result = await controller.update("1", updateDto);

      expect(eventService.update).toHaveBeenCalledWith("1", updateDto);
      expect(result).toBe(updated);
    });
  });

  describe("remove", () => {
    it("should remove an event", async () => {
      eventService.remove!.mockResolvedValue({ success: true });

      const result = await controller.remove("1");

      expect(eventService.remove).toHaveBeenCalledWith("1");
      expect(result).toEqual({ success: true });
    });
  });
});
