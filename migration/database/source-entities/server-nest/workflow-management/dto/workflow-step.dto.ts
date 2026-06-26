import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional } from "class-validator";

export class WorkflowStepDto {
  @ApiProperty({ description: "The unique ID of the step" })
  @IsString()
  id: string;

  @ApiProperty({ description: "The name of the step" })
  @IsString()
  name: string;

  @ApiProperty({ description: "The order of the step in the workflow" })
  @IsNumber()
  order: number;

  @ApiPropertyOptional({ description: "An optional description for the step" })
  @IsOptional()
  @IsString()
  description?: string;
}
