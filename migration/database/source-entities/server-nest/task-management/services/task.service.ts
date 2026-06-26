import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Task, TaskStatus, TaskPriority } from "../entities/task.entity";
import { CreateTaskDto } from "../dto/create-task.dto";
import { UpdateTaskDto } from "../dto/update-task.dto";

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create(createTaskDto);
    return this.taskRepository.save(task);
  }

  async findAll(withDeleted = false): Promise<Task[]> {
    return this.taskRepository.find({
      relations: ["creator"],
      withDeleted,
    });
  }

  async findPaged(
    page = 1,
    limit = 20,
    q?: string,
    withDeleted = false,
  ): Promise<{ data: Task[]; total: number; page: number; limit: number }> {
    const qb = this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.creator", "creator");
    if (withDeleted) qb.withDeleted();
    if (q) {
      const isSQLite = process.env.DB_TYPE === "sqlite";
      if (isSQLite) {
        qb.where(
          "LOWER(task.title) LIKE LOWER(:q) OR LOWER(task.description) LIKE LOWER(:q)",
          { q: `%${q}%` },
        );
      } else {
        qb.where("task.title ILIKE :q OR task.description ILIKE :q", {
          q: `%${q}%`,
        });
      }
    }
    const total = await qb.getCount();
    const data = await qb
      .orderBy("task.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return { data, total, page, limit };
  }

  async findOne(id: string, withDeleted = false): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["creator"],
      withDeleted,
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    Object.assign(task, updateTaskDto);
    return this.taskRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);
    await this.taskRepository.softRemove(task);
  }

  async restore(id: string): Promise<void> {
    await this.taskRepository.restore(id);
  }

  async findByStatus(status: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { status: status as TaskStatus },
      relations: ["creator"],
    });
  }

  async findByCreator(creatorId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { creatorId },
      relations: ["creator"],
    });
  }

  async findByPriority(priority: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { priority: priority as TaskPriority },
      relations: ["creator"],
    });
  }

  async searchTasks(query?: string): Promise<Task[]> {
    if (!query) {
      return [];
    }

    // For SQLite compatibility, use LOWER() and LIKE
    // For PostgreSQL, we could use ILIKE
    const isSQLite = process.env.DB_TYPE === "sqlite";

    if (isSQLite) {
      return this.taskRepository
        .createQueryBuilder("task")
        .leftJoinAndSelect("task.creator", "creator")
        .where(
          "LOWER(task.title) LIKE LOWER(:query) OR LOWER(task.description) LIKE LOWER(:query)",
          {
            query: `%${query}%`,
          },
        )
        .getMany();
    } else {
      // For PostgreSQL
      return this.taskRepository
        .createQueryBuilder("task")
        .leftJoinAndSelect("task.creator", "creator")
        .where("task.title ILIKE :query OR task.description ILIKE :query", {
          query: `%${query}%`,
        })
        .getMany();
    }
  }

  async getTaskStatistics(): Promise<any> {
    const totalTasks = await this.taskRepository.count();
    const statusStats = await this.taskRepository
      .createQueryBuilder("task")
      .select("task.status", "status")
      .addSelect("COUNT(task.id)", "count")
      .groupBy("task.status")
      .getRawMany();

    const priorityStats = await this.taskRepository
      .createQueryBuilder("task")
      .select("task.priority", "priority")
      .addSelect("COUNT(task.id)", "count")
      .groupBy("task.priority")
      .getRawMany();

    const statusBreakdown = statusStats.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count, 10);
      return acc;
    }, {});

    const priorityBreakdown = priorityStats.reduce((acc, item) => {
      acc[item.priority] = parseInt(item.count, 10);
      return acc;
    }, {});

    return {
      totalTasks,
      statusBreakdown,
      priorityBreakdown,
    };
  }

  async getTasksByDateRange(startDate: Date, endDate: Date): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.creator", "creator")
      .where("task.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();
  }

  async getOverdueTasks(): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.creator", "creator")
      .where("task.dueDate < :now AND task.status != :completed", {
        now: new Date(),
        completed: "completed",
      })
      .getMany();
  }

  async getUpcomingTasks(days: number = 7): Promise<Task[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.creator", "creator")
      .where("task.dueDate BETWEEN :now AND :futureDate", {
        now,
        futureDate,
      })
      .andWhere("task.status != :completed", { completed: "completed" })
      .getMany();
  }
}
