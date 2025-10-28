import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

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
}
