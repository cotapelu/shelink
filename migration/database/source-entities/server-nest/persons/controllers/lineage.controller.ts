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

@ApiTags("Lineage")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("lineage")
export class LineageController {
  constructor(private readonly personService: PersonService) {}

  @Get("tree")
  @ApiOperation({ summary: "Get lineage tree from a root person" })
  @ApiQuery({ name: "root", required: true, type: String })
  @ApiQuery({ name: "maxDepth", required: false, type: Number })
  @Permissions(Permission.LINEAGE_READ)
  async getTree(
    @Query("root") rootId: string,
    @Query("maxDepth") maxDepth?: string,
  ): Promise<any> {
    const depth = maxDepth ? parseInt(maxDepth, 10) : undefined;
    return this.personService.getLineageTree(rootId, depth);
  }

  @Get("root")
  @ApiOperation({ summary: "Find root person of the family tree" })
  @Permissions(Permission.LINEAGE_READ)
  async getRoot(): Promise<any> {
    return this.personService.findRootPerson();
  }
}
