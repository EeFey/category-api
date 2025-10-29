// src/modules/categories/dto/get-category-tree.dto.ts
import { IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetCategoryTreeDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' ? true : false)
  includeCounts?: boolean = false;
}
