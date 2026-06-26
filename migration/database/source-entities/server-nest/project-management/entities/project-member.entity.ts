import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";
import { Project } from "./project.entity";
import { User } from "@modules/user-management/entities/user.entity";

export enum ProjectMemberRole {
  OWNER = "owner",
  MANAGER = "manager",
  CONTRIBUTOR = "contributor",
  VIEWER = "viewer",
}

@Entity("project_members")
@Index(["projectId", "userId"], { unique: true })
export class ProjectMember extends BaseEntityExtended {
  @Column({ type: "uuid" })
  projectId: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({
    type: "varchar",
    length: 20,
    default: ProjectMemberRole.CONTRIBUTOR,
  })
  role: ProjectMemberRole;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: "projectId" })
  project: Project;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "userId" })
  user: User;
}
