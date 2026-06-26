import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FilesController } from "./files.controller";
import { TaskAttachment } from "@modules/task-management/entities/task-attachment.entity";

@Module({
  imports: [TypeOrmModule.forFeature([TaskAttachment])],
  controllers: [FilesController],
})
export class FilesModule {}
