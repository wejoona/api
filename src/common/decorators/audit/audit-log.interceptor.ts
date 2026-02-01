import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AUDIT_LOG_KEY, AuditLogOptions } from './audit-log.decorator';
import { AuditService } from '../../../modules/admin/application/services/audit.service';
import { ActorType } from '../../../modules/admin/infrastructure/persistence/typeorm/entities/audit-log.entity';

const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'pin',
  'secret',
  'token',
  'apiKey',
  'apiSecret',
  'privateKey',
  'accessToken',
  'refreshToken',
  'authToken',
];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get<AuditLogOptions>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const args = context.getArgs();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (result) => {
        try {
          await this.logAuditEvent(
            options,
            request,
            args,
            result,
            null,
            startTime,
          );
        } catch (error) {
          // Don't fail request if audit logging fails
          this.logger.error('Failed to log audit event', error);
        }
      }),
      catchError((error) => {
        if (options.logOnError !== false) {
          try {
            this.logAuditEvent(
              options,
              request,
              args,
              null,
              error,
              startTime,
            ).catch((auditError) => {
              this.logger.error(
                'Failed to log audit event on error',
                auditError,
              );
            });
          } catch (auditError) {
            this.logger.error('Failed to log audit event on error', auditError);
          }
        }
        return throwError(() => error);
      }),
    );
  }

  private async logAuditEvent(
    options: AuditLogOptions,
    request: any,
    args: any[],
    result: any,
    error: any,
    startTime: number,
  ): Promise<void> {
    const user = request.user;
    const sensitiveFields = options.sensitiveFields || DEFAULT_SENSITIVE_FIELDS;

    // Extract resource ID
    const resourceId = this.extractResourceId(
      options.resourceIdPath,
      args,
      result,
    );

    // Build details object
    const details: Record<string, unknown> = {
      method: request.method,
      url: request.url,
      duration: Date.now() - startTime,
    };

    // Include arguments if specified
    if (options.includeArgs) {
      if (Array.isArray(options.includeArgs)) {
        details.args = options.includeArgs.map((index) =>
          this.redactSensitiveData(args[index], sensitiveFields),
        );
      } else if (options.includeArgs === true) {
        details.args = this.redactSensitiveData(args, sensitiveFields);
      }
    }

    // Include result if specified
    if (options.includeResult && result) {
      details.result = this.redactSensitiveData(result, sensitiveFields);
    }

    // Include error if present
    if (error) {
      details.error = {
        name: error.name,
        message: error.message,
        statusCode: error.status || error.statusCode,
      };
      details.success = false;
    } else {
      details.success = true;
    }

    // Extract custom details
    if (options.detailsExtractor) {
      try {
        const customDetails = options.detailsExtractor(args, result, {
          user,
          request,
        });
        Object.assign(details, customDetails);
      } catch (err) {
        this.logger.warn('Custom details extractor failed', err);
      }
    }

    // Determine actor type
    const actorType: ActorType = user?.role === 'admin' ? 'admin' : 'user';

    // Log to audit service
    await this.auditService.log({
      actorId: user?.id || user?.sub,
      actorType,
      action: options.action,
      resourceType: options.resourceType,
      resourceId,
      details,
      ipAddress: this.extractIpAddress(request),
      userAgent: request.headers?.['user-agent'],
    });
  }

  private extractResourceId(
    path: string | undefined,
    args: any[],
    result: any,
  ): string | undefined {
    if (!path) {
      return undefined;
    }

    const parts = path.split('.');
    let current: any;

    // Determine starting point
    if (parts[0] === 'args') {
      current = args;
      parts.shift();
    } else if (parts[0] === 'result') {
      current = result;
      parts.shift();
    } else {
      // Default to result
      current = result;
    }

    // Traverse path
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current?.toString();
  }

  private extractIpAddress(request: any): string | undefined {
    return (
      request.ip ||
      request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress
    );
  }

  private redactSensitiveData(data: any, sensitiveFields: string[]): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) =>
        this.redactSensitiveData(item, sensitiveFields),
      );
    }

    if (typeof data === 'object') {
      const redacted: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (
          sensitiveFields.some((field) =>
            key.toLowerCase().includes(field.toLowerCase()),
          )
        ) {
          redacted[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          redacted[key] = this.redactSensitiveData(value, sensitiveFields);
        } else {
          redacted[key] = value;
        }
      }
      return redacted;
    }

    return data;
  }
}
