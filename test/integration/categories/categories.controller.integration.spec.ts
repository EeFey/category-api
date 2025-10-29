import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/common/prisma/prisma.service';
import { setupIntegrationTest, tearDownIntegrationTest } from '../test-setup';

describe('CategoriesController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    const setup = await setupIntegrationTest([AppModule]);
    moduleFixture = setup.moduleFixture;
    app = setup.app;
    prisma = setup.prismaService;
  });

  afterAll(async () => {
    await tearDownIntegrationTest(moduleFixture, app, prisma);
  });

  describe('GET /api/categories/tree', () => {
    it('should return a tree structure', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/categories/tree')
        .expect(200);

      const tree = res.body;
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);

      const root = tree[0];
      expect(root).toBeDefined();
      expect(Array.isArray(root.children)).toBe(true);

      const child = root.children[0];
      expect(child).toBeDefined();
      expect(child.parentId).toBe(root.id);

    });

    it('should include count fields when includeCounts=true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/categories/tree?includeCounts=true')
        .expect(200);

      const node = res.body[0];
      expect(node).toHaveProperty('attributeCount');
      expect(node).toHaveProperty('productCount');
    });

    it('should omit count fields when includeCounts=false', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/categories/tree?includeCounts=false')
        .expect(200);

      const node = res.body[0];
      expect(node.attributeCount).toBeUndefined();
      expect(node.productCount).toBeUndefined();
    });

    it('should omit count fields when includeCounts is not provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/categories/tree')
        .expect(200);

      const node = res.body[0];
      expect(node.attributeCount).toBeUndefined();
      expect(node.productCount).toBeUndefined();
    });
  });
});

