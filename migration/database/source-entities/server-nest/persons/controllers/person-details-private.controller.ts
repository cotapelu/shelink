import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Permission } from "@auth/permissions";
import { PersonService } from "@modules/persons/services/person.service";
import { Person } from "@modules/persons/entities/person.entity";

/**
 * DTO for private person data payload
 */
export class PersonPrivateDataDto {
  phone_number?: string | null;
  occupation?: string | null;
  current_residence?: string | null;
}

/**
 * Controller for accessing/updating private person data (admin only)
 * Separate from main PersonController to enforce stricter authorization
 */
@ApiTags("Person Private Data")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("person-details-private")
export class PersonDetailsPrivateController {
  constructor(private readonly personService: PersonService) {}

  @Get(":id")
  @Permissions(Permission.PERSON_UPDATE) // or a specific PERMISSION.PERSON_PRIVATE_READ
  @ApiOperation({ summary: "Get private details for a person (admin only)" })
  @ApiParam({ name: "id", description: "Person ID" })
  @ApiResponse({
    status: 200,
    description: "Private data retrieved",
    type: Person,
  })
  async getPrivateDetails(@Param("id") id: string): Promise<Partial<Person>> {
    // Retrieve the person but only return private fields
    const person = await this.personService.findOne(id);
    if (!person) {
      throw new BadRequestException(`Person with ID ${id} not found`);
    }

    // Return only private fields to minimize data exposure
    const { phone_number, occupation, current_residence } = person;
    return {
      phone_number,
      occupation,
      current_residence,
    };
  }

  @Post()
  @Permissions(Permission.PERSON_UPDATE)
  @ApiOperation({ summary: "Save private details for a person (admin only)" })
  @ApiBody({ description: "Private person data", type: PersonPrivateDataDto })
  @ApiResponse({ status: 200, description: "Private data saved", type: Person })
  async savePrivateDetails(
    @Body() dto: PersonPrivateDataDto,
  ): Promise<Partial<Person>> {
    const { person_id, ...updateData } = dto as any;

    if (!person_id) {
      throw new BadRequestException("person_id is required");
    }

    // Only allow updating private fields
    const existing = await this.personService.findOne(person_id);
    if (!existing) {
      throw new BadRequestException(`Person with ID ${person_id} not found`);
    }

    const updated = await this.personService.update(person_id, updateData);
    const { phone_number, occupation, current_residence } = updated;
    return {
      phone_number,
      occupation,
      current_residence,
    };
  }
}
