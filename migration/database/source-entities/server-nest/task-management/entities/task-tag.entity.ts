import { Entity, Column, ManyToOne, Index, JoinColumn } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { Task } from "./task.entity";

@Entity("task_tags")
@Index(["taskId", "tag"], { unique: true })
export class TaskTag extends BaseEntityExtended {
  @Column({ type: "uuid" })
  taskId: string;

  @Column({ type: "varchar", length: 50 })
  tag: string;

  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: "taskId" })
  task: Task;
}
