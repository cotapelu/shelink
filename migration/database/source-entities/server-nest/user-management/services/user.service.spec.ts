import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "./user.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User, UserRole, UserStatus } from "../entities/user.entity";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import bcrypt from "bcrypt";

jest.mock("bcrypt");

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: "user-id-1",
    email: "test@example.com",
    password: "hashed_password",
    firstName: "John",
    lastName: "Doe",
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    phone: "1234567890",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }) as unknown as User;

const mockRepository = (): Partial<
  Record<keyof Repository<User>, jest.Mock>
> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softRemove: jest.fn(),
  restore: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    withDeleted: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
  })),
});

describe("UserService", () => {
  let service: UserService;
  let repository: Partial<Record<keyof Repository<User>, jest.Mock>>;

  beforeEach(async () => {
    // Configure bcrypt mocks
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockRepository() },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Partial<Record<keyof Repository<User>, jest.Mock>>>(
      getRepositoryToken(User),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new user with hashed password", async () => {
      const createDto = {
        email: "new@example.com",
        password: "password123",
        firstName: "New",
        lastName: "User",
      };

      repository.findOne!.mockResolvedValue(null);
      repository.create!.mockReturnValue({
        ...createDto,
        password: "hashed_password",
      });
      repository.save!.mockResolvedValue(
        mockUser({
          email: createDto.email,
          firstName: createDto.firstName,
          lastName: createDto.lastName,
        }),
      );

      const result = await service.create(createDto as any);

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createDto.email,
          password: "hashed_password",
        }),
      );
      expect(result.email).toBe(createDto.email);
    });

    it("should throw BadRequestException if email already exists", async () => {
      repository.findOne!.mockResolvedValue(mockUser());

      await expect(
        service.create({
          email: "test@example.com",
          password: "pass",
          firstName: "x",
          lastName: "y",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAll", () => {
    it("should return all users", async () => {
      const users = [mockUser(), mockUser({ id: "2" })];
      repository.find!.mockResolvedValue(users);

      const result = await service.findAll(false);

      expect(repository.find).toHaveBeenCalledWith({ withDeleted: false });
      expect(result).toEqual(users);
    });

    it("should include deleted users when withDeleted is true", async () => {
      const users = [mockUser()];
      repository.find!.mockResolvedValue(users);

      await service.findAll(true);

      expect(repository.find).toHaveBeenCalledWith({ withDeleted: true });
    });
  });

  describe("findPaged", () => {
    it("should return paginated users", async () => {
      const users = [mockUser()];
      const total = 1;
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(users),
        getCount: jest.fn().mockResolvedValue(total),
        withDeleted: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findPaged(1, 10);

      expect(result).toEqual({ data: users, total: 1, page: 1, limit: 10 });
    });

    it("should return paginated users with query (non-sqlite)", async () => {
      const users = [mockUser()];
      const total = 1;
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(users),
        getCount: jest.fn().mockResolvedValue(total),
        withDeleted: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findPaged(1, 10, "test", false);

      expect(qb.where).toHaveBeenCalledWith(
        "user.firstName ILIKE :q OR user.lastName ILIKE :q OR user.email ILIKE :q",
        { q: "%test%" },
      );
      expect(result).toEqual({ data: users, total: 1, page: 1, limit: 10 });
    });

    it("should return paginated users with query and sqlite", async () => {
      const users = [mockUser()];
      const total = 1;
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(users),
        getCount: jest.fn().mockResolvedValue(total),
        withDeleted: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);
      process.env.DB_TYPE = "sqlite";

      const result = await service.findPaged(1, 10, "test", false);

      expect(qb.where).toHaveBeenCalledWith(
        "LOWER(user.firstName) LIKE LOWER(:q) OR LOWER(user.lastName) LIKE LOWER(:q) OR LOWER(user.email) LIKE LOWER(:q)",
        { q: "%test%" },
      );
      expect(result).toEqual({ data: users, total: 1, page: 1, limit: 10 });

      process.env.DB_TYPE = undefined;
    });

    it("should return paginated users with withDeleted true", async () => {
      const users = [mockUser()];
      const total = 1;
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(users),
        getCount: jest.fn().mockResolvedValue(total),
        withDeleted: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findPaged(1, 10, undefined, true);

      expect(qb.withDeleted).toHaveBeenCalled();
      expect(result).toEqual({ data: users, total: 1, page: 1, limit: 10 });
    });
  });

  describe("findOne", () => {
    it("should return a user by id", async () => {
      const user = mockUser();
      repository.findOne!.mockResolvedValue(user);

      const result = await service.findOne(user.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
        withDeleted: false,
      });
      expect(result).toBe(user);
    });

    it("should throw NotFoundException if user not found", async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByEmail", () => {
    it("should return user by email", async () => {
      const user = mockUser();
      repository.findOne!.mockResolvedValue(user);

      const result = await service.findByEmail(user.email);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: user.email },
      });
      expect(result).toBe(user);
    });

    it("should throw NotFoundException if email not found", async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findByEmail("missing@example.com")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update user fields", async () => {
      const existing = mockUser();
      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockResolvedValue(existing);

      const updateDto = { firstName: "UpdatedFirst", lastName: "UpdatedLast" };
      const result = await service.update(existing.id, updateDto);

      expect(result.firstName).toBe("UpdatedFirst");
      expect(result.lastName).toBe("UpdatedLast");
    });

    it("should hash password when updating password", async () => {
      const existing = mockUser();
      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockResolvedValue(existing);

      const updateDto = { password: "newpass" };
      await service.update(existing.id, updateDto);

      expect(bcrypt.hash).toHaveBeenCalledWith("newpass", 10);
    });

    it("should throw NotFoundException when updating non-existent user", async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(
        service.update("non-existent", { firstName: "X" } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should soft delete a user", async () => {
      const user = mockUser();
      repository.findOne!.mockResolvedValue(user);
      repository.softRemove!.mockResolvedValue(user);

      await service.remove(user.id);

      expect(repository.softRemove).toHaveBeenCalledWith(user);
    });
  });

  describe("restore", () => {
    it("should restore a soft-deleted user", async () => {
      repository.restore!.mockResolvedValue({});

      await service.restore("123");

      expect(repository.restore).toHaveBeenCalledWith("123");
    });
  });

  describe("validatePassword", () => {
    it("should return true for correct password", async () => {
      const result = await service.validatePassword(
        "correct",
        "hashed_password",
      );

      expect(bcrypt.compare).toHaveBeenCalledWith("correct", "hashed_password");
      expect(result).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const result = await service.validatePassword("wrong", "hashed_password");

      expect(result).toBe(false);
    });
  });

  // Additional tests for missing default parameter branches
  describe("Default parameter coverage", () => {
    it("should use default withDeleted=false when findAll called with no arguments", async () => {
      const users = [mockUser()];
      repository.find!.mockResolvedValue(users);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ withDeleted: false });
      expect(result).toEqual(users);
    });

    it("should use default page=1, limit=20, q=undefined, withDeleted=false when findPaged called with no arguments", async () => {
      const users = [mockUser()];
      const total = 1;
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(users),
        getCount: jest.fn().mockResolvedValue(total),
        withDeleted: jest.fn().mockReturnThis(),
      };
      repository.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findPaged();

      expect(qb.skip).toHaveBeenCalledWith((1 - 1) * 20);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({ data: users, total: 1, page: 1, limit: 20 });
    });
  });
});
