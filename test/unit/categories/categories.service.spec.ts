import { CategoriesService } from '../../../src/modules/categories/categories.service';
import { CategoriesRepository } from '../../../src/modules/categories/categories.repository';
import { PinoLogger } from '../../../src/common/logger/pino.logger';
import { CategoryNodeDto } from '../../../src/modules/categories/dto/category-node.dto';

describe('CategoriesService (unit)', () => {
  let service: CategoriesService;
  let repo: Partial<CategoriesRepository>;
  let logger: Partial<PinoLogger>;

  beforeEach(() => {
    repo = {
      findAllCategories: jest.fn(),
      countAttributesByCategory: jest.fn(),
      countProductsByCategory: jest.fn(),
    };

    logger = {
      warn: jest.fn(),
    };

    service = new CategoriesService(repo as CategoriesRepository, logger as PinoLogger);
  });

  it('builds category tree without counts', async () => {
    (repo.findAllCategories as jest.Mock).mockResolvedValue([
      { id: 1n, name: 'Root', parentId: null },
      { id: 2n, name: 'Child', parentId: 1n },
    ]);

    const result = await service.getCategoryTree(false);

    expect(repo.findAllCategories).toHaveBeenCalled();
    expect(repo.countAttributesByCategory).not.toHaveBeenCalled();
    expect(repo.countProductsByCategory).not.toHaveBeenCalled();

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(CategoryNodeDto);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].attributeCount).toBeUndefined();
    expect(result[0].productCount).toBeUndefined();
  });

  it('builds category tree with counts', async () => {
    (repo.findAllCategories as jest.Mock).mockResolvedValue([
      { id: 1n, name: 'Root', parentId: null },
      { id: 2n, name: 'Child', parentId: 1n },
    ]);

    (repo.countAttributesByCategory as jest.Mock).mockResolvedValue([
      { categoryId: 1n, _count: { attributeId: 3 } },
      { categoryId: 2n, _count: { attributeId: 1 } },
    ]);

    (repo.countProductsByCategory as jest.Mock).mockResolvedValue([
      { categoryId: 1n, _count: { id: 10 } },
      { categoryId: 2n, _count: { id: 10 } },
    ]);

    const result = await service.getCategoryTree(true);

    expect(repo.countAttributesByCategory).toHaveBeenCalled();
    expect(repo.countProductsByCategory).toHaveBeenCalled();

    expect(result[0].attributeCount).toBe(3);
    expect(result[0].productCount).toBe(10);
    expect(result[0].children[0].attributeCount).toBe(1);
    expect(result[0].children[0].productCount).toBe(10);
  });

  it('handles missing counts safely', async () => {
    (repo.findAllCategories as jest.Mock).mockResolvedValue([
      { id: 1n, name: 'A', parentId: null },
    ]);
    (repo.countAttributesByCategory as jest.Mock).mockResolvedValue([]);
    (repo.countProductsByCategory as jest.Mock).mockResolvedValue([]);

    const result = await service.getCategoryTree(true);

    expect(result[0].attributeCount).toBe(0);
    expect(result[0].productCount).toBe(0);
  });

  it('logs warning and treats orphaned nodes as roots', async () => {
    (repo.findAllCategories as jest.Mock).mockResolvedValue([
      { id: 1n, name: 'Orphan', parentId: 99n },
    ]);

    const result = await service.getCategoryTree();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Orphaned node found: Orphan'),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Orphan');
  });

  it('handles empty categories gracefully', async () => {
    (repo.findAllCategories as jest.Mock).mockResolvedValue([]);

    const result = await service.getCategoryTree();

    expect(result).toEqual([]);
  });
});
