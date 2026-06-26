import { ApiProperty } from "@nestjs/swagger";

export class UploadResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  url!: string;
}
