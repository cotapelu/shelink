import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WorkflowStatus } from "../entities/workflow.entity";
import { UserDto } from "@modules/user-management/dto/user.dto";

export class WorkflowDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiProperty({ enum: WorkflowStatus })
  status!: WorkflowStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  category?: string | null;

  @ApiProperty({ format: "uuid" })
  ownerId!: string;

  @ApiProperty({ type: () => UserDto })
  owner!: UserDto;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: string;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  deletedAt?: string | null;
}
