import { AttributesRepository } from '../../../src/modules/attributes/attributes.repository';
import { PrismaService } from '../../../src/common/prisma/prisma.service';
import { GetAttributesDto } from '../../../src/modules/attributes/dto/get-attributes.dto';
import { AttributeType } from '@prisma/client';

describe('AttributesRepository (unit)', () => {
  let repo: AttributesRepository;
  let prisma: Partial<PrismaService>;

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
    } as Partial<PrismaService>;

    repo = new AttributesRepository(prisma as PrismaService);
  });

  describe('queryAttributesByCategoryIds', () => {
    it('throws when categoryIds not provided', async () => {
      await expect(
        repo.queryAttributesByCategoryIds({} as GetAttributesDto),
      ).rejects.toThrow('categoryIds required to build attribute link base SQL');
    });

    it('builds SQL and returns rows/total', async () => {
      const dto: GetAttributesDto = {
        categoryIds: [10n],
        page: 1,
        limit: 5,
        sortBy: 'name',
        sortOrder: 'asc',
      };


      (prisma.$queryRaw as jest.Mock).mockImplementationOnce(async () => [{ total: 2 }]);
      (prisma.$queryRaw as jest.Mock).mockImplementationOnce(async () => [
        { id: 1n, key: 'color', name: 'Color', type: AttributeType.SHORTTEXT, linkType: 'direct' },
        { id: 2n, key: 'size', name: 'Size', type: AttributeType.SHORTTEXT, linkType: 'inherited' },
      ]);

      const result = await repo.queryAttributesByCategoryIds(dto);
      expect(result.total).toBe(2);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].key).toBe('color');
      expect(result.rows[0].linkType).toBe('direct');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('respects keyword and linkTypes and notApplicable', async () => {
      const dto: GetAttributesDto = {
        categoryIds: [5n, 6n],
        keyword: 'red',
        linkTypes: ['direct', 'inherited'],
        notApplicable: false,
        page: 2,
        limit: 5,
        sortBy: 'key',
        sortOrder: 'desc',
      };

      (prisma.$queryRaw as jest.Mock).mockImplementationOnce(async () => [{ total: 1 }]);
      (prisma.$queryRaw as jest.Mock).mockImplementationOnce(async () => [
        { id: 3n, key: 'material', name: 'Material', type: AttributeType.SHORTTEXT, linkType: 'inherited' },
      ]);

      const res = await repo.queryAttributesByCategoryIds(dto);
      expect(res.total).toBe(1);
      expect(res.rows[0].name).toBe('Material');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });
});
