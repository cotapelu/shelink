import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { PersonService } from "../services/person.service";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Permission } from "@auth/permissions";

@ApiTags("Kinship")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("kinship")
export class KinshipController {
  constructor(private readonly personService: PersonService) {}

  @Get("relation")
  @ApiOperation({ summary: "Get relationship between two persons" })
  @ApiQuery({ name: "from", required: true, type: String })
  @ApiQuery({ name: "to", required: true, type: String })
  @Permissions(Permission.KINSHIP_READ)
  async getRelation(
    @Query("from") fromId: string,
    @Query("to") toId: string,
  ): Promise<any> {
    return this.personService.getKinshipRelation(fromId, toId);
  }

  @Get("calculate")
  @ApiOperation({ summary: "Calculate kinship (same as relation)" })
  @ApiQuery({ name: "person_a", required: true, type: String })
  @ApiQuery({ name: "person_b", required: true, type: String })
  @Permissions(Permission.KINSHIP_READ)
  async calculate(
    @Query("person_a") personAId: string,
    @Query("person_b") personBId: string,
  ): Promise<any> {
    return this.personService.getKinshipRelation(personAId, personBId);
  }
}
