import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsIn,
} from "class-validator";

export const EVENT_TYPE_VALUES = [
  "birthday",
  "death_anniversary",
  "marriage",
  "custom",
] as const;

export class CreateEventDto {
  @IsIn(EVENT_TYPE_VALUES)
  type: "birthday" | "death_anniversary" | "marriage" | "custom";

  @IsString()
  name: string;

  @IsDateString()
  event_date: string; // ISO date string

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  @IsUUID("4", { each: true })
  person_id?: string | null;
}
