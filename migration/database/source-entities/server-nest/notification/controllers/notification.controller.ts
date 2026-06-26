import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { NotificationService } from "../services/notification.service";
import {
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiExtraModels,
  ApiTags,
} from "@nestjs/swagger";
import { NotificationDto } from "@modules/notification/dto/notification.dto";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Permission } from "@auth/permissions";

@Controller("notifications")
@ApiBearerAuth()
@ApiTags("Notification")
@ApiExtraModels(NotificationDto)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get(":userId")
  @Permissions(Permission.NOTIFICATION_READ)
  @ApiParam({ name: "userId", schema: { type: "string", format: "uuid" } })
  @ApiOkResponse({ type: NotificationDto, isArray: true })
  async list(@Param("userId", ParseUUIDPipe) userId: string) {
    return this.service.list(userId);
  }

  @Post(":userId/mark-all-read")
  @Permissions(Permission.NOTIFICATION_UPDATE)
  @ApiParam({ name: "userId", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: { type: "object", properties: { ok: { type: "boolean" } } },
  })
  async markAllRead(@Param("userId", ParseUUIDPipe) userId: string) {
    await this.service.markAllRead(userId);
    return { ok: true };
  }

  @Post(":id/mark-read")
  @Permissions(Permission.NOTIFICATION_UPDATE)
  @ApiParam({ name: "id", schema: { type: "string", format: "uuid" } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: { type: "object", properties: { ok: { type: "boolean" } } },
  })
  async markRead(@Param("id", ParseUUIDPipe) id: string) {
    await this.service.markRead(id);
    return { ok: true };
  }
}
