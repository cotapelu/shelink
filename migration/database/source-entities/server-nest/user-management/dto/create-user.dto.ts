import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
} from "class-validator";
import { Field, InputType } from "@nestjs/graphql";
import { UserRole, UserStatus } from "../entities/user.entity";

@InputType()
export class CreateUserDto {
  @ApiProperty({ example: "John", description: "The first name of the user" })
  @Field()
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: "Doe", description: "The last name of the user" })
  @Field()
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({
    example: "john.doe@example.com",
    description: "The email of the user",
  })
  @Field()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: "password123",
    description: "The user's password (at least 6 characters)",
    minLength: 6,
  })
  @Field()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    required: false,
    enum: UserRole,
    default: "employee",
    description: "The role of the user",
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    required: false,
    enum: UserStatus,
    default: "active",
    description: "The status of the user",
  })
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
