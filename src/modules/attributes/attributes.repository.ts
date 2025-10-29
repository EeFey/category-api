import { Injectable } from '@nestjs/common';
import { Prisma, Attribute } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GetAttributesDto } from './dto/get-attributes.dto';
import { AttributeQueryResult } from './interfaces/attribute-query-result.interface';

@Injectable()
export class AttributesRepository {
  constructor(private readonly prisma: PrismaService) { }

  async countAttributes(where: Prisma.AttributeWhereInput): Promise<number> {
    return await this.prisma.attribute.count({ where });
  }

  async findManyAttributes(params: {
    offset?: number;
    limit?: number;
    where?: Prisma.AttributeWhereInput;
    orderBy?: Prisma.AttributeOrderByWithRelationInput;
  }): Promise<Attribute[]> {
    const { offset, limit, where, orderBy } = params;
    return this.prisma.attribute.findMany({
      skip: offset,
      take: limit,
      where,
      orderBy,
    });
  }

  buildSearchFilter(keyword?: string): Prisma.AttributeWhereInput {
    if (!keyword || keyword.length === 0) {
      return {};
    }

    return {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { key: { contains: keyword, mode: 'insensitive' } },
      ],
    };
  }

  /**
   * Query attributes by category IDs with various filters.
   * 
   * Supports:
   *  - keyword search
   *  - filtering by linkTypes
   *  - notApplicable flag ("linkType" IS NULL)
   *  - pagination and sorting
   *
   * Returns { rows, total } where rows are the data page and total is matching count.
   */
  async queryAttributesByCategoryIds(dto: GetAttributesDto): Promise<{ rows: AttributeQueryResult[]; total: number }> {
    const {
      categoryIds,
      keyword,
      linkTypes,
      notApplicable,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
    } = dto;

    const offset = (page - 1) * limit;

    // Build WHERE pieces
    const whereParts: Prisma.Sql[] = [Prisma.sql`1=1`];

    if (typeof notApplicable === 'boolean' && notApplicable === true) {
      whereParts.push(Prisma.sql`t."linkType" IS NULL`);
    } else if (linkTypes && linkTypes.length > 0) {
      const typeParams = Prisma.join(linkTypes.map((t) => Prisma.sql`${t}`));
      whereParts.push(Prisma.sql`t."linkType" IN (${typeParams})`);
    } else {
      whereParts.push(Prisma.sql`t."linkType" IS NOT NULL`);
    }

    if (keyword && keyword.length > 0) {
      const pattern = `%${keyword}%`;
      whereParts.push(Prisma.sql`(a.name ILIKE ${pattern} OR a.key ILIKE ${pattern})`);
    }

    const whereSql = Prisma.join(whereParts, " AND ");

    // Build the base CTE
    const baseSql = this.buildAttributeLinksBaseSql(categoryIds ?? [] as bigint[]);

    // Build the two parameterized queries using the baseSql CTE
    const countSql = Prisma.sql`
      WITH "attributeLinks" AS (${baseSql})
      SELECT COUNT(*) AS total
      FROM "Attribute" a
      LEFT JOIN "attributeLinks" t ON t."attributeId" = a.id
      WHERE ${whereSql};
    `;

    const dataSql = Prisma.sql`
      WITH "attributeLinks" AS (${baseSql})
      SELECT a.id, a.key, a.name, a.type, t."linkType"
      FROM "Attribute" a
      LEFT JOIN "attributeLinks" t ON t."attributeId" = a.id
      WHERE ${whereSql}
      ORDER BY a.${Prisma.raw(sortBy)} ${Prisma.raw(sortOrder)}
      LIMIT ${limit} OFFSET ${offset};
    `;

    const totalRes = await this.prisma.$queryRaw(countSql) as Array<{ total: bigint }>;
    const total = Number(totalRes[0]?.total ?? 0);

    const rows = (await this.prisma.$queryRaw(dataSql)) as AttributeQueryResult[];

    return { rows, total };
  }

  /**
   * Build the base SQL fragment that yields rows: ("attributeId", "linkType")
   * "linkType" values: 'global' | 'direct' | 'inherited' | NULL (not applicable)
   * 
   * For scaling, pre-computing this as with a maintained table
   */
  private buildAttributeLinksBaseSql(categoryIds: bigint[]): Prisma.Sql {
    if (!categoryIds || categoryIds.length === 0) {
      throw new Error('categoryIds required to build attribute link base SQL');
    }

    const catParams = Prisma.join(categoryIds.map((id) => Prisma.sql`${id}`));

    const base = Prisma.sql`
      SELECT a.id AS "attributeId",
        CASE
          WHEN NOT EXISTS (
            SELECT 1 FROM "CategoryAttribute" ca WHERE ca."attributeId" = a.id
          ) THEN 'global'
          WHEN EXISTS (
            SELECT 1 FROM "CategoryAttribute" ca
            WHERE ca."attributeId" = a.id
              AND ca."categoryId" IN (${catParams})
          ) THEN 'direct'
          WHEN EXISTS (
            SELECT 1 FROM "CategoryAttribute" ca
            WHERE ca."attributeId" = a.id
              AND ca."categoryId" IN (
                SELECT DISTINCT "ancestorId" FROM "CategoryTree" WHERE "descendantId" IN (${catParams})
              )
          ) THEN 'inherited'
          ELSE NULL
        END AS "linkType"
      FROM "Attribute" a
    `;

    return base;
  }
}
