import { Expose, Type, Transform } from 'class-transformer';

export class CategoryNodeDto {
  @Expose()
  @Transform(({ value }) => value.toString())
  id: string;

  @Expose()
  name: string;

  @Expose()
  @Transform(({ value }) => value === null ? null : value.toString())
  parentId: string | null;

  @Expose()
  @Type(() => CategoryNodeDto)
  children: CategoryNodeDto[] = [];

  @Expose()
  attributeCount?: number;

  @Expose()
  productCount?: number;

  constructor(init?: Partial<CategoryNodeDto>) {
    Object.assign(this, init);
  }
}
