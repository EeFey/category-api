import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) { }

  @Get('/health')
  async health() {
    return this.healthService.check();
  }

  @Get('/ready')
  async readiness() {
    return this.healthService.readiness();
  }
}