import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Project } from "./entities/project.entity";
import { ProjectService } from "./services/project.service";
import { ProjectController } from "./controllers/project.controller";
import { UserManagementModule } from "@modules/user-management/user-management.module";
import { TaskManagementModule } from "@modules/task-management/task-management.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    UserManagementModule,
    TaskManagementModule,
  ],
  providers: [ProjectService],
  controllers: [ProjectController],
  exports: [ProjectService],
})
export class ProjectManagementModule {}
