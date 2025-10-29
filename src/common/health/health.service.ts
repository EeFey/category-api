import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) { }

  async check() {
    return { status: 'ok' };
  }

  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', info: { database: { status: 'up' } }, error: {} };
    } catch (err) {
      return { status: 'error', info: { database: { status: 'down', error: err.message } } };
    }
  }
}