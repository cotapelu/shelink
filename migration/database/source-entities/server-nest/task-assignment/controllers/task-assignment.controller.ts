import {
  Controller,
  Get,
  Post,
  Put,
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
import { TaskAssignmentService } from "../services/task-assignment.service";
import { CreateTaskAssignmentDto } from "../dto/create-task-assignment.dto";
import { UpdateTaskAssignmentDto } from "../dto/update-task-assignment.dto";
import { TaskAssignment } from "../entities/task-assignment.entity";
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
import { TaskAssignmentDto } from "@modules/task-assignment/dto/task-assignment.dto";
import { TaskDto } from "@modules/task-management/dto/task.dto";
import { UserDto } from "@modules/user-management/dto/user.dto";

@Controller("task-assignments")
@ApiBearerAuth()
@ApiTags("TaskAssignment")
@ApiExtraModels(PaginatedResponse, TaskAssignmentDto, TaskDto, UserDto)
export class TaskAssignmentController {
  constructor(private readonly taskAssignmentService: TaskAssignmentService) {}

  @Post()
  @Permissions(Permission.ASSIGNMENT_CREATE)
  @ApiCreatedResponse({ type: TaskAssignmentDto })
  async create(
    @Body(ValidationPipe) createTaskAssignmentDto: CreateTaskAssignmentDto,
  ) {
    return this.taskAssignmentService.create(createTaskAssignmentDto);
  }

  @Get("overdue")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiOkResponse({ type: TaskAssignmentDto, isArray: true })
  async getOverdueAssignments(): Promise<TaskAssignment[]> {
    return this.taskAssignmentService.getOverdueAssignments();
  }

  @Get("pending")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiOkResponse({ type: TaskAssignmentDto, isArray: true })
  async getPendingAssignments(): Promise<TaskAssignment[]> {
    return this.taskAssignmentService.getPendingAssignments();
  }

  @Get("date-range")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiQuery({ name: "startDate", required: true, type: String })
  @ApiQuery({ name: "endDate", required: true, type: String })
  @ApiOkResponse({ type: TaskAssignmentDto, isArray: true })
  async getAssignmentsByDateRange(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ): Promise<TaskAssignment[]> {
    return this.taskAssignmentService.getAssignmentsByDateRange(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get("upcoming")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiOkResponse({ type: TaskAssignmentDto, isArray: true })
  async getUpcomingAssignments(
    @Query("days", ParseIntPipe) days: number = 7,
  ): Promise<TaskAssignment[]> {
    return this.taskAssignmentService.getUpcomingAssignments(days);
  }

  @Get("statistics")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiOkResponse({ schema: { type: "object" } })
  async getAssignmentStatistics(): Promise<any> {
    return this.taskAssignmentService.getAssignmentStatistics();
  }

  @Get("task/:taskId")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiParam({ name: "taskId", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: TaskAssignmentDto, isArray: true })
  async findByTaskId(
    @Param("taskId") taskId: string,
  ): Promise<TaskAssignment[]> {
    return this.taskAssignmentService.findByTaskId(taskId);
  }

  @Get("assignee/:assigneeId")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiParam({ name: "assigneeId", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: TaskAssignmentDto, isArray: true })
  async findByAssigneeId(
    @Param("assigneeId") assigneeId: string,
  ): Promise<TaskAssignment[]> {
    return this.taskAssignmentService.findByAssigneeId(assigneeId);
  }

  @Get("assigner/:assignerId")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiParam({ name: "assignerId", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: TaskAssignmentDto, isArray: true })
  async findByAssignerId(
    @Param("assignerId") assignerId: string,
  ): Promise<TaskAssignment[]> {
    return this.taskAssignmentService.findByAssignerId(assignerId);
  }

  @Get("status/:status")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiParam({ name: "status", schema: { type: "string" } })
  @ApiOkResponse({ type: TaskAssignmentDto, isArray: true })
  async findByStatus(
    @Param("status") status: string,
  ): Promise<TaskAssignment[]> {
    return this.taskAssignmentService.findByStatus(status);
  }

  @Get()
  @Permissions(Permission.ASSIGNMENT_READ)
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
              items: { $ref: getSchemaPath(TaskAssignmentDto) },
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
    return this.taskAssignmentService.findPaged(
      pageNum,
      limitNum,
      includeDeleted,
    );
  }

  @Get(":id")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiQuery({ name: "withDeleted", required: false, type: Boolean })
  @ApiOkResponse({ type: TaskAssignmentDto })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("withDeleted") withDeletedRaw?: string,
  ): Promise<TaskAssignment> {
    const withDeleted = String(withDeletedRaw || "").toLowerCase();
    const includeDeleted = ["true", "1", "yes", "on"].includes(withDeleted);
    return this.taskAssignmentService.findOne(id, includeDeleted);
  }

  @Put(":id")
  @Permissions(Permission.ASSIGNMENT_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: TaskAssignmentDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateTaskAssignmentDto: UpdateTaskAssignmentDto,
  ) {
    return this.taskAssignmentService.update(id, updateTaskAssignmentDto);
  }

  @Delete(":id")
  @Permissions(Permission.ASSIGNMENT_DELETE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.taskAssignmentService.remove(id);
  }

  @Post(":id/restore")
  @Permissions(Permission.ASSIGNMENT_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: { type: "object", properties: { restored: { type: "boolean" } } },
  })
  async restore(@Param("id", ParseUUIDPipe) id: string) {
    await this.taskAssignmentService.restore(id);
    return { restored: true };
  }
}
