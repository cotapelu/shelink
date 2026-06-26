import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { Workflow } from "./workflow.entity";
import { Task } from "@modules/task-management/entities/task.entity";
import { User } from "@modules/user-management/entities/user.entity";

@Entity("workflow_audits")
export class WorkflowAudit extends BaseEntityExtended {
  @Column({ type: "uuid", nullable: true })
  workflowId: string | null;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "uuid" })
  taskId: string;

  @Column({ type: "varchar", length: 50 })
  fromStatus: string;

  @Column({ type: "varchar", length: 50 })
  toStatus: string;

  @Column({ type: "uuid" })
  actorId: string;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @ManyToOne(() => Workflow, { nullable: true })
  @JoinColumn({ name: "workflowId" })
  workflow: Workflow | null;

  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: "taskId" })
  task: Task;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "actorId" })
  actor: User;
}
