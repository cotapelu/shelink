import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { Task } from "@modules/task-management/entities/task.entity";
import { User } from "@modules/user-management/entities/user.entity";
import { ObjectType, Field } from "@nestjs/graphql";

export enum AssignmentStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  IN_PROGRESS = "in-progress",
  COMPLETED = "completed",
}

@ObjectType()
@Entity("task_assignments")
export class TaskAssignment extends BaseEntityExtended {
  @Field()
  @Column({ type: "uuid" })
  taskId: string;

  @Field()
  @Column({ type: "uuid" })
  assignerId: string;

  @Field()
  @Column({ type: "uuid" })
  assigneeId: string;

  @Field(() => Date)
  @Column({ type: "datetime" })
  assignedAt: Date;

  @Field(() => Date, { nullable: true })
  @Column({ type: "datetime", nullable: true })
  dueDate: Date | null;

  @Field(() => String)
  @Column({
    type: "varchar",
    length: 20,
    default: AssignmentStatus.PENDING,
  })
  status: AssignmentStatus;

  // Relationships
  @Field(() => Task)
  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: "taskId" })
  task: Task;

  @Field(() => User)
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "assignerId" })
  assigner: User;

  @Field(() => User)
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "assigneeId" })
  assignee: User;

  @Field(() => String, { nullable: true })
  @Column({ type: "text", nullable: true })
  notes: string | null;
}
