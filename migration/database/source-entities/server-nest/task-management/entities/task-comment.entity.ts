import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { Task } from "./task.entity";
import { User } from "@modules/user-management/entities/user.entity";

@Entity("task_comments")
export class TaskComment extends BaseEntityExtended {
  @Column({ type: "uuid" })
  taskId: string;

  @Column({ type: "uuid" })
  authorId: string;

  @Column({ type: "text" })
  content: string;

  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: "taskId" })
  task: Task;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "authorId" })
  author: User;
}
