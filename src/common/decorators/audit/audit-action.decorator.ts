import { AuditLog, AuditLogOptions } from './audit-log.decorator';

/**
 * Predefined audit decorators for common actions
 * Use these for consistency across the application
 */

/**
 * Audit CREATE operations
 */
export const AuditCreate = (
  resourceType: string,
  options?: Partial<AuditLogOptions>,
) =>
  AuditLog({
    action: `${resourceType}.create`,
    resourceType,
    resourceIdPath: 'result.id',
    includeArgs: [0],
    includeResult: true,
    ...options,
  });

/**
 * Audit UPDATE operations
 */
export const AuditUpdate = (
  resourceType: string,
  options?: Partial<AuditLogOptions>,
) =>
  AuditLog({
    action: `${resourceType}.update`,
    resourceType,
    resourceIdPath: 'args.0',
    includeArgs: [1],
    includeResult: true,
    ...options,
  });

/**
 * Audit DELETE operations
 */
export const AuditDelete = (
  resourceType: string,
  options?: Partial<AuditLogOptions>,
) =>
  AuditLog({
    action: `${resourceType}.delete`,
    resourceType,
    resourceIdPath: 'args.0',
    includeArgs: [0],
    highRisk: true,
    ...options,
  });

/**
 * Audit READ operations (for sensitive data)
 */
export const AuditRead = (
  resourceType: string,
  options?: Partial<AuditLogOptions>,
) =>
  AuditLog({
    action: `${resourceType}.read`,
    resourceType,
    resourceIdPath: 'args.0',
    includeResult: false, // Don't log sensitive data by default
    ...options,
  });

/**
 * Audit TRANSFER operations (financial transactions)
 */
export const AuditTransfer = (options?: Partial<AuditLogOptions>) =>
  AuditLog({
    action: 'transfer.create',
    resourceType: 'transfer',
    resourceIdPath: 'result.id',
    includeArgs: [0],
    includeResult: true,
    highRisk: true,
    detailsExtractor: (args, _result) => ({
      amount: args[0]?.amount,
      currency: args[0]?.currency || 'XOF',
      recipientId: args[0]?.recipientId,
      transferType: args[0]?.type || 'internal',
    }),
    ...options,
  });

/**
 * Audit WITHDRAWAL operations
 */
export const AuditWithdrawal = (options?: Partial<AuditLogOptions>) =>
  AuditLog({
    action: 'withdrawal.create',
    resourceType: 'withdrawal',
    resourceIdPath: 'result.id',
    includeArgs: [0],
    includeResult: true,
    highRisk: true,
    detailsExtractor: (args, _result) => ({
      amount: args[0]?.amount,
      currency: args[0]?.currency || 'XOF',
      method: args[0]?.method,
      destination: args[0]?.destination,
    }),
    ...options,
  });

/**
 * Audit DEPOSIT operations
 */
export const AuditDeposit = (options?: Partial<AuditLogOptions>) =>
  AuditLog({
    action: 'deposit.create',
    resourceType: 'deposit',
    resourceIdPath: 'result.id',
    includeArgs: [0],
    includeResult: true,
    highRisk: true,
    detailsExtractor: (args, _result) => ({
      amount: args[0]?.amount,
      currency: args[0]?.currency || 'XOF',
      method: args[0]?.method,
      source: args[0]?.source,
    }),
    ...options,
  });

/**
 * Audit KYC operations
 */
export const AuditKyc = (
  action: 'submit' | 'approve' | 'reject' | 'request_review',
  options?: Partial<AuditLogOptions>,
) =>
  AuditLog({
    action: `kyc.${action}`,
    resourceType: 'kyc',
    resourceIdPath: 'result.id',
    includeArgs: action === 'approve' || action === 'reject' ? [0, 1] : [0],
    includeResult: true,
    highRisk: action === 'approve' || action === 'reject',
    ...options,
  });

/**
 * Audit authentication operations
 */
export const AuditAuth = (
  action: 'login' | 'logout' | 'refresh' | 'password_reset' | 'password_change',
  options?: Partial<AuditLogOptions>,
) =>
  AuditLog({
    action: `auth.${action}`,
    resourceType: 'auth',
    resourceIdPath: action === 'login' ? 'result.userId' : 'args.0',
    includeResult: false, // Never log tokens
    highRisk: action === 'password_reset' || action === 'password_change',
    sensitiveFields: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'pin',
    ],
    ...options,
  });

/**
 * Audit admin operations
 */
export const AuditAdmin = (
  action: string,
  resourceType: string,
  options?: Partial<AuditLogOptions>,
) =>
  AuditLog({
    action: `admin.${action}`,
    resourceType,
    includeArgs: [0],
    includeResult: true,
    highRisk: true,
    ...options,
  });

/**
 * Audit configuration changes
 */
export const AuditConfig = (
  action: 'update' | 'create' | 'delete',
  options?: Partial<AuditLogOptions>,
) =>
  AuditLog({
    action: `config.${action}`,
    resourceType: 'configuration',
    resourceIdPath: 'args.0',
    includeArgs: true,
    includeResult: true,
    highRisk: true,
    ...options,
  });

/**
 * Audit webhook operations
 */
export const AuditWebhook = (
  action: 'received' | 'processed' | 'failed',
  options?: Partial<AuditLogOptions>,
) =>
  AuditLog({
    action: `webhook.${action}`,
    resourceType: 'webhook',
    resourceIdPath: 'args.0.id',
    includeArgs: [0],
    includeResult: action === 'processed',
    detailsExtractor: (args) => ({
      webhookType: args[0]?.type,
      provider: args[0]?.provider,
      eventId: args[0]?.eventId,
    }),
    ...options,
  });
