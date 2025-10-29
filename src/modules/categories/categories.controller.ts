import { Controller, Get, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { GetCategoryTreeDto } from './dto/get-category-tree.dto';

@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) { }

  @Get('tree')
  async tree(@Query() dto: GetCategoryTreeDto) {
    return this.svc.getCategoryTree(dto.includeCounts);
  }
}
