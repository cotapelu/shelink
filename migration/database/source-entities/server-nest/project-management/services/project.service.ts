import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Project, ProjectStatus } from "../entities/project.entity";
import { CreateProjectDto } from "../dto/create-project.dto";
import { UpdateProjectDto } from "../dto/update-project.dto";

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create(createProjectDto);
    return this.projectRepository.save(project);
  }

  async findAll(withDeleted = false): Promise<Project[]> {
    return this.projectRepository.find({
      relations: ["owner"],
      withDeleted,
    });
  }

  async findPaged(
    page = 1,
    limit = 20,
    q?: string,
    withDeleted = false,
  ): Promise<{ data: Project[]; total: number; page: number; limit: number }> {
    const qb = this.projectRepository
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.owner", "owner");
    if (withDeleted) qb.withDeleted();

    if (q) {
      const isSQLite = process.env.DB_TYPE === "sqlite";
      if (isSQLite) {
        qb.where(
          "LOWER(project.name) LIKE LOWER(:q) OR LOWER(project.description) LIKE LOWER(:q)",
          {
            q: `%${q}%`,
          },
        );
      } else {
        qb.where("project.name ILIKE :q OR project.description ILIKE :q", {
          q: `%${q}%`,
        });
      }
    }

    const total = await qb.getCount();
    const data = await qb
      .orderBy("project.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async findOne(id: string, withDeleted = false): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ["owner"],
      withDeleted,
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepository.softRemove(project);
  }

  async restore(id: string): Promise<void> {
    await this.projectRepository.restore(id);
  }

  async findByOwnerId(ownerId: string): Promise<Project[]> {
    return this.projectRepository.find({
      where: { ownerId },
      relations: ["owner"],
    });
  }

  async findByStatus(status: string): Promise<Project[]> {
    return this.projectRepository.find({
      where: { status: status as ProjectStatus },
      relations: ["owner"],
    });
  }

  async searchProjects(query: string): Promise<Project[]> {
    const isSQLite = process.env.DB_TYPE === "sqlite";
    if (isSQLite) {
      return this.projectRepository
        .createQueryBuilder("project")
        .leftJoinAndSelect("project.owner", "owner")
        .where(
          "LOWER(project.name) LIKE LOWER(:query) OR LOWER(project.description) LIKE LOWER(:query)",
          {
            query: `%${query}%`,
          },
        )
        .getMany();
    } else {
      return this.projectRepository
        .createQueryBuilder("project")
        .leftJoinAndSelect("project.owner", "owner")
        .where(
          "project.name ILIKE :query OR project.description ILIKE :query",
          {
            query: `%${query}%`,
          },
        )
        .getMany();
    }
  }

  async getProjectStatistics(): Promise<any> {
    const totalProjects = await this.projectRepository.count();
    const stats = await this.projectRepository
      .createQueryBuilder("project")
      .select("project.status", "status")
      .addSelect("COUNT(project.id)", "count")
      .groupBy("project.status")
      .getRawMany();

    const statusBreakdown = stats.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count, 10);
      return acc;
    }, {});

    return {
      totalProjects,
      statusBreakdown,
    };
  }

  async getProjectsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Project[]> {
    return this.projectRepository
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.owner", "owner")
      .where("project.startDate BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getMany();
  }

  async getActiveProjects(): Promise<Project[]> {
    return this.projectRepository.find({
      where: { status: ProjectStatus.ACTIVE },
      relations: ["owner"],
    });
  }

  async getCompletedProjects(): Promise<Project[]> {
    return this.projectRepository.find({
      where: { status: ProjectStatus.COMPLETED },
      relations: ["owner"],
    });
  }

  async getOverdueProjects(): Promise<Project[]> {
    return this.projectRepository
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.owner", "owner")
      .where("project.endDate < :now AND project.status != :completed", {
        now: new Date(),
        completed: "completed",
      })
      .getMany();
  }

  async getUpcomingProjects(days: number = 30): Promise<Project[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.projectRepository
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.owner", "owner")
      .where("project.startDate BETWEEN :now AND :futureDate", {
        now,
        futureDate,
      })
      .getMany();
  }

  async getProjectsNeedingAttention(): Promise<Project[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.projectRepository
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.owner", "owner")
      .where("project.status = :active", { active: "active" })
      .andWhere("project.updatedAt < :thirtyDaysAgo", { thirtyDaysAgo })
      .getMany();
  }

  async getProjectProgress(_id: string): Promise<number> {
    // In a real implementation, this would calculate progress based on tasks
    if (process.env.NODE_ENV === "development") {
      return Math.floor(Math.random() * 100);
    }
    return 0; // hoặc giá trị thật nếu có
  }

  async getProjectTasks(_id: string): Promise<any[]> {
    // In a real implementation, this would fetch tasks for the project
    // For now, we'll return mock data
    return [
      { id: "1", title: "Task 1", status: "completed" },
      { id: "2", title: "Task 2", status: "in-progress" },
      { id: "3", title: "Task 3", status: "todo" },
    ];
  }

  async getProjectTeamMembers(_id: string): Promise<any[]> {
    // In a real implementation, this would fetch team members for the project
    // For now, we'll return mock data
    return [
      { id: "1", name: "John Doe", role: "Project Manager" },
      { id: "2", name: "Jane Smith", role: "Developer" },
      { id: "3", name: "Bob Johnson", role: "Designer" },
    ];
  }

  async getProjectBudgetUtilization(_id: string): Promise<number> {
    // In a real implementation, this would calculate budget utilization
    if (process.env.NODE_ENV === "development") {
      return Math.floor(Math.random() * 100);
    }
    return 0; // hoặc giá trị thật nếu có
  }

  async getProjectRiskScore(_id: string): Promise<number> {
    // In a real implementation, this would calculate risk score
    if (process.env.NODE_ENV === "development") {
      return Math.floor(Math.random() * 10);
    }
    return 0; // hoặc giá trị thật nếu có
  }
}
