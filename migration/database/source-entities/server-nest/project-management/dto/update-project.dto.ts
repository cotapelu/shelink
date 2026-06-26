import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  MinLength,
} from "class-validator";
import { InputType, Field } from "@nestjs/graphql";
import { ProjectStatus } from "../entities/project.entity";

@InputType()
export class UpdateProjectDto {
  @ApiPropertyOptional({ description: "The updated name of the project" })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    description: "The updated description of the project",
    type: String,
    nullable: true,
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    description: "The updated status of the project",
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    description: "The updated start date of the project",
    type: String,
    format: "date-time",
    nullable: true,
  })
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: Date | null;

  @ApiPropertyOptional({
    description: "The updated end date of the project",
    type: String,
    format: "date-time",
    nullable: true,
  })
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: Date | null;

  @ApiPropertyOptional({
    description: "The updated ID of the user who owns the project",
    type: String,
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
