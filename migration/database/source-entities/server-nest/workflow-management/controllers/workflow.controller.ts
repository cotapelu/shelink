import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { WorkflowService } from "../services/workflow.service";
import { CreateWorkflowDto } from "../dto/create-workflow.dto";
import { UpdateWorkflowDto } from "../dto/update-workflow.dto";
import { WorkflowStepDto } from "../dto/workflow-step.dto";
import { Workflow } from "../entities/workflow.entity";
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
import { WorkflowDto } from "@modules/workflow-management/dto/workflow.dto";
import { UserDto } from "@modules/user-management/dto/user.dto";

@Controller("workflows")
@ApiBearerAuth()
@ApiTags("Workflow")
@ApiExtraModels(PaginatedResponse, WorkflowDto, UserDto)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @Permissions(Permission.WORKFLOW_CREATE)
  @ApiCreatedResponse({ type: WorkflowDto })
  async create(@Body(ValidationPipe) createWorkflowDto: CreateWorkflowDto) {
    return this.workflowService.create(createWorkflowDto);
  }

  @Get("search")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiQuery({ name: "q", required: true, type: String })
  @ApiOkResponse({ type: WorkflowDto, isArray: true })
  async searchWorkflows(@Query("q") query: string): Promise<Workflow[]> {
    return this.workflowService.searchWorkflows(query);
  }

  @Get("statistics")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiOkResponse({ schema: { type: "object" } })
  async getWorkflowStatistics(): Promise<any> {
    return this.workflowService.getWorkflowStatistics();
  }

  @Get("date-range")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiQuery({ name: "startDate", required: true, type: String })
  @ApiQuery({ name: "endDate", required: true, type: String })
  @ApiOkResponse({ type: WorkflowDto, isArray: true })
  async getWorkflowsByDateRange(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ): Promise<Workflow[]> {
    return this.workflowService.getWorkflowsByDateRange(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get("active")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiOkResponse({ type: WorkflowDto, isArray: true })
  async getActiveWorkflows(): Promise<Workflow[]> {
    return this.workflowService.getActiveWorkflows();
  }

  @Get("archived")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiOkResponse({ type: WorkflowDto, isArray: true })
  async getArchivedWorkflows(): Promise<Workflow[]> {
    return this.workflowService.getArchivedWorkflows();
  }

  @Get("with-task-count")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiOkResponse({ schema: { type: "array", items: { type: "object" } } })
  async getWorkflowsWithTaskCount(): Promise<any[]> {
    return this.workflowService.getWorkflowsWithTaskCount();
  }

  @Get("owner/:ownerId")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiParam({ name: "ownerId", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: WorkflowDto, isArray: true })
  async findByOwnerId(@Param("ownerId") ownerId: string): Promise<Workflow[]> {
    return this.workflowService.findByOwnerId(ownerId);
  }

  @Get("status/:status")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiParam({ name: "status", schema: { type: "string" } })
  @ApiOkResponse({ type: WorkflowDto, isArray: true })
  async findByStatus(@Param("status") status: string): Promise<Workflow[]> {
    return this.workflowService.findByStatus(status);
  }

  @Get("category/:category")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiParam({ name: "category", schema: { type: "string" } })
  @ApiOkResponse({ type: WorkflowDto, isArray: true })
  async findByCategory(
    @Param("category") category: string,
  ): Promise<Workflow[]> {
    return this.workflowService.findByCategory(category);
  }

  @Get(":id/steps")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ schema: { type: "array", items: { type: "object" } } })
  async getWorkflowSteps(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<any[]> {
    return this.workflowService.getWorkflowSteps(id);
  }

  @Post(":id/steps")
  @Permissions(Permission.WORKFLOW_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiCreatedResponse({ type: WorkflowDto })
  async addWorkflowStep(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() step: WorkflowStepDto,
  ): Promise<Workflow> {
    return this.workflowService.addWorkflowStep(id, step);
  }

  @Put(":id/steps/:stepId")
  @Permissions(Permission.WORKFLOW_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiParam({ name: "stepId", schema: { type: "string" } })
  @ApiOkResponse({ type: WorkflowDto })
  async updateWorkflowStep(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("stepId") stepId: string,
    @Body() step: WorkflowStepDto,
  ): Promise<Workflow> {
    return this.workflowService.updateWorkflowStep(id, stepId, step);
  }

  @Delete(":id/steps/:stepId")
  @Permissions(Permission.WORKFLOW_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiParam({ name: "stepId", schema: { type: "string" } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async removeWorkflowStep(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("stepId") stepId: string,
  ): Promise<void> {
    await this.workflowService.removeWorkflowStep(id, stepId);
  }

  @Get()
  @Permissions(Permission.WORKFLOW_READ)
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "withDeleted", required: false, type: Boolean })
  @ApiOkResponse({
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponse) },
        {
          properties: {
            data: {
              type: "array",
              items: { $ref: getSchemaPath(WorkflowDto) },
            },
          },
        },
      ],
    },
  })
  async findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("withDeleted") withDeletedRaw?: string,
  ) {
    const withDeleted = String(withDeletedRaw || "").toLowerCase();
    const includeDeleted = ["true", "1", "yes", "on"].includes(withDeleted);
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    return this.workflowService.findPaged(pageNum, limitNum, includeDeleted);
  }

  @Get(":id")
  @Permissions(Permission.WORKFLOW_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiQuery({ name: "withDeleted", required: false, type: Boolean })
  @ApiOkResponse({ type: WorkflowDto })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("withDeleted") withDeletedRaw?: string,
  ): Promise<Workflow> {
    const withDeleted = String(withDeletedRaw || "").toLowerCase();
    const includeDeleted = ["true", "1", "yes", "on"].includes(withDeleted);
    return this.workflowService.findOne(id, includeDeleted);
  }

  @Put(":id")
  @Permissions(Permission.WORKFLOW_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: WorkflowDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateWorkflowDto: UpdateWorkflowDto,
  ) {
    return this.workflowService.update(id, updateWorkflowDto);
  }

  @Delete(":id")
  @Permissions(Permission.WORKFLOW_DELETE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.workflowService.remove(id);
  }

  @Post(":id/restore")
  @Permissions(Permission.WORKFLOW_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: { type: "object", properties: { restored: { type: "boolean" } } },
  })
  async restore(@Param("id", ParseUUIDPipe) id: string) {
    await this.workflowService.restore(id);
    return { restored: true };
  }
}
