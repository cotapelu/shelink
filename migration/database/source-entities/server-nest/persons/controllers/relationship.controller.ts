import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { RelationshipService } from "../services/relationship.service";
import { CreateRelationshipDto } from "../dto/create-relationship.dto";
import { RelationshipDto } from "../dto/relationship.dto";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Permission } from "@auth/permissions";

@ApiTags("Relationships")
@ApiBearerAuth()
@Controller("relationships")
export class RelationshipController {
  constructor(private readonly relationshipService: RelationshipService) {}

  @Post()
  @ApiOperation({ summary: "Create a new relationship" })
  @Permissions(Permission.RELATIONSHIP_CREATE)
  async create(
    @Body() createDto: CreateRelationshipDto,
  ): Promise<RelationshipDto> {
    return this.relationshipService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: "Get all relationships, optionally filtered by person_id",
  })
  @ApiQuery({ name: "person_id", required: false, type: String })
  @Permissions(Permission.RELATIONSHIP_READ)
  async findAll(
    @Query("person_id") personId?: string,
  ): Promise<RelationshipDto[]> {
    if (personId) {
      return this.relationshipService.findAllByPerson(personId);
    }
    // If no filter, return empty or could throw? For now return empty
    return [];
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a relationship by ID" })
  async findOne(@Param("id") id: string): Promise<RelationshipDto> {
    return this.relationshipService.findOne(id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a relationship" })
  @Permissions(Permission.RELATIONSHIP_DELETE)
  async remove(@Param("id") id: string): Promise<{ success: boolean }> {
    return this.relationshipService.remove(id);
  }
}
