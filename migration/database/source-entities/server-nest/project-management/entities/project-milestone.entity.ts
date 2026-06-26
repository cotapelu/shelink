import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { Project } from "./project.entity";

export enum MilestoneStatus {
  PLANNED = "planned",
  IN_PROGRESS = "in-progress",
  COMPLETED = "completed",
}

@Entity("project_milestones")
export class ProjectMilestone extends BaseEntityExtended {
  @Column({ type: "uuid" })
  projectId: string;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "datetime" })
  dueDate: Date;

  @Column({
    type: "varchar",
    length: 20,
    default: MilestoneStatus.PLANNED,
  })
  status: MilestoneStatus;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: "project_id" })
  project: Project;
}
