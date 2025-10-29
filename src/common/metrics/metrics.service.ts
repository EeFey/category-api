import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: client.Registry;
  private readonly httpRequestDurationSeconds: client.Histogram<string>;
  private readonly httpRequestCount: client.Counter<string>;

  constructor() {
    this.register = new client.Registry();
    client.collectDefaultMetrics({ register: this.register });

    // Request count metric
    this.httpRequestCount = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // Latency metric
    this.httpRequestDurationSeconds = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    });

    this.register.registerMetric(this.httpRequestCount);
    this.register.registerMetric(this.httpRequestDurationSeconds);
  }

  observeRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestCount.inc({ method, route, status_code: statusCode });
    this.httpRequestDurationSeconds.observe({ method, route, status_code: statusCode }, duration);
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}
