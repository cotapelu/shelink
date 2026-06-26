import { Entity, Column, ManyToOne, Index, JoinColumn } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { Task } from "./task.entity";
import { User } from "@modules/user-management/entities/user.entity";

@Entity("task_watchers")
@Index(["taskId", "userId"], { unique: true })
export class TaskWatcher extends BaseEntityExtended {
  @Column({ type: "uuid" })
  taskId: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: "taskId" })
  task: Task;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "userId" })
  user: User;
}
