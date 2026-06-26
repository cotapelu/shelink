import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  MinLength,
} from "class-validator";
import { InputType, Field } from "@nestjs/graphql";
import { TaskStatus, TaskPriority } from "../entities/task.entity";

@InputType()
export class CreateTaskDto {
  @ApiProperty({ description: "The title of the task" })
  @Field()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({
    description: "The description of the task",
    type: String,
    nullable: true,
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: TaskStatus,
    default: "todo",
    description: "The status of the task",
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: TaskPriority,
    default: "medium",
    description: "The priority of the task",
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: "The due date of the task",
    type: String,
    format: "date-time",
    nullable: true,
  })
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  dueDate?: Date | null;

  @ApiProperty({ description: "The ID of the user creating the task" })
  @Field()
  @IsUUID()
  creatorId: string;

  @ApiPropertyOptional({
    description: "The ID of the workflow this task belongs to",
  })
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  workflowId?: string;
}
