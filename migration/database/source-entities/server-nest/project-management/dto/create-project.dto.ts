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
import { ProjectStatus } from "../entities/project.entity";

@InputType()
export class CreateProjectDto {
  @ApiProperty({ description: "The name of the project" })
  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: "The description of the project",
    type: String,
    nullable: true,
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    description: "The status of the project",
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    description: "The start date of the project",
    type: String,
    format: "date-time",
  })
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: Date | null;

  @ApiPropertyOptional({
    description: "The end date of the project",
    type: String,
    format: "date-time",
  })
  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: Date | null;

  @ApiProperty({ description: "The ID of the user who owns the project" })
  @Field()
  @IsUUID()
  ownerId: string;
}
