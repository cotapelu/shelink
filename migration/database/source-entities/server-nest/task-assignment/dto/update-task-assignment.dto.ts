import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
} from "class-validator";
import { AssignmentStatus } from "../entities/task-assignment.entity";

export class UpdateTaskAssignmentDto {
  @ApiPropertyOptional({
    description: "The updated ID of the task being assigned",
    type: String,
  })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({
    description: "The updated ID of the user assigning the task",
    type: String,
  })
  @IsOptional()
  @IsUUID()
  assignerId?: string;

  @ApiPropertyOptional({
    description: "The updated ID of the user being assigned the task",
    type: String,
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: "The updated date when the task was assigned",
    type: String,
    format: "date-time",
  })
  @IsOptional()
  @IsDateString()
  assignedAt?: Date;

  @ApiPropertyOptional({
    description: "The updated due date for the assignment",
    type: String,
    format: "date-time",
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: Date | null;

  @ApiPropertyOptional({
    description: "Updated additional notes for the assignment",
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({
    enum: AssignmentStatus,
    description: "The updated status of the assignment",
  })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}
