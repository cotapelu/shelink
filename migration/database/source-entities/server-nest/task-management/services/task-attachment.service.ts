import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TaskAttachment } from "../entities/task-attachment.entity";

@Injectable()
export class TaskAttachmentService {
  constructor(
    @InjectRepository(TaskAttachment)
    private readonly repo: Repository<TaskAttachment>,
  ) {}

  async listByTask(taskId: string) {
    return this.repo.find({ where: { taskId }, order: { createdAt: "DESC" } });
  }
}
