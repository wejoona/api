import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Request Logger Middleware
 * Logs method, path, status code, and response time for all requests.
 * Slow requests (>2s) are logged as warnings.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else if (duration > 2000) {
        this.logger.warn(`SLOW: ${message}`);
      } else {
        this.logger.log(message);
      }

    });

    // Set response time header before response is sent
    const origEnd = res.end;
    const startTime = start;
    res.end = function (...args: any[]) {
      const duration = Date.now() - startTime;
      if (!res.headersSent) {
        res.setHeader('X-Response-Time', `${duration}ms`);
      }
      return origEnd.apply(res, args);
    } as any;

    next();
  }
}
