import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ProjectService } from "../services/project.service";
import { CreateProjectDto } from "../dto/create-project.dto";
import { UpdateProjectDto } from "../dto/update-project.dto";
import { Project } from "../entities/project.entity";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Permission } from "@auth/permissions";
import {
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiExtraModels,
  getSchemaPath,
  ApiTags,
} from "@nestjs/swagger";
import { PaginatedResponse } from "@common/dto/paginated-response.dto";
import { ProjectDto } from "@modules/project-management/dto/project.dto";
import { UserDto } from "@modules/user-management/dto/user.dto";

@Controller("projects")
@ApiBearerAuth()
@ApiTags("Project")
@ApiExtraModels(PaginatedResponse, ProjectDto, UserDto)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Permissions(Permission.PROJECT_CREATE)
  @ApiCreatedResponse({ type: ProjectDto })
  async create(@Body(ValidationPipe) createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto);
  }

  @Get("search")
  @Permissions(Permission.PROJECT_READ)
  @ApiQuery({ name: "q", required: true, type: String })
  @ApiOkResponse({ type: ProjectDto, isArray: true })
  async searchProjects(@Query("q") query: string): Promise<Project[]> {
    return this.projectService.searchProjects(query);
  }

  @Get("statistics")
  @Permissions(Permission.PROJECT_READ)
  @ApiOkResponse({ schema: { type: "object" } })
  async getProjectStatistics(): Promise<any> {
    return this.projectService.getProjectStatistics();
  }

  @Get("date-range")
  @Permissions(Permission.PROJECT_READ)
  @ApiQuery({ name: "startDate", required: true, type: String })
  @ApiQuery({ name: "endDate", required: true, type: String })
  @ApiOkResponse({ type: ProjectDto, isArray: true })
  async getProjectsByDateRange(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ): Promise<Project[]> {
    return this.projectService.getProjectsByDateRange(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get("active")
  @Permissions(Permission.PROJECT_READ)
  @ApiOkResponse({ type: ProjectDto, isArray: true })
  async getActiveProjects(): Promise<Project[]> {
    return this.projectService.getActiveProjects();
  }

  @Get("completed")
  @Permissions(Permission.PROJECT_READ)
  @ApiOkResponse({ type: ProjectDto, isArray: true })
  async getCompletedProjects(): Promise<Project[]> {
    return this.projectService.getCompletedProjects();
  }

  @Get("overdue")
  @Permissions(Permission.PROJECT_READ)
  @ApiOkResponse({ type: ProjectDto, isArray: true })
  async getOverdueProjects(): Promise<Project[]> {
    return this.projectService.getOverdueProjects();
  }

  @Get("upcoming")
  @Permissions(Permission.PROJECT_READ)
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiOkResponse({ type: ProjectDto, isArray: true })
  async getUpcomingProjects(
    @Query("days", ParseIntPipe) days: number = 30,
  ): Promise<Project[]> {
    return this.projectService.getUpcomingProjects(days);
  }

  @Get("needs-attention")
  @Permissions(Permission.PROJECT_READ)
  @ApiOkResponse({ type: ProjectDto, isArray: true })
  async getProjectsNeedingAttention(): Promise<Project[]> {
    return this.projectService.getProjectsNeedingAttention();
  }

  @Get("owner/:ownerId")
  @Permissions(Permission.PROJECT_READ)
  @ApiParam({ name: "ownerId", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: ProjectDto, isArray: true })
  async findByOwnerId(@Param("ownerId") ownerId: string): Promise<Project[]> {
    return this.projectService.findByOwnerId(ownerId);
  }

  @Get("status/:status")
  @Permissions(Permission.PROJECT_READ)
  @ApiParam({ name: "status", schema: { type: "string" } })
  @ApiOkResponse({ type: ProjectDto, isArray: true })
  async findByStatus(@Param("status") status: string): Promise<Project[]> {
    return this.projectService.findByStatus(status);
  }

  @Get(":id/progress")
  @Permissions(Permission.PROJECT_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ schema: { type: "number" } })
  async getProjectProgress(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<number> {
    return this.projectService.getProjectProgress(id);
  }

  @Get(":id/tasks")
  @Permissions(Permission.PROJECT_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ schema: { type: "array", items: { type: "object" } } })
  async getProjectTasks(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any[]> {
    return this.projectService.getProjectTasks(id);
  }

  @Get(":id/team")
  @Permissions(Permission.PROJECT_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ schema: { type: "array", items: { type: "object" } } })
  async getProjectTeamMembers(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any[]> {
    return this.projectService.getProjectTeamMembers(id);
  }

  @Get(":id/budget-utilization")
  @Permissions(Permission.PROJECT_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ schema: { type: "number" } })
  async getProjectBudgetUtilization(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<number> {
    return this.projectService.getProjectBudgetUtilization(id);
  }

  @Get(":id/risk-score")
  @Permissions(Permission.PROJECT_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ schema: { type: "number" } })
  async getProjectRiskScore(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<number> {
    return this.projectService.getProjectRiskScore(id);
  }

  @Get()
  @Permissions(Permission.PROJECT_READ)
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "withDeleted", required: false, type: Boolean })
  @ApiOkResponse({
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponse) },
        {
          properties: {
            data: {
              type: "array",
              items: { $ref: getSchemaPath(ProjectDto) },
            },
          },
        },
      ],
    },
  })
  async findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("q") q?: string,
    @Query("withDeleted") withDeletedRaw?: string,
  ) {
    const withDeleted = String(withDeletedRaw || "").toLowerCase();
    const includeDeleted = ["true", "1", "yes", "on"].includes(withDeleted);
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    return this.projectService.findPaged(pageNum, limitNum, q, includeDeleted);
  }

  @Get(":id")
  @Permissions(Permission.PROJECT_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiQuery({ name: "withDeleted", required: false, type: Boolean })
  @ApiOkResponse({ type: ProjectDto })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("withDeleted") withDeletedRaw?: string,
  ): Promise<Project> {
    const withDeleted = String(withDeletedRaw || "").toLowerCase();
    const includeDeleted = ["true", "1", "yes", "on"].includes(withDeleted);
    return this.projectService.findOne(id, includeDeleted);
  }

  @Patch(":id")
  @Permissions(Permission.PROJECT_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: ProjectDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Delete(":id")
  @Permissions(Permission.PROJECT_DELETE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.projectService.remove(id);
  }

  @Post(":id/restore")
  @Permissions(Permission.PROJECT_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: { type: "object", properties: { restored: { type: "boolean" } } },
  })
  async restore(@Param("id", ParseUUIDPipe) id: string) {
    await this.projectService.restore(id);
    return { restored: true };
  }
}
