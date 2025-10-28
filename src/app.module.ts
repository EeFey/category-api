import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { LoggerModule } from './common/logger/logger.module';
import { AttributesModule } from './modules/attributes/attributes.module';

@Module({
  imports: [PrismaModule, CategoriesModule, LoggerModule, AttributesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
