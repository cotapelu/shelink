import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MinLength,
  IsUUID,
} from "class-validator";
import { InputType, Field } from "@nestjs/graphql";
import { TaskStatus, TaskPriority } from "../entities/task.entity";

@InputType()
export class UpdateTaskDto {
  @ApiPropertyOptional({ description: "The updated title of the task" })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({
    description: "The updated description of the task",
    type: String,
    nullable: true,
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: TaskStatus,
    description: "The updated status of the task",
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: TaskPriority,
    description: "The updated priority of the task",
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: "The updated due date of the task",
    type: String,
    format: "date-time",
    nullable: true,
  })
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  dueDate?: Date | null;

  @ApiPropertyOptional({
    description: "The updated ID of the workflow this task belongs to",
    type: String,
    nullable: true,
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  workflowId?: string | null;
}
