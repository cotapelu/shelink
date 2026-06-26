import { Expose } from "class-transformer";

export type RelationshipType =
  | "marriage"
  | "biological_child"
  | "adopted_child";

export class RelationshipDto {
  @Expose()
  id: string;

  @Expose()
  type: RelationshipType;

  @Expose()
  person_a: string;

  @Expose()
  person_b: string;

  @Expose()
  note: string | null;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;
}
