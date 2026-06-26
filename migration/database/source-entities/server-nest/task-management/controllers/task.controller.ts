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
import { TaskService } from "../services/task.service";
import { TaskAttachmentService } from "../services/task-attachment.service";
import { CreateTaskDto } from "../dto/create-task.dto";
import { UpdateTaskDto } from "../dto/update-task.dto";
import { Task } from "../entities/task.entity";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Permission } from "@auth/permissions";
import { SearchTasksDto } from "../dto/search-tasks.dto";
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
import { TaskDto } from "@modules/task-management/dto/task.dto";
import { UserDto } from "@modules/user-management/dto/user.dto";

@Controller("tasks")
@ApiBearerAuth()
@ApiTags("Task")
@ApiExtraModels(PaginatedResponse, TaskDto, UserDto)
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly attachmentService: TaskAttachmentService,
  ) {}

  @Post()
  @Permissions(Permission.TASK_CREATE)
  @ApiCreatedResponse({ type: TaskDto })
  async create(@Body(ValidationPipe) createTaskDto: CreateTaskDto) {
    return this.taskService.create(createTaskDto);
  }

  @Get("search")
  @Permissions(Permission.TASK_READ)
  @ApiQuery({
    name: "q",
    required: false,
    type: String,
    description: "A search query to filter tasks by title or description",
  })
  @ApiOkResponse({ type: TaskDto, isArray: true })
  async searchTasks(
    @Query(ValidationPipe) query: SearchTasksDto,
  ): Promise<Task[]> {
    return this.taskService.searchTasks(query.q);
  }

  @Get("statistics")
  @Permissions(Permission.TASK_READ)
  @ApiOkResponse({ schema: { type: "object" } })
  async getTaskStatistics(): Promise<any> {
    return this.taskService.getTaskStatistics();
  }

  @Get("date-range")
  @Permissions(Permission.TASK_READ)
  @ApiQuery({ name: "startDate", required: true, type: String })
  @ApiQuery({ name: "endDate", required: true, type: String })
  @ApiOkResponse({ type: TaskDto, isArray: true })
  async getTasksByDateRange(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ): Promise<Task[]> {
    return this.taskService.getTasksByDateRange(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get("overdue")
  @Permissions(Permission.TASK_READ)
  @ApiOkResponse({ type: TaskDto, isArray: true })
  async getOverdueTasks(): Promise<Task[]> {
    return this.taskService.getOverdueTasks();
  }

  @Get("upcoming")
  @Permissions(Permission.TASK_READ)
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiOkResponse({ type: TaskDto, isArray: true })
  async getUpcomingTasks(
    @Query("days", ParseIntPipe) days: number = 7,
  ): Promise<Task[]> {
    return this.taskService.getUpcomingTasks(days);
  }

  @Get("status/:status")
  @Permissions(Permission.TASK_READ)
  @ApiParam({ name: "status", schema: { type: "string" } })
  @ApiOkResponse({ type: TaskDto, isArray: true })
  async findByStatus(@Param("status") status: string): Promise<Task[]> {
    return this.taskService.findByStatus(status);
  }

  @Get("creator/:creatorId")
  @Permissions(Permission.TASK_READ)
  @ApiParam({ name: "creatorId", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: TaskDto, isArray: true })
  async findByCreator(@Param("creatorId") creatorId: string): Promise<Task[]> {
    return this.taskService.findByCreator(creatorId);
  }

  @Get("priority/:priority")
  @Permissions(Permission.TASK_READ)
  @ApiParam({ name: "priority", schema: { type: "string" } })
  @ApiOkResponse({ type: TaskDto, isArray: true })
  async findByPriority(@Param("priority") priority: string): Promise<Task[]> {
    return this.taskService.findByPriority(priority);
  }

  @Get(":id/attachments")
  @Permissions(Permission.TASK_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ schema: { type: "array", items: { type: "object" } } })
  async listAttachments(@Param("id", ParseUUIDPipe) id: string) {
    return this.attachmentService.listByTask(id);
  }

  @Get()
  @Permissions(Permission.TASK_READ)
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
              items: { $ref: getSchemaPath(TaskDto) },
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
    return this.taskService.findPaged(pageNum, limitNum, q, includeDeleted);
  }

  @Get(":id")
  @Permissions(Permission.TASK_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiQuery({ name: "withDeleted", required: false, type: Boolean })
  @ApiOkResponse({ type: TaskDto })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("withDeleted") withDeletedRaw?: string,
  ): Promise<Task> {
    const withDeleted = String(withDeletedRaw || "").toLowerCase();
    const includeDeleted = ["true", "1", "yes", "on"].includes(withDeleted);
    return this.taskService.findOne(id, includeDeleted);
  }

  @Put(":id")
  @Permissions(Permission.TASK_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: TaskDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.update(id, updateTaskDto);
  }

  @Delete(":id")
  @Permissions(Permission.TASK_DELETE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.taskService.remove(id);
  }

  @Post(":id/restore")
  @Permissions(Permission.TASK_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: { type: "object", properties: { restored: { type: "boolean" } } },
  })
  async restore(@Param("id", ParseUUIDPipe) id: string) {
    await this.taskService.restore(id);
    return { restored: true };
  }
}
