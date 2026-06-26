import { IsString, IsOptional, IsIn } from "class-validator";

export const RELATIONSHIP_TYPE_VALUES = [
  "marriage",
  "biological_child",
  "adopted_child",
] as const;

export class CreateRelationshipDto {
  @IsIn(RELATIONSHIP_TYPE_VALUES)
  type: "marriage" | "biological_child" | "adopted_child";

  @IsString()
  person_a: string;

  @IsString()
  person_b: string;

  @IsOptional()
  @IsString()
  note?: string | null;
}
