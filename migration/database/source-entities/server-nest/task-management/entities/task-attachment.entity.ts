import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { Task } from "./task.entity";

@Entity("task_attachments")
export class TaskAttachment extends BaseEntityExtended {
  @Column({ type: "uuid" })
  taskId: string;

  @Column({ type: "varchar", length: 255 })
  filename: string;

  @Column({ type: "varchar", length: 1024 })
  url: string;

  @Column({ type: "varchar", length: 100 })
  mimeType: string;

  @Column({ type: "bigint" })
  size: string;

  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: "taskId" })
  task: Task;
}
