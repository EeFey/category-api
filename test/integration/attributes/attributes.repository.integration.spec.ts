import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { setupIntegrationTest, tearDownIntegrationTest } from '../test-setup';
import { AttributesRepository } from '../../../src/modules/attributes/attributes.repository';
import { PrismaService } from '../../../src/common/prisma/prisma.service';
import { GetAttributesDto } from '../../../src/modules/attributes/dto/get-attributes.dto';
import { AttributesModule } from '../../../src/modules/attributes/attributes.module';
import { Attribute, Category } from '@prisma/client';

describe('AttributesRepository.queryAttributesByCategoryIds (integration)', () => {
  let prisma: PrismaService;
  let attributesRepository: AttributesRepository;
  let moduleFixture: TestingModule;
  let app: INestApplication;
  let electronics: Category, phones: Category, laptops: Category;

  beforeAll(async () => {
    const setup = await setupIntegrationTest([AttributesModule]);
    moduleFixture = setup.moduleFixture;
    app = setup.app;
    prisma = setup.prismaService;
    attributesRepository = moduleFixture.get(AttributesRepository);

    [electronics, laptops, phones] = await Promise.all([
      prisma.category.findUniqueOrThrow({ where: { key: 'electronics' } }),
      prisma.category.findUniqueOrThrow({ where: { key: 'laptops' } }),
      prisma.category.findUniqueOrThrow({ where: { key: 'mobile_phones' } }),
    ]);
  });

  afterAll(async () => {
    await tearDownIntegrationTest(moduleFixture, app, prisma);
  });

  it('should return correct attributes for a single category', async () => {
    const dto: GetAttributesDto = {
      categoryIds: [phones.id],
      page: 1,
      limit: 50,
    };

    const res = await attributesRepository.queryAttributesByCategoryIds(dto);

    ['battery_capacity', 'camera_megapixels', 'os_version'].forEach((key) => {
      const attribute = res.rows.find((r) => r.key === key);
      expect(attribute).toBeDefined();
      expect(attribute.linkType).toBe('direct');
    });

    const model = res.rows.find((r) => r.key === 'model');
    expect(model).toBeDefined();
    expect(model.linkType).toBe('inherited');

    const brand = res.rows.find((r) => r.key === 'brand');
    expect(brand).toBeDefined();
    expect(brand.linkType).toBe('global');

    expect(res.rows.find((r) => r.key === 'gpu_model')).toBeUndefined();
  });

  it('should return correct attributes for multiple categories', async () => {
    const dto: GetAttributesDto = {
      categoryIds: [phones.id, laptops.id],
      page: 1,
      limit: 50,
    };

    const res = await attributesRepository.queryAttributesByCategoryIds(dto);

    // Direct (phones)
    const battery = res.rows.find((r) => r.key === 'battery_capacity');
    expect(battery).toBeDefined();
    expect(battery.linkType).toBe('direct');

    // Direct (laptops)
    const ram = res.rows.find((r) => r.key === 'ram_size');
    expect(ram).toBeDefined();
    expect(ram.linkType).toBe('direct');

    // Inherited
    const model = res.rows.find((r) => r.key === 'model');
    expect(model).toBeDefined();
    expect(model.linkType).toBe('inherited');

    // Global
    const brand = res.rows.find((r) => r.key === 'brand');
    expect(brand).toBeDefined();
    expect(brand.linkType).toBe('global');

    // Not applicable
    const gpu = res.rows.find((r) => r.key === 'gpu_model');
    expect(gpu).toBeUndefined();
  });

  it('should filter attributes by keyword and support pagination', async () => {
    // keyword filter
    const dtoKeyword: GetAttributesDto = {
      categoryIds: [phones.id],
      keyword: 'batt',
      page: 1,
      limit: 10,
    };

    const r1 = await attributesRepository.queryAttributesByCategoryIds(dtoKeyword);
    expect(r1.total).toBeGreaterThanOrEqual(1);
    expect(r1.rows.every((r) => r.name.toLowerCase().includes('batt') || r.key.includes('batt'))).toBeTruthy();

    // pagination
    const dtoPaginate: GetAttributesDto = {
      categoryIds: [phones.id],
      page: 1,
      limit: 1,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    const r2 = await attributesRepository.queryAttributesByCategoryIds(dtoPaginate);
    expect(r2.rows.length).toBeLessThanOrEqual(1);
  });

  it('should filter attributes by link type (direct only)', async () => {
    const dto: GetAttributesDto = {
      categoryIds: [laptops.id],
      linkTypes: ['direct'],
      page: 1,
      limit: 50,
    };

    const res = await attributesRepository.queryAttributesByCategoryIds(dto);
    const keys = res.rows.map((r) => r.key);

    expect(keys).toEqual(expect.arrayContaining(['cpu_model', 'ram_size', 'storage_type']));
    expect(keys).not.toContain('model'); // inherited
    expect(keys).not.toContain('brand'); // global
  });

  it('should filter attributes by multiple link types (direct + global)', async () => {
    const dto: GetAttributesDto = {
      categoryIds: [laptops.id],
      linkTypes: ['direct', 'global'],
      page: 1,
      limit: 50,
    };

    const res = await attributesRepository.queryAttributesByCategoryIds(dto);
    const keys = res.rows.map((r) => r.key);

    expect(keys).toEqual(expect.arrayContaining(['brand', 'cpu_model', 'ram_size', 'storage_type']));
    expect(keys).not.toContain('model'); // inherited excluded
  });

  it('should support notApplicable flag and include unrelated attributes', async () => {
    const dto: GetAttributesDto = {
      categoryIds: [electronics.id],
      notApplicable: true,
      page: 1,
      limit: 50,
    };

    const res = await attributesRepository.queryAttributesByCategoryIds(dto);
    expect(res.rows.some((r) => r.key === 'gpu_model' && r.linkType === null)).toBeTruthy();
  });

  it('should handle complex queries combining filters and sorting', async () => {
    const dto: GetAttributesDto = {
      categoryIds: [phones.id],
      keyword: 'os',
      linkTypes: ['direct', 'inherited'],
      sortBy: 'key',
      sortOrder: 'asc',
      page: 1,
      limit: 10,
    };

    const res = await attributesRepository.queryAttributesByCategoryIds(dto);
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].key).toBe('os_version');
  });

  it('should sort attributes correctly by key in descending order', async () => {
    const dto: GetAttributesDto = {
      categoryIds: [phones.id],
      sortBy: 'key',
      sortOrder: 'desc',
      page: 1,
      limit: 50,
    };

    const res = await attributesRepository.queryAttributesByCategoryIds(dto);
    const keys = res.rows.map((r) => r.key);
    const sorted = [...keys].sort((a, b) => b.localeCompare(a));

    expect(keys).toEqual(sorted);
  });

  it('should return empty rows when page is out of range', async () => {
    const dto: GetAttributesDto = {
      categoryIds: [phones.id],
      page: 9999,
      limit: 10,
    };

    const res = await attributesRepository.queryAttributesByCategoryIds(dto);
    expect(res.rows).toHaveLength(0);
    expect(res.total).toBeGreaterThan(0);
  });

});


describe('AttributesRepository.buildAttributeLinksBaseSql (integration)', () => {
  let prisma: PrismaService;
  let attributesRepository: AttributesRepository;
  let moduleFixture: TestingModule;
  let app: INestApplication;
  let phones: Category;
  let brandAttr: Attribute, modelAttr: Attribute, batteryCapacityAttr: Attribute, gpuModelAttr: Attribute;

  beforeAll(async () => {
    const setup = await setupIntegrationTest([AttributesModule]);
    moduleFixture = setup.moduleFixture;
    app = setup.app;
    prisma = setup.prismaService;
    attributesRepository = moduleFixture.get(AttributesRepository);

    phones = await prisma.category.findUniqueOrThrow({ where: { key: 'mobile_phones' } });
    brandAttr = await prisma.attribute.findUniqueOrThrow({ where: { key: 'brand' } });
    modelAttr = await prisma.attribute.findUniqueOrThrow({ where: { key: 'model' } });
    batteryCapacityAttr = await prisma.attribute.findUniqueOrThrow({ where: { key: 'battery_capacity' } });
    gpuModelAttr = await prisma.attribute.findUniqueOrThrow({ where: { key: 'gpu_model' } });
  });

  afterAll(async () => {
    await tearDownIntegrationTest(moduleFixture, app, prisma);
  });

  it('throws an error if categoryIds is empty', () => {
    expect(() => attributesRepository['buildAttributeLinksBaseSql']([])).toThrow('categoryIds required to build attribute link base SQL');
  });

  it('generates correct SQL for global attributes', async () => {
    const categoryIds = [99999n]; // A category that doesn't exist, so all should be global or null
    const sql = attributesRepository['buildAttributeLinksBaseSql'](categoryIds);
    const result = await prisma.$queryRaw(sql);

    // Expect 'brand' to be global as it's not linked to any category
    const brandAttribute = (result as any[]).find(r => r.attributeId === brandAttr.id);
    expect(brandAttribute).toBeDefined();
    expect(brandAttribute.linkType).toBe('global');
  });

  it('generates correct SQL for attributes', async () => {
    const categoryIds = [phones.id];
    const sql = attributesRepository['buildAttributeLinksBaseSql'](categoryIds);
    const result = await prisma.$queryRaw(sql);

    // battery_capacity is direct on phones
    const batteryCapacity = (result as any[]).find(r => r.attributeId === batteryCapacityAttr.id);
    expect(batteryCapacity).toBeDefined();
    expect(batteryCapacity.linkType).toBe('direct');

    // model should be inherited (from electronics)
    const model = (result as any[]).find(r => r.attributeId === modelAttr.id);
    expect(model).toBeDefined();
    expect(model.linkType).toBe('inherited');

    // brand is global
    const brand = (result as any[]).find(r => r.attributeId === brandAttr.id);
    expect(brand).toBeDefined();
    expect(brand.linkType).toBe('global');

    // gpu_model should be null (not applicable)
    const gpuModel = (result as any[]).find(r => r.attributeId === gpuModelAttr.id);
    expect(gpuModel).toBeDefined();
    expect(gpuModel.linkType).toBeNull();
  });

});
