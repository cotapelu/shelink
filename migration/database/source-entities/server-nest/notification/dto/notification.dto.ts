import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NotificationStatus } from "../entities/notification.entity";

export class NotificationDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  userId!: string;

  @ApiProperty({ type: "object", additionalProperties: true })
  payload!: Record<string, any>;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: string;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  deletedAt?: string | null;
}
