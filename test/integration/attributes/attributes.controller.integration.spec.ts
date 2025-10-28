import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/common/prisma/prisma.service';
import { setupIntegrationTest, tearDownIntegrationTest } from '../test-setup';
import { Category } from '@prisma/client';

describe('AttributesController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let moduleFixture: TestingModule;
  let gamingLaptops: Category, iphones: Category, laptops: Category, phones: Category;

  const getKeys = (resBody: any) =>
    (resBody.data || []).map((a: any) => a.key);

  beforeAll(async () => {
    const setup = await setupIntegrationTest([AppModule]);
    moduleFixture = setup.moduleFixture;
    app = setup.app;
    prisma = setup.prismaService;

    [gamingLaptops, iphones, laptops, phones] = await Promise.all([
      prisma.category.findUniqueOrThrow({ where: { name: 'Gaming Laptops' } }),
      prisma.category.findUniqueOrThrow({ where: { name: 'iPhones' } }),
      prisma.category.findUniqueOrThrow({ where: { name: 'Laptops' } }),
      prisma.category.findUniqueOrThrow({ where: { name: 'Mobile Phones' } }),
    ]);
  });

  afterAll(async () => {
    await tearDownIntegrationTest(moduleFixture, app, prisma);
  });

  describe('GET /api/attributes', () => {
    it('should return all attributes when no parameters are provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes')
        .expect(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);

      for (const attr of res.body.data) {
        expect(attr).toHaveProperty('key');
        expect(attr).toHaveProperty('name');
        expect(attr).toHaveProperty('type');
      }

      const count = await prisma.attribute.count();
      expect(res.body.data.length).toBe(count);
      expect(res.body.total).toBe(count);
    });

    it('should filter attributes by keyword', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes?keyword=camera')
        .expect(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Camera Megapixels');
    });

    it('should return an empty array for a keyword that matches nothing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes?keyword=nonexistentkeyword')
        .expect(200);

      expect(res.body.data.length).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes?page=1&limit=5')
        .expect(200);

      expect(res.body.data.length).toBe(5);
      expect(res.body.total).toBeGreaterThan(5);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(5);
    });

    it('should return empty data when page is out of range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes?page=9999&limit=10')
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.page).toBe(9999);
    });

    it('should raise an error when limit exceeds maximum', async () => {
      await request(app.getHttpServer())
        .get('/api/attributes?page=1&limit=201')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('limit must not be greater than 200');
        });
    });

    it('should sort attributes by key in descending order', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes?sortBy=key&sortOrder=desc')
        .expect(200);

      const keys = getKeys(res.body);
      expect(keys).toEqual([...keys].sort((a, b) => b.localeCompare(a)));
    });

    it('should filter by a single category and return all applicable attributes', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/attributes?categoryIds=${gamingLaptops.id}`)
        .expect(200);

      const keys = getKeys(res.body);
      expect(keys).toEqual(expect.arrayContaining(['brand', 'cpu_model', 'gpu_model', 'model', 'ram_size', 'storage_type', 'warranty_period']));
      expect(keys).not.toContain('battery_capacity');
      expect(keys).not.toContain('camera_megapixels');
      expect(keys).not.toContain('os_version');
    });

    it('should filter by multiple categories and return unique attributes (no duplicates)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/attributes?categoryIds=${iphones.id}&categoryIds=${gamingLaptops.id}`)
        .expect(200);

      const keys = getKeys(res.body);
      expect(keys).toEqual(
        expect.arrayContaining(['battery_capacity', 'brand', 'cpu_model', 'camera_megapixels', 'gpu_model', 'model', 'os_version', 'ram_size', 'storage_type', 'warranty_period']),
      );

      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    });

    it('should filter by direct link type for a category', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/attributes?categoryIds=${laptops.id}&linkTypes=direct`)
        .expect(200);

      const keys = getKeys(res.body);
      expect(keys).toEqual(expect.arrayContaining(["cpu_model", "ram_size", "storage_type"]));
      expect(keys).not.toContain('Model'); // Inherited
      expect(keys).not.toContain('Brand'); // Global
    });

    it('should filter by a combination of link types (direct and global)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/attributes?categoryIds=${laptops.id}&linkTypes=direct&linkTypes=global`)
        .expect(200);

      const keys = getKeys(res.body);
      expect(keys).toEqual(expect.arrayContaining(['brand', 'cpu_model', 'ram_size', 'storage_type']));
      expect(keys).not.toContain('Model'); // Inherited
    });

    it('should raise an error for link types when no categories are provided', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/attributes?linkTypes=direct&linkTypes=global`)
        .expect(400);

      expect(res.body.message).toContain('linkTypes require at least one categoryId');
    });

    it('should filter for not applicable attributes for a category', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/attributes?categoryIds=${gamingLaptops.id}&notApplicable=true`)
        .expect(200);

      const keys = getKeys(res.body);
      // Should contain attributes not linked to Gaming Laptops or its ancestors
      expect(keys).toEqual(expect.arrayContaining(['battery_capacity', 'camera_megapixels', 'os_version']));
      // Should not contain its own or inherited attributes
      expect(keys).not.toContain('gpu_model');
      expect(keys).not.toContain('ram_size');
      expect(keys).not.toContain('brand');
    });

    it('should raise an error for notApplicable when no categories are provided', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/attributes?notApplicable=true`)
        .expect(400);

      expect(res.body.message).toContain('notApplicable requires at least one categoryId');
    });

    it('should handle a complex query with multiple filters', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/attributes?categoryIds=${phones.id}&linkTypes=direct&linkTypes=inherited&keyword=os&sortBy=key&sortOrder=asc`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].key).toBe('os_version');
    });

    it('should return 400 for a non-existent categoryId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes?categoryIds=999999999')
        .expect(400);
      expect(res.body.message).toContain('Invalid categoryIds');
    });

    it('should return 400 for invalid linkTypes values', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/attributes?categoryIds=${laptops.id}&linkTypes=invalidtype`)
        .expect(400);
      expect(res.body.message).toContain('each value in linkTypes must be one of the following values: direct, inherited, global');
    });

    it('should return 400 for invalid sortBy value', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes?sortBy=invalidField')
        .expect(400);
      expect(res.body.message).toContain('sortBy must be one of the following values: id, name, key, createdAt, updatedAt');
    });

  });
});
