import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/common/prisma/prisma.service';
import { setupIntegrationTest, tearDownIntegrationTest } from '../test-setup';
import { CategoriesService } from '../../../src/modules/categories/categories.service';
import { CategoriesRepository } from '../../../src/modules/categories/categories.repository';
import { Category } from '@prisma/client';

describe('CategoriesService (integration)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;
  let service: CategoriesService;
  let repo: CategoriesRepository;

  let gamingLaptops: Category;
  let iphones: Category;
  let laptops: Category;
  let phones: Category;

  const findNodeByName = (nodes: any[], name: string): any | null => {
    for (const n of nodes || []) {
      if (n.name === name) return n;
      const child = findNodeByName(n.children || [], name);
      if (child) return child;
    }
    return null;
  };

  beforeAll(async () => {
    const setup = await setupIntegrationTest([AppModule]);
    moduleFixture = setup.moduleFixture;
    app = setup.app;
    prisma = setup.prismaService;

    service = moduleFixture.get<CategoriesService>(CategoriesService);
    repo = moduleFixture.get<CategoriesRepository>(CategoriesRepository);

    [gamingLaptops, iphones, laptops, phones] = await Promise.all([
      prisma.category.findUniqueOrThrow({ where: { key: 'gaming_laptops' } }),
      prisma.category.findUniqueOrThrow({ where: { key: 'iphones' } }),
      prisma.category.findUniqueOrThrow({ where: { key: 'laptops' } }),
      prisma.category.findUniqueOrThrow({ where: { key: 'mobile_phones' } }),
    ]);
  });

  afterAll(async () => {
    await tearDownIntegrationTest(moduleFixture, app, prisma);
  });

  describe('getCategoryTree', () => {
    it('should return the full category tree with proper shape', async () => {
      const tree = await service.getCategoryTree(false);

      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);

      const electronics = findNodeByName(tree, 'Electronics');
      expect(electronics).toBeDefined();
      expect(electronics.parentId).toBeNull();
      expect(Array.isArray(electronics.children)).toBe(true);
      expect(electronics.children.length).toBeGreaterThan(0);

      const laptopNode = findNodeByName(tree, 'Laptops');
      expect(laptopNode).toMatchObject({
        name: 'Laptops',
        parentId: electronics.id,
      });
      expect(Array.isArray(laptopNode.children)).toBe(true);
    });

    it('should include attributeCount and productCount when includeCounts=true', async () => {
      const tree = await service.getCategoryTree(true);

      expect(Array.isArray(tree)).toBe(true);
      const root = tree[0];
      expect(root).toHaveProperty('attributeCount');
      expect(root).toHaveProperty('productCount');
      expect(typeof root.attributeCount).toBe('number');
      expect(typeof root.productCount).toBe('number');

      const validateCounts = (node: any) => {
        expect(typeof node.attributeCount).toBe('number');
        expect(typeof node.productCount).toBe('number');
        (node.children || []).forEach(validateCounts);
      };
      (root.children || []).forEach(validateCounts);
    });

    it('should omit count fields when includeCounts=false', async () => {
      const tree = await service.getCategoryTree(false);

      const root = tree[0];
      expect(root.attributeCount).toBeUndefined();
      expect(root.productCount).toBeUndefined();

      const validateNoCounts = (node: any) => {
        expect(node.attributeCount).toBeUndefined();
        expect(node.productCount).toBeUndefined();
        (node.children || []).forEach(validateNoCounts);
      };
      (root.children || []).forEach(validateNoCounts);
    });

    it('should correctly report direct attributeCount for a leaf node', async () => {
      const tree = await service.getCategoryTree(true);
      const node = findNodeByName(tree as any[], 'Gaming Laptops');
      expect(node).toBeDefined();

      const attrCounts = await repo.countAttributesByCategory();
      const row = (attrCounts || []).find((r) => r.categoryId === gamingLaptops.id);
      const expectedAttrCount = row ? (row._count?.attributeId ?? Number(row._count?.attributeId ?? 0)) : 0;

      expect(node.attributeCount).toBe(expectedAttrCount);
    });

    it('should correctly report productCount based on actual DB data', async () => {
      const tree = await service.getCategoryTree(true);
      const iphoneNode = findNodeByName(tree as any[], 'iPhones');
      expect(iphoneNode).toBeDefined();

      const dbCount = await prisma.product.count({
        where: { categoryId: iphones.id },
      });
      expect(iphoneNode.productCount).toBe(dbCount);
    });

    it('should maintain parent-child hierarchy integrity', async () => {
      const tree = await service.getCategoryTree(false);

      const root = findNodeByName(tree as any[], 'Electronics');
      expect(root).toBeDefined();

      const laptopNode = findNodeByName(tree as any[], 'Laptops');
      expect(laptopNode.parentId).toBe(root.id);

      const gamingNode = findNodeByName(tree as any[], 'Gaming Laptops');
      expect(gamingNode.parentId).toBe(laptopNode.id);

      const idsOfRootChildren = (root.children || []).map((c: any) => c.id);
      const idsOfLaptopChildren = (laptopNode.children || []).map((c: any) => c.id);

      expect(idsOfRootChildren).toContain(laptopNode.id);
      expect(idsOfLaptopChildren).toContain(gamingNode.id);
    });

    it('should ensure parent productCount = sum of children productCounts', async () => {
      const tree = await service.getCategoryTree(true);
      const root = findNodeByName(tree as any[], 'Electronics');
      expect(root).toBeDefined();

      const sum = (nodes: any[]) =>
        (nodes || []).reduce((acc, n) => acc + (n.productCount || 0), 0);

      const sumChildren = sum(root.children);
      expect(root.productCount).toBe(sumChildren);
    });
  });
});
