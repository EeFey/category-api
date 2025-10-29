import { AttributeType } from '@prisma/client';
import { LinkType } from '../../../common/types/attribute-link.type';

export interface AttributeQueryResult {
  id: bigint;
  key: string;
  name: string;
  type: AttributeType;
  linkType: LinkType;
}