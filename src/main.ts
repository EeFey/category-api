import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PinoLogger } from './common/logger/pino.logger';
import { PinoExceptionFilter } from './common/logger/pino-exception.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const pinoLogger = app.get(PinoLogger);
  app.use(pinoLogger.httpLog.bind(pinoLogger));
  app.useLogger(pinoLogger);

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  app.useGlobalFilters(new PinoExceptionFilter(pinoLogger));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
