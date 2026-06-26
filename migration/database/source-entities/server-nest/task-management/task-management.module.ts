import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Task } from "./entities/task.entity";
import { TaskAttachment } from "./entities/task-attachment.entity";
import { TaskService } from "./services/task.service";
import { TaskAttachmentService } from "./services/task-attachment.service";
import { TaskController } from "./controllers/task.controller";
import { UserManagementModule } from "@modules/user-management/user-management.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskAttachment]),
    UserManagementModule,
  ],
  providers: [TaskService, TaskAttachmentService],
  controllers: [TaskController],
  exports: [TaskService, TaskAttachmentService, TypeOrmModule],
})
export class TaskManagementModule {}
