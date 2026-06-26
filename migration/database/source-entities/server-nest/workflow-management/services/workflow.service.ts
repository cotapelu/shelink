import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Workflow, WorkflowStatus } from "../entities/workflow.entity";
import { CreateWorkflowDto } from "../dto/create-workflow.dto";
import { UpdateWorkflowDto } from "../dto/update-workflow.dto";
import { WorkflowStepDto } from "../dto/workflow-step.dto";

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
  ) {}

  private parseSteps(steps: any): any[] {
    if (typeof steps === "string") {
      try {
        return JSON.parse(steps);
      } catch (_e) {
        return [];
      }
    }
    return steps || [];
  }

  async create(createWorkflowDto: CreateWorkflowDto): Promise<Workflow> {
    // Validate steps
    if (!createWorkflowDto.steps || createWorkflowDto.steps.length === 0) {
      throw new BadRequestException("Workflow must have at least one step");
    }

    // Ensure each step has id, name, and numeric order
    for (const step of createWorkflowDto.steps) {
      if (
        !step ||
        typeof step.id !== "string" ||
        typeof step.name !== "string"
      ) {
        throw new BadRequestException(
          "Each workflow step must have id and name",
        );
      }
      if (
        typeof (step as any).order !== "number" ||
        isNaN((step as any).order)
      ) {
        throw new BadRequestException(
          "Each workflow step must have a numeric 'order'",
        );
      }
    }

    // Validate step orders are unique
    const stepOrders = createWorkflowDto.steps.map((step) => step.order);
    const uniqueOrders = new Set(stepOrders);
    if (uniqueOrders.size !== stepOrders.length) {
      throw new BadRequestException("Workflow step orders must be unique");
    }

    const workflow = this.workflowRepository.create(createWorkflowDto);
    return this.workflowRepository.save(workflow);
  }

  async findAll(withDeleted = false): Promise<Workflow[]> {
    return this.workflowRepository.find({
      relations: ["owner"],
      withDeleted,
    });
  }

  async findPaged(
    page = 1,
    limit = 20,
    withDeleted = false,
  ): Promise<{ data: Workflow[]; total: number; page: number; limit: number }> {
    const qb = this.workflowRepository
      .createQueryBuilder("workflow")
      .leftJoinAndSelect("workflow.owner", "owner");
    if (withDeleted) qb.withDeleted();
    const total = await qb.getCount();
    const data = await qb
      .orderBy("workflow.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return { data, total, page, limit };
  }

  async findOne(id: string, withDeleted = false): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id },
      relations: ["owner"],
      withDeleted,
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return workflow;
  }

  async update(
    id: string,
    updateWorkflowDto: UpdateWorkflowDto,
  ): Promise<Workflow> {
    const workflow = await this.findOne(id);

    // Validate steps if provided
    if (updateWorkflowDto.steps) {
      if (updateWorkflowDto.steps.length === 0) {
        throw new BadRequestException("Workflow must have at least one step");
      }

      const stepOrders = updateWorkflowDto.steps.map((step) => step.order);
      const uniqueOrders = new Set(stepOrders);
      if (uniqueOrders.size !== stepOrders.length) {
        throw new BadRequestException("Workflow step orders must be unique");
      }
    }

    Object.assign(workflow, updateWorkflowDto);
    return this.workflowRepository.save(workflow);
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowRepository.softRemove(workflow);
  }

  async restore(id: string): Promise<void> {
    await this.workflowRepository.restore(id);
  }

  async findByOwnerId(ownerId: string): Promise<Workflow[]> {
    return this.workflowRepository.find({
      where: { ownerId },
      relations: ["owner"],
    });
  }

  async findByStatus(status: string): Promise<Workflow[]> {
    return this.workflowRepository.find({
      where: { status: status as WorkflowStatus },
      relations: ["owner"],
    });
  }

  async findByCategory(category: string): Promise<Workflow[]> {
    return this.workflowRepository.find({
      where: { category },
      relations: ["owner"],
    });
  }

  async searchWorkflows(query: string): Promise<Workflow[]> {
    const isSQLite = process.env.DB_TYPE === "sqlite";
    if (isSQLite) {
      return this.workflowRepository
        .createQueryBuilder("workflow")
        .leftJoinAndSelect("workflow.owner", "owner")
        .where(
          "LOWER(workflow.name) LIKE LOWER(:query) OR LOWER(workflow.description) LIKE LOWER(:query)",
          {
            query: `%${query}%`,
          },
        )
        .getMany();
    } else {
      return this.workflowRepository
        .createQueryBuilder("workflow")
        .leftJoinAndSelect("workflow.owner", "owner")
        .where(
          "workflow.name ILIKE :query OR workflow.description ILIKE :query",
          {
            query: `%${query}%`,
          },
        )
        .getMany();
    }
  }

  async getWorkflowStatistics(): Promise<any> {
    const totalWorkflows = await this.workflowRepository.count();
    const stats = await this.workflowRepository
      .createQueryBuilder("workflow")
      .select("workflow.status", "status")
      .addSelect("COUNT(workflow.id)", "count")
      .groupBy("workflow.status")
      .getRawMany();

    const statusBreakdown = stats.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count, 10);
      return acc;
    }, {});

    return {
      totalWorkflows,
      statusBreakdown,
    };
  }

  async getWorkflowsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Workflow[]> {
    return this.workflowRepository
      .createQueryBuilder("workflow")
      .leftJoinAndSelect("workflow.owner", "owner")
      .where("workflow.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();
  }

  async getActiveWorkflows(): Promise<Workflow[]> {
    return this.workflowRepository.find({
      where: { status: WorkflowStatus.ACTIVE },
      relations: ["owner"],
    });
  }

  async getArchivedWorkflows(): Promise<Workflow[]> {
    return this.workflowRepository.find({
      where: { status: WorkflowStatus.ARCHIVED },
      relations: ["owner"],
    });
  }

  async getWorkflowsWithTaskCount(): Promise<any[]> {
    return this.workflowRepository
      .createQueryBuilder("workflow")
      .leftJoinAndSelect("workflow.owner", "owner")
      .leftJoin("workflow.tasks", "task")
      .select("workflow.id", "id")
      .addSelect("workflow.name", "name")
      .addSelect("workflow.status", "status")
      .addSelect("COUNT(task.id)", "taskCount")
      .groupBy("workflow.id, workflow.name, workflow.status")
      .orderBy("taskCount", "DESC")
      .getRawMany();
  }

  async getWorkflowSteps(id: string): Promise<any[]> {
    const workflow = await this.findOne(id);
    const steps = this.parseSteps(workflow.steps);
    return steps.sort((a, b) => a.order - b.order);
  }

  async addWorkflowStep(id: string, step: WorkflowStepDto): Promise<Workflow> {
    const workflow = await this.findOne(id);
    const steps = this.parseSteps(workflow.steps);
    steps.push(step);
    workflow.steps = steps;
    return this.workflowRepository.save(workflow);
  }

  async updateWorkflowStep(
    id: string,
    stepId: string,
    step: WorkflowStepDto,
  ): Promise<Workflow> {
    const workflow = await this.findOne(id);
    const steps = this.parseSteps(workflow.steps);
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      throw new NotFoundException(
        `Step with ID ${stepId} not found in workflow`,
      );
    }
    steps[stepIndex] = step;
    workflow.steps = steps;
    return this.workflowRepository.save(workflow);
  }

  async removeWorkflowStep(id: string, stepId: string): Promise<Workflow> {
    const workflow = await this.findOne(id);
    const steps = this.parseSteps(workflow.steps);
    workflow.steps = steps.filter((s) => s.id !== stepId);
    return this.workflowRepository.save(workflow);
  }
}
