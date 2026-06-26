import { Test, TestingModule } from "@nestjs/testing";
import { UserController } from "./user.controller";
import { UserService } from "../services/user.service";
import { User, UserRole } from "../entities/user.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: "user-id-1",
    email: "test@example.com",
    password: "hashed_password",
    firstName: "Test",
    lastName: "User",
    role: UserRole.MEMBER,
    status: "active" as any,
    phone: "1234567890",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as unknown as User;

const mockUserService = () => ({
  findAll: jest.fn(), // not used
  findPaged: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  restore: jest.fn(),
  validatePassword: jest.fn(),
  findByEmail: jest.fn(),
});

describe("UserController", () => {
  let controller: UserController;
  let service: ReturnType<typeof mockUserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService() }],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getCurrentUser", () => {
    it("should return user by id", async () => {
      const user = mockUser();
      service.findOne.mockResolvedValue(user);

      const result = await controller.getCurrentUser(user.id as any);

      expect(service.findOne).toHaveBeenCalledWith(user.id);
      expect(result).toBe(user);
    });

    it("should throw NotFoundException when user not found", async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException("User not found"),
      );

      await expect(
        controller.getCurrentUser("non-existent" as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateCurrentUser", () => {
    it("should update user", async () => {
      const user = mockUser();
      service.findOne.mockResolvedValue(user);
      service.update.mockResolvedValue(user);

      const updateDto: UpdateUserDto = { firstName: "Updated" };
      const result = await controller.updateCurrentUser(
        user.id as any,
        updateDto as any,
      );

      expect(service.update).toHaveBeenCalledWith(user.id, updateDto);
      expect(result).toBe(user);
    });

    it("should throw NotFoundException when user not found", async () => {
      service.update.mockRejectedValue(new NotFoundException("User not found"));
      const updateDto: UpdateUserDto = { firstName: "Updated" };
      await expect(
        controller.updateCurrentUser("id" as any, updateDto as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("changePassword", () => {
    it("should succeed with correct password", async () => {
      service.validatePassword.mockResolvedValue(true);
      service.update.mockResolvedValue(mockUser());

      const result = await controller.changePassword(
        "userId",
        "oldpass",
        "newpass",
      );

      expect(service.validatePassword).toHaveBeenCalledWith(
        "userId",
        "oldpass",
      );
      expect(service.update).toHaveBeenCalledWith("userId", {
        password: "newpass",
      });
      expect(result).toEqual({ success: true });
    });

    it("should throw BadRequestException if password invalid", async () => {
      service.validatePassword.mockResolvedValue(false);

      await expect(
        controller.changePassword("userId", "wrong", "newpass"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("create", () => {
    it("should create a user", async () => {
      const createDto: CreateUserDto = {
        email: "new@example.com",
        password: "password123",
        firstName: "New",
        lastName: "User",
      };
      const saved = mockUser({
        email: createDto.email,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
      });
      service.create.mockResolvedValue(saved);

      const result = await controller.create(createDto as any);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(saved);
    });
  });

  describe("findAll", () => {
    it("should return paginated users", async () => {
      const users = [mockUser(), mockUser({ id: "2" })];
      service.findPaged.mockResolvedValue({
        data: users,
        total: 2,
        page: 1,
        limit: 10,
      });

      // withDeletedRaw is string; passing 'false' should become false
      const result = await controller.findAll(1, 10, undefined, "false");

      expect(service.findPaged).toHaveBeenCalledWith(1, 10, undefined, false);
      expect(result).toEqual({ data: users, total: 2, page: 1, limit: 10 });
    });

    it("should treat withDeleted true variants as true", async () => {
      const users = [mockUser()];
      service.findPaged.mockResolvedValue({
        data: users,
        total: 1,
        page: 1,
        limit: 10,
      });

      await controller.findAll(1, 10, undefined, "true");
      expect(service.findPaged).toHaveBeenCalledWith(1, 10, undefined, true);

      await controller.findAll(1, 10, undefined, "1");
      expect(service.findPaged).toHaveBeenCalledWith(1, 10, undefined, true);

      await controller.findAll(1, 10, undefined, "yes");
      expect(service.findPaged).toHaveBeenCalledWith(1, 10, undefined, true);

      await controller.findAll(1, 10, undefined, "on");
      expect(service.findPaged).toHaveBeenCalledWith(1, 10, undefined, true);
    });

    it("should default withDeleted to false when omitted", async () => {
      const users = [mockUser()];
      service.findPaged.mockResolvedValue({
        data: users,
        total: 1,
        page: 1,
        limit: 10,
      });

      await controller.findAll();
      expect(service.findPaged).toHaveBeenCalledWith(1, 20, undefined, false);
    });
  });

  describe("findOne", () => {
    it("should return a user by id", async () => {
      const user = mockUser();
      service.findOne.mockResolvedValue(user);

      const result = await controller.findOne(user.id as any, "false");

      expect(service.findOne).toHaveBeenCalledWith(user.id, false);
      expect(result).toBe(user);
    });

    it("should parse withDeleted true variants", async () => {
      const user = mockUser();
      service.findOne.mockResolvedValue(user);

      await controller.findOne(user.id as any, "true");
      expect(service.findOne).toHaveBeenCalledWith(user.id, true);

      await controller.findOne(user.id as any, "1");
      expect(service.findOne).toHaveBeenCalledWith(user.id, true);

      await controller.findOne(user.id as any, "yes");
      expect(service.findOne).toHaveBeenCalledWith(user.id, true);
    });

    it("should default withDeleted to false when omitted", async () => {
      const user = mockUser();
      service.findOne.mockResolvedValue(user);

      await controller.findOne(user.id as any);
      expect(service.findOne).toHaveBeenCalledWith(user.id, false);
    });
  });

  describe("update", () => {
    it("should update a user", async () => {
      const id = "123";
      const updated = mockUser({ id });
      service.update.mockResolvedValue(updated);

      const updateDto: UpdateUserDto = { lastName: "Changed" };
      const result = await controller.update(id as any, updateDto as any);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toBe(updated);
    });
  });

  describe("remove", () => {
    it("should soft delete a user", async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove("123");

      expect(service.remove).toHaveBeenCalledWith("123");
    });
  });

  describe("restore", () => {
    it("should restore a user", async () => {
      service.restore.mockResolvedValue({ restored: true });

      const result = await controller.restore("123");

      expect(service.restore).toHaveBeenCalledWith("123");
      expect(result).toEqual({ restored: true });
    });
  });

  describe("updateRole", () => {
    it("should update user role", async () => {
      const user = mockUser();
      service.findOne.mockResolvedValue(user);
      service.update.mockResolvedValue(user);

      const result = await controller.updateRole(
        user.id as any,
        UserRole.ADMIN,
      );

      expect(service.update).toHaveBeenCalledWith(user.id, {
        role: UserRole.ADMIN,
      });
      expect(result).toBe(user);
    });

    it("should throw BadRequestException for invalid role", async () => {
      const user = mockUser();
      service.findOne.mockResolvedValue(user);
      const invalidRole = "invalid" as any;
      await expect(
        controller.updateRole(user.id as any, invalidRole),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateStatus", () => {
    it("should update user status based on is_active", async () => {
      const user = mockUser();
      service.findOne.mockResolvedValue(user);
      service.update.mockResolvedValue(user);

      const result = await controller.updateStatus(user.id as any, false);

      expect(service.update).toHaveBeenCalledWith(user.id, {
        status: "inactive" as any,
      });
      expect(result).toBe(user);
    });

    it("should set status to active when is_active is true", async () => {
      const user = mockUser();
      service.findOne.mockResolvedValue(user);
      service.update.mockResolvedValue(user);

      const result = await controller.updateStatus(user.id as any, true);

      expect(service.update).toHaveBeenCalledWith(user.id, {
        status: "active" as any,
      });
      expect(result).toBe(user);
    });
  });
});
