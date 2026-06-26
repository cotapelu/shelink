import {
  IsString,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsIn,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";

export const GENDER_VALUES = ["male", "female", "other"] as const;

export class CreatePersonDto {
  @IsString()
  full_name: string;

  @IsOptional()
  @IsString()
  other_names?: string | null;

  @IsIn(GENDER_VALUES)
  gender: "male" | "female" | "other";

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(9999)
  birth_year?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  birth_month?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  birth_day?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(9999)
  death_year?: number | null;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(12)
  death_month?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  death_day?: number | null;

  @IsBoolean()
  @IsOptional()
  is_deceased?: boolean = false;

  @IsBoolean()
  @IsOptional()
  is_in_law?: boolean = false;

  @IsOptional()
  @IsInt()
  birth_order?: number | null;

  @IsOptional()
  @IsInt()
  generation?: number | null;

  @IsOptional()
  @IsString()
  avatar_url?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;

  // Private fields
  @IsOptional()
  @IsString()
  phone_number?: string | null;

  @IsOptional()
  @IsString()
  occupation?: string | null;

  @IsOptional()
  @IsString()
  current_residence?: string | null;
}
