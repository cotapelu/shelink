import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
} from "class-validator";
import { InputType, Field } from "@nestjs/graphql";
import { AssignmentStatus } from "../entities/task-assignment.entity";

@InputType()
export class CreateTaskAssignmentDto {
  @ApiProperty({ description: "The ID of the task being assigned" })
  @Field()
  @IsUUID()
  taskId: string;

  @ApiProperty({ description: "The ID of the user assigning the task" })
  @Field()
  @IsUUID()
  assignerId: string;

  @ApiProperty({ description: "The ID of the user being assigned the task" })
  @Field()
  @IsUUID()
  assigneeId: string;

  @ApiProperty({ description: "The date when the task was assigned" })
  @Field()
  @IsDateString()
  assignedAt: Date;

  @ApiPropertyOptional({
    description: "The due date for the assignment",
    type: String,
    format: "date-time",
  })
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  dueDate?: Date | null;

  @ApiPropertyOptional({
    description: "Additional notes for the assignment",
    type: String,
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({
    enum: AssignmentStatus,
    default: "pending",
    description: "The status of the assignment",
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}
