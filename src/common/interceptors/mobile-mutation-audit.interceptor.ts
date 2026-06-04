import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '@/modules/admin/application/services/audit.service';
import { ActorType } from '@/modules/admin/infrastructure/persistence/typeorm/entities/audit-log.entity';
import {
  maskEmail,
  maskPhone,
  maskWalletAddress,
} from '@/common/utils/pii-sanitizer';

type RequestWithUser = Request & {
  user?: {
    id?: string;
    sub?: string;
    userId?: string;
    role?: string;
  };
  correlationId?: string;
  requestId?: string;
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXCLUDED_PREFIXES = [
  '/api/v1/admin',
  '/api/v1/webhook',
  '/api/v1/webhooks',
  '/api/v1/monitoring',
  '/api/v1/metrics',
  '/api/v1/health',
  '/api/v1/api-health',
  '/api/v1/reconciliation',
  '/api/v1/reports',
  '/api/v1/regulatory-reports',
  '/api/v1/event-store',
  '/api/v1/cache-warming',
  '/api/v1/batch-jobs',
];

const REDACTED_KEY_FRAGMENTS = [
  'password',
  'pin',
  'otp',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'jws',
  'cvv',
  'cardnumber',
  'card_number',
  'accountnumber',
  'account_number',
  'iban',
  'ssn',
  'taxid',
  'tax_id',
  'privatekey',
  'private_key',
  'mnemonic',
  'seed',
  'fcm',
];

const WALLET_ADDRESS_KEY_FRAGMENTS = [
  'walletaddress',
  'wallet_address',
  'toaddress',
  'to_address',
  'fromaddress',
  'from_address',
];

@Injectable()
export class MobileMutationAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MobileMutationAuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!this.shouldAudit(request)) {
      return next.handle();
    }

    const startedAt = Date.now();

    return next.handle().pipe(
      tap((result) => {
        void this.logMutation(context, request, startedAt, result, null);
      }),
      catchError((error) => {
        void this.logMutation(context, request, startedAt, null, error);
        return throwError(() => error);
      }),
    );
  }

  private shouldAudit(request: RequestWithUser): boolean {
    if (!MUTATING_METHODS.has(request.method)) {
      return false;
    }

    const path = request.originalUrl || request.url || '';
    return !EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
  }

  private async logMutation(
    context: ExecutionContext,
    request: RequestWithUser,
    startedAt: number,
    result: unknown,
    error: any,
  ): Promise<void> {
    try {
      const resourceType = this.extractResourceType(request);
      const handlerName = context.getHandler()?.name || 'unknown';
      const user = request.user;
      const actorType: ActorType =
        user?.role === 'admin' || user?.role === 'super_admin'
          ? 'admin'
          : 'user';

      await this.auditService.log({
        actorId: user?.id || user?.userId || user?.sub,
        actorType,
        action: `${resourceType}.${request.method.toLowerCase()}`,
        resourceType,
        resourceId: this.extractResourceId(request, result),
        details: {
          success: !error,
          method: request.method,
          path: this.stripQuery(request.originalUrl || request.url || ''),
          controller: context.getClass()?.name,
          handler: handlerName,
          routeKey: `${request.method} ${this.stripQuery(
            request.originalUrl || request.url || '',
          )}`,
          correlationId: request.correlationId || request.requestId,
          durationMs: Date.now() - startedAt,
          params: this.sanitize(request.params || {}),
          query: this.sanitize(request.query || {}),
          body: this.sanitize(request.body || {}),
          result: this.summarizeResult(result),
          error: error
            ? {
                name: error.name,
                statusCode: error.status || error.statusCode,
                message: error.message,
              }
            : undefined,
        },
        ipAddress: this.extractIpAddress(request),
        userAgent: request.headers?.['user-agent'],
      });
    } catch (auditError) {
      this.logger.error(
        'Failed to log mobile mutation audit event',
        auditError,
      );
    }
  }

  private extractResourceType(request: RequestWithUser): string {
    const path = this.stripQuery(request.originalUrl || request.url || '')
      .replace(/^\/api\/v\d+\//, '')
      .replace(/^\//, '');
    const [segment] = path.split('/');
    return segment || 'unknown';
  }

  private extractResourceId(
    request: RequestWithUser,
    result: unknown,
  ): string | undefined {
    const params = request.params || {};
    if (params.id) {
      return String(params.id);
    }

    if (result && typeof result === 'object') {
      const record = result as Record<string, unknown>;
      const id =
        record.id ||
        record.transactionId ||
        record.walletId ||
        record.paymentLinkId ||
        record.deviceId;
      return id ? String(id) : undefined;
    }

    return undefined;
  }

  private stripQuery(path: string): string {
    return path.split('?')[0];
  }

  private extractIpAddress(request: RequestWithUser): string | undefined {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;

    return (
      forwardedValue?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress
    );
  }

  private summarizeResult(
    result: unknown,
  ): Record<string, unknown> | undefined {
    if (!result || typeof result !== 'object') {
      return undefined;
    }

    const record = result as Record<string, unknown>;
    return this.sanitize({
      id: record.id,
      transactionId: record.transactionId,
      walletId: record.walletId,
      status: record.status,
      code: record.code,
    });
  }

  private sanitize(value: unknown, key = ''): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item, key));
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value !== 'object') {
      return this.sanitizeScalar(value, key);
    }

    const sanitized: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      sanitized[childKey] = this.sanitize(childValue, childKey);
    }
    return sanitized;
  }

  private sanitizeScalar(value: unknown, key: string): unknown {
    const normalizedKey = key.toLowerCase();
    const compactKey = normalizedKey.replace(/[^a-z0-9]/g, '');

    if (
      REDACTED_KEY_FRAGMENTS.some(
        (fragment) =>
          normalizedKey.includes(fragment) || compactKey.includes(fragment),
      )
    ) {
      return '[redacted]';
    }

    if (
      WALLET_ADDRESS_KEY_FRAGMENTS.some(
        (fragment) =>
          normalizedKey.includes(fragment) || compactKey.includes(fragment),
      )
    ) {
      return maskWalletAddress(String(value));
    }

    if (normalizedKey.includes('phone')) {
      return maskPhone(String(value));
    }

    if (normalizedKey.includes('email')) {
      return maskEmail(String(value));
    }

    return value;
  }
}
