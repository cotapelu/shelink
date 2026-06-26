import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  TaskAssignment,
  AssignmentStatus,
} from "../entities/task-assignment.entity";
import { CreateTaskAssignmentDto } from "../dto/create-task-assignment.dto";
import { UpdateTaskAssignmentDto } from "../dto/update-task-assignment.dto";

@Injectable()
export class TaskAssignmentService {
  constructor(
    @InjectRepository(TaskAssignment)
    private readonly taskAssignmentRepository: Repository<TaskAssignment>,
  ) {}

  async create(
    createTaskAssignmentDto: CreateTaskAssignmentDto,
  ): Promise<TaskAssignment> {
    // Check if assignment already exists
    const existingAssignment = await this.taskAssignmentRepository.findOne({
      where: {
        taskId: createTaskAssignmentDto.taskId,
        assigneeId: createTaskAssignmentDto.assigneeId,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException("Task is already assigned to this user");
    }

    // Create entity
    const taskAssignment = this.taskAssignmentRepository.create(
      createTaskAssignmentDto,
    );

    // Manually set the relations to ensure foreign keys are populated
    // This is a workaround for TypeORM's handling of relations
    (taskAssignment as any).task = { id: createTaskAssignmentDto.taskId };
    (taskAssignment as any).assigner = {
      id: createTaskAssignmentDto.assignerId,
    };
    (taskAssignment as any).assignee = {
      id: createTaskAssignmentDto.assigneeId,
    };

    return this.taskAssignmentRepository.save(taskAssignment);
  }

  async findAll(withDeleted = false): Promise<TaskAssignment[]> {
    return this.taskAssignmentRepository.find({
      relations: ["task", "assigner", "assignee"],
      withDeleted,
    });
  }

  async findPaged(
    page = 1,
    limit = 20,
    withDeleted = false,
  ): Promise<{
    data: TaskAssignment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.taskAssignmentRepository
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.task", "task")
      .leftJoinAndSelect("assignment.assigner", "assigner")
      .leftJoinAndSelect("assignment.assignee", "assignee");
    if (withDeleted) qb.withDeleted();
    const total = await qb.getCount();
    const data = await qb
      .orderBy("assignment.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return { data, total, page, limit };
  }

  async findOne(id: string, withDeleted = false): Promise<TaskAssignment> {
    const taskAssignment = await this.taskAssignmentRepository.findOne({
      where: { id },
      relations: ["task", "assigner", "assignee"],
      withDeleted,
    });
    if (!taskAssignment) {
      throw new NotFoundException(`Task assignment with ID ${id} not found`);
    }
    return taskAssignment;
  }

  async update(
    id: string,
    updateTaskAssignmentDto: UpdateTaskAssignmentDto,
  ): Promise<TaskAssignment> {
    const taskAssignment = await this.findOne(id);
    Object.assign(taskAssignment, updateTaskAssignmentDto);
    return this.taskAssignmentRepository.save(taskAssignment);
  }

  async remove(id: string): Promise<void> {
    const taskAssignment = await this.findOne(id);
    await this.taskAssignmentRepository.softRemove(taskAssignment);
  }

  async restore(id: string): Promise<void> {
    await this.taskAssignmentRepository.restore(id);
  }

  async findByTaskId(taskId: string): Promise<TaskAssignment[]> {
    return this.taskAssignmentRepository.find({
      where: { taskId },
      relations: ["task", "assigner", "assignee"],
    });
  }

  async findByAssigneeId(assigneeId: string): Promise<TaskAssignment[]> {
    return this.taskAssignmentRepository.find({
      where: { assigneeId },
      relations: ["task", "assigner", "assignee"],
    });
  }

  async findByAssignerId(assignerId: string): Promise<TaskAssignment[]> {
    return this.taskAssignmentRepository.find({
      where: { assignerId },
      relations: ["task", "assigner", "assignee"],
    });
  }

  async findByStatus(status: string): Promise<TaskAssignment[]> {
    return this.taskAssignmentRepository.find({
      where: { status: status as AssignmentStatus },
      relations: ["task", "assigner", "assignee"],
    });
  }

  async getOverdueAssignments(): Promise<TaskAssignment[]> {
    return this.taskAssignmentRepository
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.task", "task")
      .leftJoinAndSelect("assignment.assigner", "assigner")
      .leftJoinAndSelect("assignment.assignee", "assignee")
      .where("assignment.dueDate < :now AND assignment.status != :completed", {
        now: new Date(),
        completed: "completed",
      })
      .getMany();
  }

  async getPendingAssignments(): Promise<TaskAssignment[]> {
    return this.taskAssignmentRepository.find({
      where: { status: AssignmentStatus.PENDING },
      relations: ["task", "assigner", "assignee"],
    });
  }

  async getAssignmentsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<TaskAssignment[]> {
    return this.taskAssignmentRepository
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.task", "task")
      .leftJoinAndSelect("assignment.assigner", "assigner")
      .leftJoinAndSelect("assignment.assignee", "assignee")
      .where("assignment.assignedAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();
  }

  async getUpcomingAssignments(days: number = 7): Promise<TaskAssignment[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.taskAssignmentRepository
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.task", "task")
      .leftJoinAndSelect("assignment.assigner", "assigner")
      .leftJoinAndSelect("assignment.assignee", "assignee")
      .where("assignment.dueDate BETWEEN :now AND :futureDate", {
        now,
        futureDate,
      })
      .andWhere("assignment.status != :completed", { completed: "completed" })
      .getMany();
  }

  async getAssignmentStatistics(): Promise<any> {
    const totalAssignments = await this.taskAssignmentRepository.count();
    const stats = await this.taskAssignmentRepository
      .createQueryBuilder("assignment")
      .select("assignment.status", "status")
      .addSelect("COUNT(assignment.id)", "count")
      .groupBy("assignment.status")
      .getRawMany();

    const statusBreakdown = stats.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count, 10);
      return acc;
    }, {});

    return {
      totalAssignments,
      statusBreakdown,
    };
  }

  async getAssignmentsByTaskIds(taskIds: string[]): Promise<TaskAssignment[]> {
    return this.taskAssignmentRepository
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.task", "task")
      .leftJoinAndSelect("assignment.assigner", "assigner")
      .leftJoinAndSelect("assignment.assignee", "assignee")
      .where("assignment.taskId IN (:...taskIds)", { taskIds })
      .getMany();
  }
}
