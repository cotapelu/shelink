import { Entity, Column, Index } from "typeorm";
import { BaseEntityExtended } from "@database/base.entity";

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
}

@Entity("notifications")
@Index(["userId", "status"])
export class Notification extends BaseEntityExtended {
  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "simple-json" })
  payload: any;

  @Column({
    type: "varchar",
    length: 20,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;
}
