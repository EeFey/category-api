import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CategoryPreview } from './interfaces/category-preview.interface';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findExistingCategoryIds(categoryIds: bigint[]): Promise<bigint[]> {
    if (!categoryIds.length) return [];

    const rows = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    });

    return rows.map((r) => r.id);
  }

  async findAllCategories(): Promise<CategoryPreview[]> {
    return this.prisma.category.findMany({
      select: { id: true, name: true, parentId: true },
      orderBy: { id: 'asc' },
    });
  }

  async countAttributesByCategory(): Promise<{ categoryId: bigint; _count: { attributeId: number } }[]> {
    const result = await this.prisma.categoryAttribute.groupBy({
      by: ['categoryId'],
      _count: { attributeId: true },
    });

    return result as Array<{ categoryId: bigint; _count: { attributeId: number } }>;
  }

  async countProductsByCategory(): Promise<{ categoryId: bigint; _count: { id: number } }[]> {
    const sql = Prisma.sql`
      SELECT ct."ancestorId" AS "categoryId", COUNT(p.id) AS "count"
      FROM "CategoryTree" ct
      JOIN "Product" p ON p."categoryId" = ct."descendantId"
      GROUP BY ct."ancestorId"
    `
    const rows = await this.prisma.$queryRaw(sql) as Array<{ categoryId: bigint; count: bigint }>

    return rows.map((r) => ({ categoryId: r.categoryId, _count: { id: Number(r.count) } }));
  }
}
