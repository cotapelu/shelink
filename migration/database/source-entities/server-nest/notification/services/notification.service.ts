import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Notification,
  NotificationStatus,
} from "../entities/notification.entity";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(userId: string, type: string, payload: any) {
    const n = this.repo.create({
      userId,
      payload: { type, ...payload },
    });
    return this.repo.save(n);
  }

  async list(userId: string, status?: NotificationStatus) {
    const where: any = { userId };
    if (status) where.status = status;
    return this.repo.find({ where, order: { createdAt: "DESC" } });
  }

  async markRead(id: string) {
    await this.repo.update({ id }, { status: NotificationStatus.READ });
  }

  async markAllRead(userId: string) {
    await this.repo.update(
      { userId, status: NotificationStatus.UNREAD },
      { status: NotificationStatus.READ },
    );
  }
}
