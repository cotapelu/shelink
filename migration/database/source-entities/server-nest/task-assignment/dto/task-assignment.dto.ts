import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AssignmentStatus } from "../entities/task-assignment.entity";
import { TaskDto } from "@modules/task-management/dto/task.dto";
import { UserDto } from "@modules/user-management/dto/user.dto";

export class TaskAssignmentDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  taskId!: string;

  @ApiProperty({ format: "uuid" })
  assignerId!: string;

  @ApiProperty({ format: "uuid" })
  assigneeId!: string;

  @ApiProperty({ type: String, format: "date-time" })
  assignedAt!: string;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  dueDate?: string | null;

  @ApiProperty({ enum: AssignmentStatus })
  status!: AssignmentStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes?: string | null;

  @ApiProperty({ type: () => TaskDto })
  task!: TaskDto;

  @ApiProperty({ type: () => UserDto })
  assigner!: UserDto;

  @ApiProperty({ type: () => UserDto })
  assignee!: UserDto;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: string;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  deletedAt?: string | null;
}
