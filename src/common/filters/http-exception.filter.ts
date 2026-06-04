import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Standard error code mapping for consistent API error identification.
 * Mobile clients can switch on `errorCode` for localised messages.
 */
const STATUS_TO_ERROR_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

/**
 * Global HTTP Exception Filter
 * Normalizes all error responses to a consistent envelope:
 *
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "BAD_REQUEST",
 *     "message": "Human-readable summary",
 *     "details": ["field-level messages from validation pipe"]
 *   },
 *   "meta": {
 *     "timestamp": "...",
 *     "path": "/api/v1/...",
 *     "method": "POST",
 *     "requestId": "uuid",
 *     "correlationId": "uuid"
 *   }
 * }
 * ```
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: string[] = [];
    let contextDetails: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        // class-validator returns message as string[]
        if (Array.isArray(resp.message)) {
          message = resp.message[0] || resp.error || message;
          details = resp.message;
        } else {
          message = resp.message || message;
        }
        if (Array.isArray(resp.details)) {
          details = resp.details;
        }
        // Allow custom error codes from application exceptions
        errorCode =
          resp.code ||
          resp.errorCode ||
          STATUS_TO_ERROR_CODE[status] ||
          errorCode;
        contextDetails = this.extractContext(resp);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    // Fallback error code from status
    if (!errorCode || errorCode === 'INTERNAL_ERROR') {
      errorCode = STATUS_TO_ERROR_CODE[status] || 'INTERNAL_ERROR';
    }

    const correlationId =
      (request as any).requestId ||
      (request as any).correlationId ||
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      null;

    const errorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details: details.length > 0 ? details : undefined,
        ...(contextDetails ?? {}),
        context: contextDetails,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        requestId: correlationId,
        correlationId,
      },
    };

    // Don't log 4xx as errors (client issues)
    if (status >= 500) {
      this.logger.error(JSON.stringify(errorResponse));
    } else if (status >= 400) {
      this.logger.warn(
        `[${correlationId}] ${status} ${request.method} ${request.url}: ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }

  private extractContext(resp: Record<string, unknown>) {
    const ignoredKeys = new Set([
      'code',
      'errorCode',
      'message',
      'error',
      'statusCode',
      'details',
    ]);
    const context = Object.fromEntries(
      Object.entries(resp).filter(([key, value]) => {
        return !ignoredKeys.has(key) && value !== undefined;
      }),
    );

    return Object.keys(context).length > 0 ? context : undefined;
  }
}
