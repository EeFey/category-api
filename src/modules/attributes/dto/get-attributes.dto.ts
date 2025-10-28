import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../../common/pagination/dto/pagination.dto';

export type LinkType = 'direct' | 'inherited' | 'global';
export type AttributeSortBy = 'id' | 'name' | 'key' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export class GetAttributesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  keyword?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return value;
    const arr = Array.isArray(value) ? value : [value];
    return arr.map((v) => BigInt(v));
  })
  categoryIds?: bigint[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return value;
    return Array.isArray(value) ? value : [value];
  })
  @IsIn(['direct', 'inherited', 'global'], { each: true })
  linkTypes?: LinkType[];

  @IsOptional()
  @Type(() => Boolean)
  notApplicable?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['id', 'name', 'key', 'createdAt', 'updatedAt'])
  sortBy?: AttributeSortBy = 'name';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: SortOrder = 'asc';
}
