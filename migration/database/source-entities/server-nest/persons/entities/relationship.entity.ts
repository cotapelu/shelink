import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Person } from "./person.entity";

export type RelationshipType =
  | "marriage"
  | "biological_child"
  | "adopted_child";

@Entity("relationships")
export class Relationship {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 30 })
  type: RelationshipType;

  @ManyToOne(() => Person, { onDelete: "CASCADE" })
  @JoinColumn({ name: "person_a" })
  personA: Person;

  @Column({ type: "uuid" })
  person_a: string;

  @ManyToOne(() => Person, { onDelete: "CASCADE" })
  @JoinColumn({ name: "person_b" })
  personB: Person;

  @Column({ type: "uuid" })
  person_b: string;

  @Column({ type: "text", nullable: true })
  note: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
