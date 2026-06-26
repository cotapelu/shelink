import { Expose } from "class-transformer";

export type Gender = "male" | "female" | "other";

export class PersonDto {
  @Expose()
  id: string;

  @Expose()
  full_name: string;

  @Expose()
  gender: Gender;

  @Expose()
  birth_year: number | null;

  @Expose()
  birth_month: number | null;

  @Expose()
  birth_day: number | null;

  @Expose()
  death_year: number | null;

  @Expose()
  death_month: number | null;

  @Expose()
  death_day: number | null;

  @Expose()
  is_deceased: boolean;

  @Expose()
  is_in_law: boolean;

  @Expose()
  birth_order: number | null;

  @Expose()
  generation: number | null;

  @Expose()
  other_names: string | null;

  @Expose()
  avatar_url: string | null;

  @Expose()
  note: string | null;

  // Private fields - only for admin/self
  @Expose()
  phone_number?: string | null;

  @Expose()
  occupation?: string | null;

  @Expose()
  current_residence?: string | null;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;
}
