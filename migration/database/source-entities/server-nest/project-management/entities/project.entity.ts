import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { User } from "@modules/user-management/entities/user.entity";
import { ObjectType, Field } from "@nestjs/graphql";

export enum ProjectStatus {
  PLANNING = "planning",
  ACTIVE = "active",
  ON_HOLD = "on-hold",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@ObjectType()
@Entity("projects")
export class Project extends BaseEntityExtended {
  @Field()
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Field(() => String, { nullable: true })
  @Column({ type: "text", nullable: true })
  description: string | null;

  @Field(() => String)
  @Column({
    type: "varchar",
    length: 20,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Field(() => Date, { nullable: true })
  @Column({ type: "datetime", nullable: true })
  startDate: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: "datetime", nullable: true })
  endDate: Date | null;

  @Field()
  @Column({ type: "uuid", name: "owner_id" })
  ownerId: string;

  @Field(() => String, { nullable: true })
  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  budget: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: "varchar", length: 3, nullable: true, default: "USD" })
  currency: string | null;

  // Relationships
  @Field(() => User)
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "owner_id" })
  owner: User;
}
