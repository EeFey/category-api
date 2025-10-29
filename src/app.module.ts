import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { LoggerModule } from './common/logger/logger.module';
import { AttributesModule } from './modules/attributes/attributes.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { MetricsMiddleware } from './common/metrics/metrics.middleware';

@Module({
  imports: [PrismaModule, CategoriesModule, LoggerModule, AttributesModule, MetricsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
