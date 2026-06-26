import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TaskPriority, TaskStatus } from "../entities/task.entity";
import { UserDto } from "@modules/user-management/dto/user.dto";

export class TaskDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  priority!: TaskPriority;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  dueDate?: string | null;

  @ApiProperty({ format: "uuid" })
  creatorId!: string;

  @ApiProperty({ type: () => UserDto })
  creator!: UserDto;

  @ApiPropertyOptional({ type: String, format: "uuid", nullable: true })
  workflowId?: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: string;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  deletedAt?: string | null;
}
