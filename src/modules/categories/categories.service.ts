import { Injectable } from '@nestjs/common';
import { PinoLogger } from '../../common/logger/pino.logger';
import { CategoriesRepository } from './categories.repository';
import { CategoryNodeDto } from './dto/category-node.dto';
import { plainToInstance } from 'class-transformer';
import { CategoryNode } from './interfaces/category-node.interface';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly repo: CategoriesRepository,
    private readonly logger: PinoLogger,
  ) { }

  // Builds a tree of categories with optional counts
  async getCategoryTree(includeCounts = false): Promise<CategoryNodeDto[]> {
    const [categories, attrCounts, productCounts] = await Promise.all([
      this.repo.findAllCategories(),
      includeCounts ? this.repo.countAttributesByCategory() : Promise.resolve([]),
      includeCounts ? this.repo.countProductsByCategory() : Promise.resolve([]),
    ]);

    const attrCountMap = this.buildCountsMap(attrCounts, 'categoryId', '_count', 'attributeId');
    const productCountMap = this.buildCountsMap(productCounts, 'categoryId', '_count', 'id');

    const nodeMap = new Map<bigint, CategoryNode>();
    categories.forEach((c) => {
      nodeMap.set(c.id, {
        id: c.id,
        name: c.name,
        parentId: c.parentId,
        children: [],
        attributeCount: includeCounts ? (attrCountMap.get(c.id) ?? 0) : undefined,
        productCount: includeCounts ? (productCountMap.get(c.id) ?? 0) : undefined,
      });
    })

    const tree = this.buildTree(nodeMap);
    return plainToInstance(CategoryNodeDto, tree, { excludeExtraneousValues: true });
  }

  // Builds a nested tree
  private buildTree(nodeMap: Map<bigint, CategoryNode>): CategoryNode[] {
    const nodes = Array.from(nodeMap.values());
    const roots: CategoryNode[] = [];

    nodes.forEach((n) => {
      if (n.parentId === null) {
        roots.push(n);
      } else {
        const parent = nodeMap.get(n.parentId);
        if (parent) {
          parent.children.push(n);
        } else {
          this.logger.warn(`Orphaned node found: ${n.name} (ID: ${n.id}) references non-existent parent ID: ${n.parentId}`);
          roots.push(n);
        }
      }
    })
    return roots;
  }

  // Builds a map of counts from a list of rows.
  private buildCountsMap(
    rows: any[],
    idKey: string,
    countContainerKey: string,
    countKey: string,
  ): Map<bigint, number> {
    const map = new Map<bigint, number>();
    (rows || []).forEach((r) => {
      const count = r[countContainerKey]?.[countKey];
      map.set(r[idKey], typeof count === 'number' ? count : Number(count ?? 0));
    });
    return map;
  }

}
