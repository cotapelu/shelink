import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Person } from "../../persons/entities/person.entity";

export type EventType =
  | "birthday"
  | "death_anniversary"
  | "marriage"
  | "custom";

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 30, default: "custom" })
  type: EventType;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "date" })
  event_date: Date;

  @Column({ type: "text", nullable: true })
  location: string | null;

  @Column({ type: "text", nullable: true })
  content: string | null;

  // Link to person (if personal event)
  @ManyToOne(() => Person, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "person_id" })
  person: Person | null;

  @Column({ type: "uuid", nullable: true })
  person_id: string | null;

  // Created by user
  @Column({ type: "uuid", nullable: true })
  created_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
