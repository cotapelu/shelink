import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  MinLength,
} from "class-validator";
import { InputType, Field, ObjectType } from "@nestjs/graphql";
import { WorkflowStatus } from "../entities/workflow.entity";

@ObjectType()
export class WorkflowStep {
  @ApiProperty({ description: "The unique ID of the step" })
  @Field()
  id: string;

  @ApiProperty({ description: "The name of the step" })
  @Field()
  name: string;

  @ApiProperty({ description: "The order of the step in the workflow" })
  @Field()
  order: number;
}

@InputType()
export class CreateWorkflowDto {
  @ApiProperty({ description: "The name of the workflow" })
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: "The description of the workflow",
    type: String,
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: WorkflowStatus,
    default: "active",
    description: "The status of the workflow",
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiProperty({
    type: [WorkflowStep],
    description: "The steps in the workflow",
  })
  @Field(() => [WorkflowStep])
  @IsArray()
  steps: Array<{ id: string; name: string; order: number }>;

  @ApiPropertyOptional({
    description: "The category of the workflow",
    type: String,
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiProperty({ description: "The ID of the user who owns the workflow" })
  @Field()
  @IsUUID()
  ownerId: string;
}
