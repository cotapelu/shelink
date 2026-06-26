import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  IsEmail,
} from "class-validator";
import { UserRole, UserStatus } from "../entities/user.entity";

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "The updated first name of the user" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @ApiPropertyOptional({ description: "The updated last name of the user" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @ApiPropertyOptional({ description: "The updated email of the user" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: "The updated password (at least 6 characters)",
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: "The updated role of the user",
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: "The updated status of the user",
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
