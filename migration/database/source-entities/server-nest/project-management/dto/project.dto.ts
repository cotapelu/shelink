import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProjectStatus } from "../entities/project.entity";
import { UserDto } from "@modules/user-management/dto/user.dto";

export class ProjectDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiProperty({ enum: ProjectStatus })
  status!: ProjectStatus;

  @ApiProperty({ format: "uuid" })
  ownerId!: string;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  startDate?: string | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  endDate?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  budget?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  currency?: string | null;

  @ApiProperty({ type: () => UserDto })
  owner!: UserDto;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: string;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  deletedAt?: string | null;
}
