import { Module } from '@nestjs/common';
import { PinoLogger } from './pino.logger';

@Module({
  providers: [PinoLogger],
  exports: [PinoLogger],
})
export class LoggerModule {}
