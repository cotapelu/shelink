import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TaskAssignment } from "./entities/task-assignment.entity";
import { TaskAssignmentService } from "./services/task-assignment.service";
import { TaskAssignmentController } from "./controllers/task-assignment.controller";
import { UserManagementModule } from "@modules/user-management/user-management.module";
import { TaskManagementModule } from "@modules/task-management/task-management.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskAssignment]),
    UserManagementModule,
    TaskManagementModule,
  ],
  providers: [TaskAssignmentService],
  controllers: [TaskAssignmentController],
  exports: [TaskAssignmentService],
})
export class TaskAssignmentModule {}
