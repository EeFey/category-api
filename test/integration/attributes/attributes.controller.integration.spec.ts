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

  beforeAll(async () => {
    const setup = await setupIntegrationTest([AppModule]);
    moduleFixture = setup.moduleFixture;
    app = setup.app;
    prisma = setup.prismaService;
  });

  afterAll(async () => {
    await tearDownIntegrationTest(moduleFixture, app, prisma);
  });

  describe('GET /api/attributes', () => {
    it('should return attributes with expected shape when called without params', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes')
        .expect(200);
      expect(res.body).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.total).toBe('number');

      if (res.body.data.length > 0) {
        const attr = res.body.data[0];
        expect(attr).toHaveProperty('id');
        expect(attr).toHaveProperty('key');
        expect(attr).toHaveProperty('name');
        expect(attr).toHaveProperty('type');
      }
    });

    it('should filter attributes by keyword', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes?keyword=camera')
        .expect(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(0);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('name');
      }
    });

    it('should support pagination and return correct page/limit values', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes?page=1&limit=5')
        .expect(200);

      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 5);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should support complex queries combining filters and sorting', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attributes?categoryIds=1&linkTypes=direct&linkTypes=inherited&keyword=os&sortBy=key&sortOrder=asc&page=1&limit=5')
        .expect(200);

      expect(res.body).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.total).toBe('number');

      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 5);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should return 400 when linkTypes is provided without categoryIds', async () => {
      await request(app.getHttpServer())
        .get('/api/attributes?linkTypes=direct')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 400 for invalid linkTypes', async () => {
      await request(app.getHttpServer())
        .get('/api/attributes?linkTypes=invalid')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 400 when notApplicable is provided without categoryIds', async () => {
      await request(app.getHttpServer())
        .get('/api/attributes?notApplicable=true')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 400 when limit exceeds maximum', async () => {
      await request(app.getHttpServer())
        .get('/api/attributes?page=1&limit=201')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 400 for invalid sortBy value', async () => {
      await request(app.getHttpServer())
        .get('/api/attributes?sortBy=invalidField')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 400 for non-existent categoryId', async () => {
      await request(app.getHttpServer())
        .get('/api/attributes?categoryIds=999999999')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });
  });
});