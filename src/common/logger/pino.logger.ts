import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import pino from 'pino';
import pinoHttp, { HttpLogger } from 'pino-http';

type RequestWithMeta = Request & {
  id?: string;
  log?: pino.Logger;
  __startTime?: number;
};

@Injectable({ scope: Scope.DEFAULT })
export class PinoLogger implements LoggerService {
  private readonly logger: pino.Logger;
  private readonly httpLogger: HttpLogger;

  constructor() {
    const level = process.env.LOG_LEVEL ?? 'info';

    // inside PinoLogger constructor (replace current logger/httpLogger config)
    this.logger = pino({
      level,
      name: process.env.SERVICE_NAME ?? 'category-api',
      base: { pid: false, service: process.env.SERVICE_NAME, env: process.env.NODE_ENV },
      timestamp: pino.stdTimeFunctions.isoTime,
      // redact any sensitive paths (supports nested properties)
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'req.headers["x-amzn-trace-id"]',
          'req.rawBody',
          'res.headers.set-cookie'
        ],
        censor: '[REDACTED]',
      },
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss.l' } }
          : undefined,
      serializers: {
        // only expose small set of req/res fields
        req: (req: any) => ({
          id: req?.id,
          method: req?.method,
          url: req?.url,
          route: req?.route?.path ?? undefined,
          remoteAddress: req?.ip ?? req?.connection?.remoteAddress,
        }),
        res: (res: any) => ({
          statusCode: res?.statusCode,
        }),
        err: pino.stdSerializers.err,
      },
    });

    // configure pino-http to use the same logger, but avoid double-logging raw req body
    this.httpLogger = pinoHttp({
      logger: this.logger,
      // by default pino-http logs request/response; keep it but we rely on serializers above
      customSuccessMessage: (_req, _res) => 'request completed',
      customErrorMessage: (_req, _res, err) => err?.message ?? 'request error',
      serializers: {
        req: (req: any) => ({
          id: req?.id,
          method: req?.method,
          url: req?.url,
          route: req?.route?.path ?? undefined,
        }),
        res: (res: any) => ({ statusCode: res?.statusCode }),
      },
      genReqId: (req: any) => req.headers['x-request-id'] || req.id || randomUUID(),
    });
  }

  // Nest LoggerService methods (thin wrappers)
  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }
  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }
  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }
  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }
  verbose(message: string, context?: string) {
    this.logger.trace({ context }, message);
  }

  // expose raw pino (for child loggers in services)
  getLogger(): pino.Logger {
    return this.logger;
  }

  // Express middleware: ensure req.id first, then call pino-http, then attach request-scoped child logger
  httpLog(req: RequestWithMeta, res: Response, next: NextFunction) {
    if (!req.id) {
      req.id = (req.headers['x-request-id'] as string) || randomUUID();
    }
    req.__startTime = Date.now();

    // call pino-http (it will log request/response automatically)
    this.httpLogger(req, res);

    // attach request-scoped child logger so every log during handling is correlated
    req.log = req.log ?? this.logger.child({
      requestId: req.id,
      service: process.env.SERVICE_NAME,
      env: process.env.NODE_ENV,
    });

    next();
  }
}
