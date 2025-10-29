import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../src/common/prisma/prisma.service';
import { CategoriesRepository } from '../../../src/modules/categories/categories.repository';
import { CategoriesModule } from '../../../src/modules/categories/categories.module';
import { setupIntegrationTest, tearDownIntegrationTest } from '../test-setup';
import { Category } from '@prisma/client';

describe('CategoriesRepository.countProductsByCategory (integration)', () => {
  let prisma: PrismaService;
  let repo: CategoriesRepository;
  let moduleFixture: TestingModule;
  let app: INestApplication;

  let electronics: Category;
  let phones: Category;
  let laptops: Category;
  let androidPhones: Category;
  let iphones: Category;
  let gamingLaptops: Category;
  let businessLaptops: Category;

  beforeAll(async () => {
    const setup = await setupIntegrationTest([CategoriesModule]);
    moduleFixture = setup.moduleFixture;
    app = setup.app;
    prisma = setup.prismaService;
    repo = moduleFixture.get(CategoriesRepository);

    [electronics, phones, laptops, androidPhones, iphones, gamingLaptops, businessLaptops] =
      await Promise.all([
        prisma.category.findUniqueOrThrow({ where: { key: 'electronics' } }),
        prisma.category.findUniqueOrThrow({ where: { key: 'mobile_phones' } }),
        prisma.category.findUniqueOrThrow({ where: { key: 'laptops' } }),
        prisma.category.findUniqueOrThrow({ where: { key: 'android_phones' } }),
        prisma.category.findUniqueOrThrow({ where: { key: 'iphones' } }),
        prisma.category.findUniqueOrThrow({ where: { key: 'gaming_laptops' } }),
        prisma.category.findUniqueOrThrow({ where: { key: 'business_laptops' } }),
      ]);
  });

  afterAll(async () => {
    await tearDownIntegrationTest(moduleFixture, app, prisma);
  });

  it('returns correct aggregated product counts across category hierarchy', async () => {
    const result = await repo.countProductsByCategory();

    expect(result).toBeInstanceOf(Array);
    expect(result[0]).toHaveProperty('categoryId');
    expect(result[0]).toHaveProperty('_count.id');

    const findCount = (cat: Category) =>
      result.find((r) => r.categoryId === cat.id)?._count.id ?? 0;

    const electronicsCount = findCount(electronics);
    const phonesCount = findCount(phones);
    const laptopsCount = findCount(laptops);
    const androidPhonesCount = findCount(androidPhones);
    const iphonesCount = findCount(iphones);
    const gamingLaptopsCount = findCount(gamingLaptops);
    const businessLaptopsCount = findCount(businessLaptops);


    // Should aggregate descendant counts
    expect(androidPhonesCount).toBeGreaterThan(0);
    expect(iphonesCount).toBeGreaterThan(0);
    expect(gamingLaptopsCount).toBeGreaterThan(0);
    expect(businessLaptopsCount).toBeGreaterThan(0);
    expect(phonesCount).toBe(androidPhonesCount + iphonesCount);
    expect(laptopsCount).toBe(gamingLaptopsCount + businessLaptopsCount);
    expect(electronicsCount).toBe(phonesCount + laptopsCount);
  });

});
