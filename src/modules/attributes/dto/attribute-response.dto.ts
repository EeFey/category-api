import { AttributeType } from '@prisma/client';
import { Transform, Expose } from 'class-transformer';
import type { LinkType } from '../../../common/types/attribute-link.type';

export class AttributeResponseDto {
  @Expose()
  @Transform(({ value }) => value.toString())
  id: string;

  @Expose()
  key: string;

  @Expose()
  name: string;

  @Expose()
  type: AttributeType;

  @Expose()
  linkType: LinkType;
}