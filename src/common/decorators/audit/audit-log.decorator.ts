import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogOptions {
  /**
   * Action being performed (e.g., 'create', 'update', 'delete', 'transfer')
   */
  action: string;

  /**
   * Type of resource being acted upon (e.g., 'wallet', 'transfer', 'user')
   */
  resourceType: string;

  /**
   * Property path to extract resource ID from method arguments or result
   * Examples:
   * - 'args.0.id' - First argument's id property
   * - 'args.1' - Second argument directly
   * - 'result.id' - Result's id property
   * - 'result.data.walletId' - Nested property in result
   */
  resourceIdPath?: string;

  /**
   * Whether to include method arguments in audit details
   * Can be boolean or array of argument indices to include
   * @default false
   */
  includeArgs?: boolean | number[];

  /**
   * Whether to include method result in audit details
   * @default false
   */
  includeResult?: boolean;

  /**
   * Custom function to extract additional details
   */
  detailsExtractor?: (
    args: any[],
    result: any,
    context: any,
  ) => Record<string, unknown>;

  /**
   * Whether to log on error (will include error info)
   * @default true
   */
  logOnError?: boolean;

  /**
   * Sensitive fields to redact from args/result
   * @default ['password', 'pin', 'secret', 'token', 'apiKey']
   */
  sensitiveFields?: string[];

  /**
   * Whether this action is high-risk and should be logged even on read
   * @default false
   */
  highRisk?: boolean;
}

/**
 * Decorator to automatically log method calls to audit log
 * Requires AuditInterceptor to be enabled globally or on controller
 *
 * @example
 * ```typescript
 * @Post('transfer')
 * @AuditLog({
 *   action: 'transfer.create',
 *   resourceType: 'transfer',
 *   resourceIdPath: 'result.id',
 *   includeArgs: [0], // Include first argument (DTO)
 *   includeResult: true,
 * })
 * async createTransfer(@Body() dto: CreateTransferDto, @CurrentUser() user: User) {
 *   return this.transferUseCase.execute(dto, user.id);
 * }
 * ```
 */
export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_KEY, options);
