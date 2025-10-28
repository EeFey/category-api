import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PinoLogger } from './pino.logger';
import { Request, Response } from 'express';

@Injectable()
@Catch()
export class PinoExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string; log?: any; __startTime?: number }>();

    // narrow types
    const isHttp = exception instanceof HttpException;
    const isError = exception instanceof Error;

    const status = isHttp ? (exception as HttpException).getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp ? (exception as HttpException).message : (isError ? (exception as Error).message : 'Internal server error');

    // make stable err shape
    const errPayload = isError
      ? { name: (exception as Error).name, message: (exception as Error).message, stack: (exception as Error).stack }
      : { name: (exception as any)?.name ?? 'Error', message: String(exception) };

    // use request-scoped logger if available, else fallback to a child logger containing requestId
    const reqLogger = request.log ?? this.logger.getLogger().child({ requestId: request.id });

    // log with structured payload
    reqLogger.error({ err: errPayload, path: request.url, method: request.method, status }, `[${request.method}] ${request.url} -> ${status} ${message}`);

    // consistent JSON response
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.id,
    });
  }
}
