import { AttributesService } from '../../../src/modules/attributes/attributes.service';
import { AttributesRepository } from '../../../src/modules/attributes/attributes.repository';
import { CategoriesRepository } from '../../../src/modules/categories/categories.repository';
import { GetAttributesDto } from '../../../src/modules/attributes/dto/get-attributes.dto';
import { BadRequestException } from '@nestjs/common';
import { AttributeType } from '@prisma/client';

describe('AttributesService (unit)', () => {
  let service: AttributesService;
  let attributesRepo: Partial<AttributesRepository>;
  let categoriesRepo: Partial<CategoriesRepository>;

  beforeEach(() => {
    attributesRepo = {
      queryAttributesByCategoryIds: jest.fn(),
      countAttributes: jest.fn(),
      findManyAttributes: jest.fn(),
      buildSearchFilter: jest.fn(),
    } as Partial<AttributesRepository>;

    categoriesRepo = {
      findExistingCategoryIds: jest.fn(),
    } as Partial<CategoriesRepository>;

    service = new AttributesService(
      attributesRepo as AttributesRepository,
      categoriesRepo as CategoriesRepository,
    );
  });

  it('returns all attributes when no categoryIds', async () => {
    const dto: GetAttributesDto = { categoryIds: [], page: 1, limit: 10 };
    (attributesRepo.countAttributes as jest.Mock).mockResolvedValue(2n);
    (attributesRepo.findManyAttributes as jest.Mock).mockResolvedValue([
      { id: 1n, key: 'a1', name: 'A 1', type: AttributeType.SHORTTEXT },
      { id: 2n, key: 'a2', name: 'A 2', type: AttributeType.SHORTTEXT },
    ]);
    (attributesRepo.buildSearchFilter as jest.Mock).mockReturnValue({});

    const res = await service.getAttributes(dto);

    expect(res.total).toBe(2);
    expect(res.data).toHaveLength(2);
    expect(res.data[0].linkType).toBeNull();
  });

  it('calls repository for category attributes', async () => {
    const dto: GetAttributesDto = { categoryIds: [1n], page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' };

    (categoriesRepo.findExistingCategoryIds as jest.Mock).mockResolvedValue([1n]);
    (attributesRepo.queryAttributesByCategoryIds as jest.Mock).mockResolvedValue({
      rows: [{ id: 3n, key: 'color', name: 'Color',  type: AttributeType.SHORTTEXT, linkType: 'direct' }],
      total: 1n,
    });

    const res = await service.getAttributes(dto);

    expect(categoriesRepo.findExistingCategoryIds).toHaveBeenCalledWith([1n]);
    expect(attributesRepo.queryAttributesByCategoryIds).toHaveBeenCalledWith(dto);
    expect(res.total).toBe(1);
    expect(res.data[0].linkType).toBe('direct');
  });

  it('throws BadRequestException if linkTypes are provided without categoryIds', async () => {
    const dto: GetAttributesDto = { linkTypes: ['direct'], page: 1, limit: 10 };

    await expect(service.getAttributes(dto)).rejects.toThrow(
      new BadRequestException('linkTypes require at least one categoryId'),
    );
  });

  it('throws BadRequestException if notApplicable is provided without categoryIds', async () => {
    const dto: GetAttributesDto = { notApplicable: true, page: 1, limit: 10 };

    await expect(service.getAttributes(dto)).rejects.toThrow(
      new BadRequestException('notApplicable requires at least one categoryId'),
    );
  });

  it('throws BadRequestException if linkTypes are used with notApplicable=true', async () => {
    const dto: GetAttributesDto = {
      categoryIds: [1n],
      linkTypes: ['direct'],
      notApplicable: true,
      page: 1,
      limit: 10,
    };

    (categoriesRepo.findExistingCategoryIds as jest.Mock).mockResolvedValue([1n]);

    await expect(service.getAttributes(dto)).rejects.toThrow(
      new BadRequestException('linkTypes cannot be used together with notApplicable=true'),
    );
  });

  it('throws BadRequestException if any categoryId does not exist', async () => {
    const dto: GetAttributesDto = { categoryIds: [1n, 2n], page: 1, limit: 10 };

    (categoriesRepo.findExistingCategoryIds as jest.Mock).mockResolvedValue([1n]);

    await expect(service.getAttributes(dto)).rejects.toThrow(
      new BadRequestException('Invalid categoryIds: 2'),
    );
  });
});
