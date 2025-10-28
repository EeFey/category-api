import { Injectable, BadRequestException } from '@nestjs/common';
import { AttributeSortBy, GetAttributesDto } from './dto/get-attributes.dto';
import { AttributeResponseDto } from './dto/attribute-response.dto';
import { AttributesRepository } from './attributes.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { AttributesPaginatedResponseDto } from './dto/attributes-paginated-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AttributesService {
  constructor(
    private readonly attributesRepository: AttributesRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) { }

  async getAttributes(dto: GetAttributesDto): Promise<AttributesPaginatedResponseDto> {
    if (!dto.categoryIds || dto.categoryIds.length === 0) {
      if (dto.linkTypes) {
        throw new BadRequestException('linkTypes require at least one categoryId');
      }
      if (dto.notApplicable) {
        throw new BadRequestException('notApplicable requires at least one categoryId');
      }
      return this.getAllAttributes(dto);
    }

    if (dto.notApplicable && dto.linkTypes?.length) {
      throw new BadRequestException('linkTypes cannot be used together with notApplicable=true');
    }

    const existingCategoryIds = await this.categoriesRepository.findExistingCategoryIds(dto.categoryIds);
    if (existingCategoryIds.length !== dto.categoryIds.length) {
      const missingIds = dto.categoryIds.filter(id => !existingCategoryIds.includes(id));
      throw new BadRequestException(`Invalid categoryIds: ${missingIds.join(', ')}`);
    }

    return this.getAttributesByCategoryIds(dto);
  }


  private async getAllAttributes(dto: GetAttributesDto): Promise<AttributesPaginatedResponseDto> {
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc', keyword } = dto;
    const typedSortBy: AttributeSortBy = sortBy;

    const where = this.attributesRepository.buildSearchFilter(keyword);
    const total = await this.attributesRepository.countAttributes(where);

    const rows = await this.attributesRepository.findManyAttributes({
      where,
      offset: (page - 1) * limit,
      limit: limit,
      orderBy: { [typedSortBy]: sortOrder },
    });

    const mapped = rows.map(r => ({
      ...r,
      linkType: null,
    }));

    const attributesResponse = plainToInstance(AttributeResponseDto, mapped, { excludeExtraneousValues: true });

    return new AttributesPaginatedResponseDto(attributesResponse, total, page, limit);
  }

  private async getAttributesByCategoryIds(dto: GetAttributesDto): Promise<AttributesPaginatedResponseDto> {
    const {
      page = 1,
      limit = 20,
    } = dto;

    const { rows, total } = await this.attributesRepository.queryAttributesByCategoryIds(dto);

    const attributesResponse = plainToInstance(AttributeResponseDto, rows, { excludeExtraneousValues: true });

    return new AttributesPaginatedResponseDto(attributesResponse, total, page, limit);
  }
}
