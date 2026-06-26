import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { Task } from "./task.entity";
import { User } from "@modules/user-management/entities/user.entity";

@Entity("task_checklist_items")
export class TaskChecklistItem extends BaseEntityExtended {
  @Column({ type: "uuid" })
  taskId: string;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "boolean", default: false })
  done: boolean;

  @Column({ type: "int", default: 0 })
  order: number;

  @Column({ type: "datetime", nullable: true })
  dueDate: Date | null;

  @Column({ type: "uuid", nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: "taskId" })
  task: Task;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "assigneeId" })
  assignee: User | null;
}
