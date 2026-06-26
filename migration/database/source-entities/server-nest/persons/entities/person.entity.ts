import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type Gender = "male" | "female" | "other";

@Entity("persons")
@Index("idx_persons_name", ["full_name"])
@Index("idx_persons_generation", ["generation"])
@Index("idx_persons_gender", ["gender"])
@Index("idx_persons_birth_year", ["birth_year"])
export class Person {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  full_name: string;

  @Column({ type: "varchar", length: 20, default: "male" })
  gender: Gender;

  @Column({ type: "int", nullable: true })
  @Index()
  birth_year: number | null;

  @Column({ type: "int", nullable: true })
  birth_month: number | null;

  @Column({ type: "int", nullable: true })
  birth_day: number | null;

  @Column({ type: "int", nullable: true })
  @Index()
  death_year: number | null;

  @Column({ type: "int", nullable: true })
  death_month: number | null;

  @Column({ type: "int", nullable: true })
  death_day: number | null;

  @Column({ type: "boolean", default: false })
  is_deceased: boolean;

  @Column({ type: "boolean", default: false })
  is_in_law: boolean;

  @Column({ type: "int", nullable: true })
  @Index()
  birth_order: number | null;

  @Column({ type: "int", nullable: true })
  @Index()
  generation: number | null;

  @Column({ type: "text", nullable: true })
  other_names: string | null;

  @Column({ type: "text", nullable: true })
  avatar_url: string | null;

  @Column({ type: "text", nullable: true })
  note: string | null;

  // Private fields
  @Column({ type: "text", nullable: true })
  phone_number: string | null;

  @Column({ type: "text", nullable: true })
  occupation: string | null;

  @Column({ type: "text", nullable: true })
  current_residence: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
