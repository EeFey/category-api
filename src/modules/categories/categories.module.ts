import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { LoggerModule } from 'src/common/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [CategoriesService, CategoriesRepository],
  controllers: [CategoriesController],
})
export class CategoriesModule { }
