import { Expose } from "class-transformer";

export type EventType =
  | "birthday"
  | "death_anniversary"
  | "marriage"
  | "custom";

export class EventDto {
  @Expose()
  id: string;

  @Expose()
  type: EventType;

  @Expose()
  name: string;

  @Expose()
  event_date: Date;

  @Expose()
  location: string | null;

  @Expose()
  content: string | null;

  @Expose()
  person_id: string | null;

  @Expose()
  created_by: string | null;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;
}
