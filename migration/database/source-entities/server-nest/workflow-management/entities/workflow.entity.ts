import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { User } from "@modules/user-management/entities/user.entity";
import { Task } from "@modules/task-management/entities/task.entity";
import { ObjectType, Field } from "@nestjs/graphql";

export enum WorkflowStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

@ObjectType()
@Entity("workflows")
export class Workflow extends BaseEntityExtended {
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
    default: WorkflowStatus.ACTIVE,
  })
  status: WorkflowStatus;

  @Column({ type: "varchar", length: 100, nullable: true })
  category: string | null;

  @Field(() => [String])
  @Column({ type: "simple-json" })
  steps: Array<{
    id: string;
    name: string;
    order: number;
  }>;

  @Field()
  @Column({ type: "uuid", name: "owner_id" })
  ownerId: string;

  // Relationships
  @Field(() => User)
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "owner_id" })
  owner: User;

  @Field(() => [Task], { nullable: true })
  @OneToMany(() => Task, (task) => task.workflow)
  tasks: Task[];
}
