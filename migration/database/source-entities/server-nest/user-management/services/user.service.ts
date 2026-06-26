import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { CreateUserDto } from "../dto/create-user.dto";
import { hash, compare } from "bcrypt";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user with this email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await hash(createUserDto.password, 10);

    // Create user
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async findAll(withDeleted = false): Promise<User[]> {
    return this.userRepository.find({ withDeleted });
  }

  async findPaged(
    page = 1,
    limit = 20,
    q?: string,
    withDeleted = false,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const qb = this.userRepository.createQueryBuilder("user");
    if (withDeleted) qb.withDeleted();
    if (q) {
      const isSQLite = process.env.DB_TYPE === "sqlite";
      if (isSQLite) {
        qb.where(
          "LOWER(user.firstName) LIKE LOWER(:q) OR LOWER(user.lastName) LIKE LOWER(:q) OR LOWER(user.email) LIKE LOWER(:q)",
          { q: `%${q}%` },
        );
      } else {
        qb.where(
          "user.firstName ILIKE :q OR user.lastName ILIKE :q OR user.email ILIKE :q",
          { q: `%${q}%` },
        );
      }
    }
    const total = await qb.getCount();
    const data = await qb
      .orderBy("user.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return { data, total, page, limit };
  }

  async findOne(id: string, withDeleted = false): Promise<User> {
    console.log(
      "UserService - findOne gọi với ID:",
      id,
      "withDeleted:",
      withDeleted,
    );
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted,
    });
    if (!user) {
      console.log(
        "UserService - Không tìm thấy user với ID:",
        id,
        "withDeleted:",
        withDeleted,
      );
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    console.log(
      "UserService - Tìm thấy user:",
      user.id,
      "status:",
      user.status,
      "deletedAt:",
      user.deletedAt,
    );
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async validatePassword(candidate: string, hashed: string): Promise<boolean> {
    return await compare(candidate, hashed);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findOne(id);
    if (data.password) {
      data.password = await hash(data.password, 10);
    }
    Object.assign(user, data);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.softRemove(user);
  }

  async restore(id: string): Promise<void> {
    await this.userRepository.restore(id);
  }
}
