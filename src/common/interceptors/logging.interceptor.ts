import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate or use existing request ID for correlation
    const requestId = request.headers['x-request-id'] || uuidv4();
    request.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);

    const { method, url, body, user } = request;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip || request.connection.remoteAddress;
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(
      JSON.stringify({
        type: 'request',
        requestId,
        method,
        url,
        ip,
        userAgent,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        // Don't log sensitive data in body
        hasBody: !!body && Object.keys(body).length > 0,
      }),
    );

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        // Log successful response
        this.logger.log(
          JSON.stringify({
            type: 'response',
            requestId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            userId: user?.id,
            timestamp: new Date().toISOString(),
            // Don't log full response data to avoid sensitive info
            hasData: !!data,
          }),
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Log error response
        this.logger.error(
          JSON.stringify({
            type: 'error',
            requestId,
            method,
            url,
            statusCode: error.status || 500,
            duration: `${duration}ms`,
            userId: user?.id,
            error: {
              name: error.name,
              message: error.message,
              stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
            timestamp: new Date().toISOString(),
          }),
        );

        throw error;
      }),
    );
  }
}
