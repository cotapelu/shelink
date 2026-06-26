import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { User } from "@modules/user-management/entities/user.entity";
import { Workflow } from "@modules/workflow-management/entities/workflow.entity";
import { ObjectType, Field } from "@nestjs/graphql";

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in-progress",
  REVIEW = "review",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

@ObjectType()
@Entity("tasks")
export class Task extends BaseEntityExtended {
  @Field()
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Field(() => String, { nullable: true })
  @Column({ type: "text", nullable: true })
  description: string | null;

  @Field(() => String)
  @Column({ type: "varchar", length: 20, default: TaskStatus.TODO })
  status: TaskStatus;

  @Field(() => String)
  @Column({ type: "varchar", length: 20, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Field(() => Date, { nullable: true })
  @Column({ type: "datetime", nullable: true })
  dueDate: Date | null;

  @Field()
  @Column({ type: "uuid", name: "creator_id" })
  creatorId: string;

  // Relationships
  @Field(() => User)
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "creator_id" })
  creator: User;

  @Field(() => String, { nullable: true })
  @Column({ type: "uuid", name: "workflow_id", nullable: true })
  workflowId: string | null;

  @Field(() => Workflow, { nullable: true })
  @ManyToOne(() => Workflow, (workflow) => workflow.tasks, { nullable: true })
  @JoinColumn({ name: "workflow_id" })
  workflow: Workflow | null;
}
