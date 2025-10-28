import { Module } from '@nestjs/common';
import { AttributesController } from './attributes.controller';
import { AttributesService } from './attributes.service';
import { AttributesRepository } from './attributes.repository';
import { CategoriesRepository } from '../categories/categories.repository';

@Module({
  controllers: [AttributesController],
  providers: [AttributesService, AttributesRepository, CategoriesRepository],
})
export class AttributesModule { }