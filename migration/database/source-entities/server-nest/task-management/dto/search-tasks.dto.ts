import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class SearchTasksDto {
  @ApiPropertyOptional({
    description: "A search query to filter tasks by title or description",
  })
  @IsOptional()
  @IsString()
  q?: string;
}
