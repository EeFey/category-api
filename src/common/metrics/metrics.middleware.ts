import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) { }

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime();

    res.on('finish', () => {
      const diff = process.hrtime(start);
      const duration = diff[0] + diff[1] / 1e9; // seconds
      const route = req.route?.path || req.path;
      this.metricsService.observeRequest(req.method, route, res.statusCode, duration);
    });

    next();
  }
}
