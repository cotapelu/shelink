import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  Query,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
  ApiTags,
  ApiExtraModels,
  getSchemaPath,
} from "@nestjs/swagger";
import { PaginatedResponse } from "@common/dto/paginated-response.dto";
import { UserDto } from "@modules/user-management/dto/user.dto";
import { UserService } from "../services/user.service";
import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { UserRole, UserStatus } from "../entities/user.entity";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Permission } from "@auth/permissions";

@Controller("users")
@ApiBearerAuth()
@ApiTags("User")
@ApiExtraModels(PaginatedResponse, UserDto)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiOkResponse({ type: UserDto })
  async getCurrentUser(@Body("userId") userId: string) {
    return this.userService.findOne(userId);
  }

  @Put("me")
  @ApiOperation({ summary: "Update current user profile" })
  @ApiOkResponse({ type: UserDto })
  async updateCurrentUser(
    @Body("userId") userId: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(userId, updateUserDto);
  }

  @Post("me/password")
  @ApiOperation({ summary: "Change current user password" })
  @ApiOkResponse({
    schema: { type: "object", properties: { success: { type: "boolean" } } },
  })
  async changePassword(
    @Body("userId") userId: string,
    @Body("currentPassword") currentPassword: string,
    @Body("newPassword") newPassword: string,
  ) {
    const valid = await this.userService.validatePassword(
      userId,
      currentPassword,
    );
    if (!valid) {
      throw new BadRequestException("Current password is incorrect");
    }
    await this.userService.update(userId, { password: newPassword });
    return { success: true };
  }

  @Post()
  @Permissions(Permission.USER_CREATE)
  @ApiCreatedResponse({ type: UserDto })
  async create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Permissions(Permission.USER_READ)
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
              items: { $ref: getSchemaPath(UserDto) },
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
    return this.userService.findPaged(pageNum, limitNum, q, includeDeleted);
  }

  @Get(":id")
  @Permissions(Permission.USER_READ)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiQuery({ name: "withDeleted", required: false, type: Boolean })
  @ApiOkResponse({ type: UserDto })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("withDeleted") withDeletedRaw?: string,
  ) {
    const withDeleted = String(withDeletedRaw || "").toLowerCase();
    const includeDeleted = ["true", "1", "yes", "on"].includes(withDeleted);
    return this.userService.findOne(id, includeDeleted);
  }

  @Put(":id")
  @Permissions(Permission.USER_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: UserDto })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(":id")
  @Permissions(Permission.USER_DELETE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.userService.remove(id);
  }

  @Post(":id/restore")
  @Permissions(Permission.USER_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: { type: "object", properties: { restored: { type: "boolean" } } },
  })
  async restore(@Param("id", ParseUUIDPipe) id: string) {
    await this.userService.restore(id);
    return { restored: true };
  }

  @Patch(":id/role")
  @Permissions(Permission.USER_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: UserDto })
  async updateRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("role") role: string,
  ) {
    const validRoles = [UserRole.ADMIN, UserRole.EDITOR, UserRole.MEMBER];
    const roleEnum = role as UserRole;
    if (!validRoles.includes(roleEnum)) {
      throw new BadRequestException(
        "Invalid role. Must be one of: admin, editor, member",
      );
    }
    return this.userService.update(id, { role: roleEnum });
  }

  @Patch(":id/status")
  @Permissions(Permission.USER_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: UserDto })
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("is_active") isActive: boolean,
  ) {
    // Map is_active boolean to UserStatus enum
    const status = isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    return this.userService.update(id, { status });
  }
}

// Re-export alias to satisfy tests expecting this symbol name
export { UserController as UserManagementController };
