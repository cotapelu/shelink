import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Workflow } from "./entities/workflow.entity";
import { WorkflowAudit } from "./entities/workflow-audit.entity";
import { WorkflowService } from "./services/workflow.service";
import { WorkflowController } from "./controllers/workflow.controller";
import { UserManagementModule } from "@modules/user-management/user-management.module";
import { WorkflowTransitionService } from "./services/workflow-transition.service";

import { TaskManagementModule } from "@modules/task-management/task-management.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowAudit]),
    UserManagementModule,
    TaskManagementModule,
  ],
  providers: [WorkflowService, WorkflowTransitionService],
  controllers: [WorkflowController],
  exports: [WorkflowService, WorkflowTransitionService],
})
export class WorkflowManagementModule {}
