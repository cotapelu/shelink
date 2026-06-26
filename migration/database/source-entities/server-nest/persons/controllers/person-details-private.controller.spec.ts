import { Test, TestingModule } from "@nestjs/testing";
import { PersonDetailsPrivateController } from "./person-details-private.controller";
import { PersonService } from "@modules/persons/services/person.service";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Person } from "@modules/persons/entities/person.entity";

const mockPersonService = () => ({
  findOne: jest.fn(),
  update: jest.fn(),
});

describe("PersonDetailsPrivateController", () => {
  let controller: PersonDetailsPrivateController;
  let personService: ReturnType<typeof mockPersonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonDetailsPrivateController],
      providers: [{ provide: PersonService, useValue: mockPersonService() }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideProvider(Permissions)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PersonDetailsPrivateController>(
      PersonDetailsPrivateController,
    );
    personService = module.get(PersonService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getPrivateDetails", () => {
    it("should return private fields for an existing person", async () => {
      const mockPerson: Partial<Person> = {
        id: "person-1",
        phone_number: "1234567890",
        occupation: "Engineer",
        current_residence: "Hanoi",
      };
      (personService.findOne as jest.Mock).mockResolvedValue(mockPerson);

      const result = await controller.getPrivateDetails("person-1");

      expect(personService.findOne).toHaveBeenCalledWith("person-1");
      expect(result).toEqual({
        phone_number: "1234567890",
        occupation: "Engineer",
        current_residence: "Hanoi",
      });
    });

    it("should return null fields if not set", async () => {
      const mockPerson: Partial<Person> = {
        id: "person-2",
        phone_number: null,
        occupation: null,
        current_residence: null,
      };
      (personService.findOne as jest.Mock).mockResolvedValue(mockPerson);

      const result = await controller.getPrivateDetails("person-2");

      expect(result).toEqual({
        phone_number: null,
        occupation: null,
        current_residence: null,
      });
    });

    it("should throw if person not found", async () => {
      (personService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.getPrivateDetails("non-existent"),
      ).rejects.toThrow("Person with ID non-existent not found");
    });
  });

  describe("savePrivateDetails", () => {
    it("should update private fields and return them", async () => {
      const mockPerson: Partial<Person> = {
        id: "person-1",
        phone_number: "9876543210",
        occupation: "Doctor",
        current_residence: "Ho Chi Minh City",
      };
      (personService.findOne as jest.Mock).mockResolvedValue(mockPerson);
      (personService.update as jest.Mock).mockResolvedValue(mockPerson);

      const dto = {
        person_id: "person-1",
        phone_number: "9876543210",
        occupation: "Doctor",
        current_residence: "Ho Chi Minh City",
      };

      const result = await controller.savePrivateDetails(dto);

      expect(personService.findOne).toHaveBeenCalledWith("person-1");
      expect(personService.update).toHaveBeenCalledWith("person-1", {
        phone_number: "9876543210",
        occupation: "Doctor",
        current_residence: "Ho Chi Minh City",
      });
      expect(result).toEqual({
        phone_number: "9876543210",
        occupation: "Doctor",
        current_residence: "Ho Chi Minh City",
      });
    });

    it("should handle null values for private fields", async () => {
      const mockPerson: Partial<Person> = {
        id: "person-2",
        phone_number: null,
        occupation: null,
        current_residence: null,
      };
      (personService.findOne as jest.Mock).mockResolvedValue(mockPerson);
      (personService.update as jest.Mock).mockResolvedValue(mockPerson);

      const dto = {
        person_id: "person-2",
        phone_number: null,
        occupation: null,
        current_residence: null,
      };

      const result = await controller.savePrivateDetails(dto);

      expect(personService.update).toHaveBeenCalledWith("person-2", {
        phone_number: null,
        occupation: null,
        current_residence: null,
      });
      expect(result).toEqual({
        phone_number: null,
        occupation: null,
        current_residence: null,
      });
    });

    it("should throw if person_id is missing", async () => {
      const dto = {
        phone_number: "123",
        occupation: "Test",
        current_residence: "Test",
      };

      await expect(controller.savePrivateDetails(dto as any)).rejects.toThrow(
        "person_id is required",
      );
    });

    it("should throw if person not found", async () => {
      const dto = {
        person_id: "non-existent",
        phone_number: "123",
      };
      (personService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.savePrivateDetails(dto)).rejects.toThrow(
        "Person with ID non-existent not found",
      );
    });
  });
});
