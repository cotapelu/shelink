import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  MinLength,
} from "class-validator";
import { WorkflowStatus } from "../entities/workflow.entity";
import { WorkflowStepDto } from "./workflow-step.dto";

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ description: "The updated name of the workflow" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    description: "The updated description of the workflow",
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: WorkflowStatus,
    description: "The updated status of the workflow",
  })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiPropertyOptional({
    type: [WorkflowStepDto],
    description: "The updated steps in the workflow",
  })
  @IsOptional()
  @IsArray()
  steps?: WorkflowStepDto[];

  @ApiPropertyOptional({
    description: "The updated ID of the user who owns the workflow",
    type: String,
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({
    description: "The updated category of the workflow",
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  category?: string | null;
}
