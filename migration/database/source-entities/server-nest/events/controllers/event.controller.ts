import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { EventService } from "../services/event.service";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
import { EventDto } from "../dto/event.dto";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Permission } from "@auth/permissions";

@ApiTags("Events")
@ApiBearerAuth()
@Controller("events")
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ApiOperation({ summary: "Create a new event" })
  @Permissions(Permission.EVENT_CREATE)
  async create(@Body() createDto: CreateEventDto): Promise<EventDto> {
    return this.eventService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all events with filters" })
  @ApiQuery({ name: "person_id", required: false, type: String })
  @ApiQuery({ name: "upcoming", required: false, type: Boolean })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @Permissions(Permission.EVENT_READ)
  async findAll(
    @Query("person_id") personId?: string,
    @Query("upcoming") upcoming?: string,
    @Query("limit") limit?: string,
  ): Promise<EventDto[]> {
    return this.eventService.findAll(
      personId,
      upcoming === "true",
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an event by ID" })
  @Permissions(Permission.EVENT_READ)
  async findOne(@Param("id") id: string): Promise<EventDto> {
    return this.eventService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an event" })
  @Permissions(Permission.EVENT_UPDATE)
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateEventDto,
  ): Promise<EventDto> {
    return this.eventService.update(id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an event" })
  @Permissions(Permission.EVENT_DELETE)
  async remove(@Param("id") id: string): Promise<{ success: boolean }> {
    return this.eventService.remove(id);
  }
}
