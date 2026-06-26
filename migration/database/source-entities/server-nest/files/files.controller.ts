import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { join, extname } from "path";
import { existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TaskAttachment } from "@modules/task-management/entities/task-attachment.entity";
import { Permissions } from "@auth/decorators/permissions.decorator";
import { Permission } from "@auth/permissions";
import { basename } from "path";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiCreatedResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UploadResponseDto } from "@modules/files/dto/upload-response.dto";

function storageForTask(taskId: string) {
  const dest = join(process.cwd(), "uploads", "tasks", taskId);
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  return dest;
}

@Controller("files")
@ApiBearerAuth()
@ApiTags("Files")
export class FilesController {
  constructor(
    @InjectRepository(TaskAttachment)
    private readonly attachments: Repository<TaskAttachment>,
  ) {}

  @Post("tasks/:taskId")
  @Permissions(Permission.TASK_UPDATE)
  @ApiParam({ name: "taskId", schema: { type: "string", format: "uuid" } })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @ApiCreatedResponse({ type: UploadResponseDto })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = storageForTask(req.params.taskId);
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const ext = extname(file.originalname || "file");
          const name = `${Date.now()}-${randomUUID()}${ext}`;
          cb(null, name);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = new Set([
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/webp",
          "application/pdf",
          "text/plain",
          "application/zip",
        ]);
        if (!allowed.has(file.mimetype)) {
          return cb(new BadRequestException("Unsupported file type"), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadTaskAttachment(
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = `/uploads/tasks/${taskId}/${file.filename}`;
    const entity = this.attachments.create({
      taskId,
      filename: basename(file.originalname || "file").replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      ),
      url,
      mimeType: file.mimetype,
      size: String(file.size),
    });
    const saved = await this.attachments.save(entity);
    return { id: saved.id, url };
  }
}
