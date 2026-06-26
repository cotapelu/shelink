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
import { PersonService } from "../services/person.service";
import { CreatePersonDto } from "../dto/create-person.dto";
import { UpdatePersonDto } from "../dto/update-person.dto";
import { PersonDto } from "../dto/person.dto";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Permission } from "@auth/permissions";

@ApiTags("Persons (Members)")
@ApiBearerAuth()
@Controller("persons")
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Post()
  @ApiOperation({ summary: "Create a new person" })
  @Permissions(Permission.PERSON_CREATE)
  async create(@Body() createDto: CreatePersonDto): Promise<PersonDto> {
    return this.personService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: "Get all persons with pagination, search and filters",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "gender", required: false, type: String })
  @ApiQuery({ name: "generation", required: false, type: Number })
  @ApiQuery({ name: "minBirthYear", required: false, type: Number })
  @ApiQuery({ name: "maxBirthYear", required: false, type: Number })
  @ApiQuery({ name: "isDeceased", required: false, type: Boolean })
  @Permissions(Permission.PERSON_READ)
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("gender") gender?: string,
    @Query("generation") generation?: string,
    @Query("minBirthYear") minBirthYear?: string,
    @Query("maxBirthYear") maxBirthYear?: string,
    @Query("isDeceased") isDeceased?: string,
  ): Promise<any> {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;

    const filters = {
      gender,
      generation: generation ? parseInt(generation, 10) : undefined,
      minBirthYear: minBirthYear ? parseInt(minBirthYear, 10) : undefined,
      maxBirthYear: maxBirthYear ? parseInt(maxBirthYear, 10) : undefined,
      isDeceased: isDeceased !== undefined ? isDeceased === "true" : undefined,
    };

    return this.personService.findAll(p, l, search, filters);
  }

  @Get("search/advanced")
  @ApiOperation({ summary: "Advanced search for persons" })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "gender", required: false, type: String })
  @ApiQuery({ name: "generation", required: false, type: Number })
  @ApiQuery({ name: "minBirthYear", required: false, type: Number })
  @ApiQuery({ name: "maxBirthYear", required: false, type: Number })
  @ApiQuery({ name: "isDeceased", required: false, type: Boolean })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @Permissions(Permission.PERSON_READ)
  async advancedSearch(
    @Query("q") query?: string,
    @Query("gender") gender?: string,
    @Query("generation") generation?: string,
    @Query("minBirthYear") minBirthYear?: string,
    @Query("maxBirthYear") maxBirthYear?: string,
    @Query("isDeceased") isDeceased?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;

    const filters = {
      gender,
      generation: generation ? parseInt(generation, 10) : undefined,
      minBirthYear: minBirthYear ? parseInt(minBirthYear, 10) : undefined,
      maxBirthYear: maxBirthYear ? parseInt(maxBirthYear, 10) : undefined,
      isDeceased: isDeceased !== undefined ? isDeceased === "true" : undefined,
    };

    return this.personService.findAll(p, l, query, filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a person by ID" })
  @Permissions(Permission.PERSON_READ)
  async findOne(@Param("id") id: string): Promise<PersonDto> {
    return this.personService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a person" })
  @Permissions(Permission.PERSON_UPDATE)
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdatePersonDto,
  ): Promise<PersonDto> {
    return this.personService.update(id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a person" })
  @Permissions(Permission.PERSON_DELETE)
  async remove(@Param("id") id: string): Promise<{ success: boolean }> {
    return this.personService.remove(id);
  }

  @Post("batch/delete")
  @ApiOperation({ summary: "Batch delete persons by IDs" })
  @Permissions(Permission.PERSON_DELETE)
  async batchDelete(
    @Body() body: { ids: string[] },
  ): Promise<{ deleted: number; errors: string[] }> {
    return this.personService.batchDelete(body.ids);
  }

  @Post("batch/update")
  @ApiOperation({ summary: "Batch update persons" })
  @Permissions(Permission.PERSON_UPDATE)
  async batchUpdate(
    @Body() body: { ids: string[]; data: Partial<UpdatePersonDto> },
  ): Promise<{ updated: number; errors: string[] }> {
    return this.personService.batchUpdate(body.ids, body.data);
  }

  @Get("stats/generations")
  @ApiOperation({ summary: "Get persons grouped by generation" })
  @Permissions(Permission.PERSON_READ)
  async getStatsByGeneration() {
    return this.personService.getStatsByGeneration();
  }

  @Get("stats/gender")
  @ApiOperation({ summary: "Get persons grouped by gender" })
  @Permissions(Permission.PERSON_READ)
  async getStatsByGender() {
    return this.personService.getStatsByGender();
  }

  @Get("stats/age-distribution")
  @ApiOperation({ summary: "Get persons by age groups" })
  @Permissions(Permission.PERSON_READ)
  async getAgeDistribution() {
    return this.personService.getAgeDistribution();
  }

  @Get("lineage/tree/:id")
  @ApiOperation({ summary: "Get lineage tree for a person" })
  @ApiQuery({ name: "maxDepth", required: false, type: Number })
  @Permissions(Permission.PERSON_READ)
  async getLineageTree(
    @Param("id") id: string,
    @Query("maxDepth") maxDepth?: string,
  ) {
    return this.personService.getLineageTree(
      id,
      maxDepth ? parseInt(maxDepth, 10) : 3,
    );
  }

  @Get("kinship/relation/:personAId/:personBId")
  @ApiOperation({ summary: "Get kinship relation between two persons" })
  @Permissions(Permission.PERSON_READ)
  async getKinshipRelation(
    @Param("personAId") personAId: string,
    @Param("personBId") personBId: string,
  ) {
    return this.personService.getKinshipRelation(personAId, personBId);
  }

  @Get("root/find")
  @ApiOperation({ summary: "Find root person of the family tree" })
  @Permissions(Permission.PERSON_READ)
  async findRootPerson() {
    return this.personService.findRootPerson();
  }
}
