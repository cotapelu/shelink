import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Task,
  TaskStatus,
} from "@modules/task-management/entities/task.entity";
import { WorkflowAudit } from "../entities/workflow-audit.entity";

const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.REVIEW, TaskStatus.CANCELLED],
  [TaskStatus.REVIEW]: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.CANCELLED]: [],
};

@Injectable()
export class WorkflowTransitionService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(WorkflowAudit)
    private readonly audits: Repository<WorkflowAudit>,
  ) {}

  async transition(
    taskId: string,
    to: TaskStatus,
    actorId: string,
    notes?: string,
  ) {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException("Task not found");
    const allowed = ALLOWED[task.status] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Transition ${task.status} -> ${to} not allowed`,
      );
    }
    const from = task.status;
    task.status = to;
    await this.tasks.save(task);
    const audit = this.audits.create({
      taskId,
      workflowId: task.workflowId || null,
      fromStatus: from,
      toStatus: to,
      actorId,
      notes: notes || null,
    });
    await this.audits.save(audit);
    return task;
  }
}
