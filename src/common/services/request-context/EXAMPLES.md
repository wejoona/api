# Request Context Service - Usage Examples

Real-world examples of using RequestContextService in JoonaPay.

## Example 1: Transaction Service

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';
import { AuditService } from '@/modules/audit';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly auditService: AuditService,
    private readonly transactionRepo: TransactionRepository,
  ) {}

  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    // Get user and context without passing as parameters
    const userId = this.requestContext.getUserId();
    const correlationId = this.requestContext.getCorrelationId();
    const ip = this.requestContext.getIp();
    const deviceId = this.requestContext.getDeviceId();

    // Structured logging with context
    this.logger.log('Creating transaction', {
      ...this.requestContext.getLogContext(),
      amount: dto.amount,
      currency: dto.currency,
      recipientId: dto.recipientId,
    });

    // Device validation
    if (this.requestContext.isDeviceRooted()) {
      throw new ForbiddenException('Transactions not allowed on rooted devices');
    }

    // Create transaction with context
    const transaction = await this.transactionRepo.create({
      ...dto,
      userId,
      deviceId,
      ipAddress: ip,
      correlationId,
    });

    // Audit log with full context
    await this.auditService.log({
      action: 'TRANSACTION_CREATED',
      entityType: 'transaction',
      entityId: transaction.id,
      ...this.requestContext.getAuditContext(),
      metadata: {
        amount: dto.amount,
        currency: dto.currency,
      },
    });

    return transaction;
  }

  async getTransactionHistory(): Promise<Transaction[]> {
    const userId = this.requestContext.getUserId();

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.transactionRepo.findByUserId(userId);
  }
}
```

## Example 2: Permission-Based Service

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';

@Injectable()
export class AdminService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async deleteUser(userId: string): Promise<void> {
    // Check admin role
    if (!this.requestContext.hasRole('admin')) {
      throw new ForbiddenException('Admin role required');
    }

    // Check specific permission
    if (!this.requestContext.hasPermission('users:delete')) {
      throw new ForbiddenException('User deletion permission required');
    }

    // Log who performed the action
    const adminId = this.requestContext.getUserId();
    const ip = this.requestContext.getIp();

    this.logger.warn('User deletion initiated', {
      adminId,
      targetUserId: userId,
      ip,
      correlationId: this.requestContext.getCorrelationId(),
    });

    // Perform deletion
    await this.userService.delete(userId);
  }

  async viewSensitiveData(): Promise<any> {
    // Require multiple permissions
    const requiredPermissions = ['data:view', 'sensitive:access'];

    if (!this.requestContext.hasAllPermissions(requiredPermissions)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Must be from trusted device
    if (!this.requestContext.isDeviceTrusted()) {
      throw new ForbiddenException('Trusted device required');
    }

    return this.getData();
  }

  async performBulkAction(): Promise<void> {
    // Require any of these permissions
    const allowedPermissions = [
      'super_admin',
      'bulk_operations',
      'system_admin',
    ];

    if (!this.requestContext.hasAnyPermission(allowedPermissions)) {
      throw new ForbiddenException('Permission denied');
    }

    // Perform action
  }
}
```

## Example 3: Deep Service Call Stack

```typescript
// Controller
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(@Body() dto: CreatePaymentDto) {
    // No need to pass user ID, IP, etc.
    return this.paymentsService.createPayment(dto);
  }
}

// Service Layer 1
@Injectable()
export class PaymentsService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly validationService: ValidationService,
    private readonly processingService: ProcessingService,
  ) {}

  async createPayment(dto: CreatePaymentDto) {
    // Validate - no need to pass context
    await this.validationService.validatePayment(dto);

    // Process - no need to pass context
    return this.processingService.processPayment(dto);
  }
}

// Service Layer 2
@Injectable()
export class ValidationService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly limitsService: LimitsService,
  ) {}

  async validatePayment(dto: CreatePaymentDto) {
    const userId = this.requestContext.getUserId();

    // Check limits - still have access to context
    await this.limitsService.checkUserLimits(userId, dto.amount);

    // Validate device
    if (this.requestContext.isDeviceRooted()) {
      throw new BadRequestException('Rooted devices not allowed');
    }
  }
}

// Service Layer 3
@Injectable()
export class LimitsService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async checkUserLimits(userId: string, amount: number) {
    // Deep in the call stack, still have access
    const correlationId = this.requestContext.getCorrelationId();

    this.logger.log('Checking limits', {
      userId,
      amount,
      correlationId,
      ip: this.requestContext.getIp(),
    });

    // Check limits
  }
}

// Service Layer 4
@Injectable()
export class ProcessingService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async processPayment(dto: CreatePaymentDto) {
    const userId = this.requestContext.getUserId();
    const deviceId = this.requestContext.getDeviceId();
    const ip = this.requestContext.getIp();

    // All context still available deep in the stack
    return this.paymentGateway.process({
      ...dto,
      userId,
      deviceId,
      ipAddress: ip,
      metadata: {
        correlationId: this.requestContext.getCorrelationId(),
        userAgent: this.requestContext.getUserAgent(),
      },
    });
  }
}
```

## Example 4: Audit Logging

```typescript
import { Injectable } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async logAction(
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const auditLog = this.auditRepo.create({
      action,
      entityType,
      entityId,
      ...this.requestContext.getAuditContext(),
      metadata,
    });

    await this.auditRepo.save(auditLog);
  }

  async logSecurityEvent(event: string, severity: string): Promise<void> {
    const context = this.requestContext.getAuditContext();

    await this.auditRepo.save({
      action: 'SECURITY_EVENT',
      event,
      severity,
      ...context,
      metadata: {
        deviceRooted: this.requestContext.isDeviceRooted(),
        deviceTrusted: this.requestContext.isDeviceTrusted(),
      },
    });
  }
}

// Usage in other services
@Injectable()
export class UserService {
  constructor(
    private readonly auditService: AuditService,
  ) {}

  async updateProfile(dto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepo.update(dto);

    // No need to collect userId, IP, etc. - AuditService gets it from context
    await this.auditService.logAction(
      'PROFILE_UPDATED',
      'user',
      user.id,
      { fields: Object.keys(dto) },
    );

    return user;
  }
}
```

## Example 5: Rate Limiting by User

```typescript
import { Injectable } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';
import { RateLimiterMemory } from 'rate-limiter-flexible';

@Injectable()
export class RateLimitService {
  private readonly limiter = new RateLimiterMemory({
    points: 10,
    duration: 60,
  });

  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async checkRateLimit(): Promise<void> {
    // Use user ID for authenticated requests, IP for anonymous
    const key =
      this.requestContext.getUserId() ||
      this.requestContext.getIp();

    try {
      await this.limiter.consume(key);
    } catch (error) {
      throw new TooManyRequestsException('Rate limit exceeded');
    }
  }
}

// Usage in guard
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(): Promise<boolean> {
    await this.rateLimitService.checkRateLimit();
    return true;
  }
}
```

## Example 6: Custom Logger with Context

```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';
import * as winston from 'winston';

@Injectable()
export class ContextualLogger implements LoggerService {
  private readonly logger: winston.Logger;

  constructor(
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = winston.createLogger({
      // Winston configuration
    });
  }

  log(message: string, metadata?: Record<string, unknown>) {
    this.logger.info(message, {
      ...this.requestContext.getLogContext(),
      ...metadata,
    });
  }

  error(message: string, trace?: string, metadata?: Record<string, unknown>) {
    this.logger.error(message, {
      ...this.requestContext.getLogContext(),
      trace,
      ...metadata,
    });
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.logger.warn(message, {
      ...this.requestContext.getLogContext(),
      ...metadata,
    });
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    this.logger.debug(message, {
      ...this.requestContext.getLogContext(),
      ...metadata,
    });
  }
}
```

## Example 7: Fraud Detection

```typescript
import { Injectable } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';

@Injectable()
export class FraudDetectionService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async checkForFraud(dto: TransactionDto): Promise<void> {
    const riskFactors = [];

    // Check rooted device
    if (this.requestContext.isDeviceRooted()) {
      riskFactors.push({
        factor: 'ROOTED_DEVICE',
        severity: 'HIGH',
      });
    }

    // Check untrusted device
    if (!this.requestContext.isDeviceTrusted()) {
      riskFactors.push({
        factor: 'UNTRUSTED_DEVICE',
        severity: 'MEDIUM',
      });
    }

    // Check country mismatch
    const userCountry = await this.getUserCountry();
    const requestCountry = this.requestContext.getCountry();

    if (userCountry !== requestCountry) {
      riskFactors.push({
        factor: 'COUNTRY_MISMATCH',
        severity: 'MEDIUM',
        details: { userCountry, requestCountry },
      });
    }

    // Check suspicious IP
    const ip = this.requestContext.getIp();
    if (await this.isIpSuspicious(ip)) {
      riskFactors.push({
        factor: 'SUSPICIOUS_IP',
        severity: 'HIGH',
      });
    }

    // Analyze risk
    if (this.isHighRisk(riskFactors)) {
      await this.flagForReview({
        userId: this.requestContext.getUserId(),
        transactionData: dto,
        riskFactors,
        context: this.requestContext.getAuditContext(),
      });

      throw new ForbiddenException('Transaction flagged for review');
    }
  }

  private isHighRisk(factors: RiskFactor[]): boolean {
    return factors.some(f => f.severity === 'HIGH');
  }
}
```

## Example 8: Multi-Tenant Context

```typescript
import { Injectable } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';

@Injectable()
export class TenantService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async getTenantId(): Promise<string> {
    // Try to get tenant from user
    const user = this.requestContext.getUser();
    if (user?.tenantId) {
      return user.tenantId;
    }

    // Try to get from custom context
    const tenantId = this.requestContext.getCustom<string>('tenantId');
    if (tenantId) {
      return tenantId;
    }

    throw new BadRequestException('Tenant not found');
  }

  async setTenant(tenantId: string): Promise<void> {
    this.requestContext.setCustom('tenantId', tenantId);
  }
}

// Usage in tenant guard
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly tenantService: TenantService,
    private readonly requestContext: RequestContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];

    if (!tenantId) {
      throw new BadRequestException('Tenant ID required');
    }

    // Store in context for use throughout request
    await this.tenantService.setTenant(tenantId);

    return true;
  }
}
```

## Example 9: Performance Monitoring

```typescript
import { Injectable } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context';

@Injectable()
export class PerformanceMonitoringService {
  constructor(
    private readonly requestContext: RequestContextService,
  ) {}

  async trackSlowOperation(operation: string, duration: number): Promise<void> {
    if (duration > 1000) {
      this.logger.warn('Slow operation detected', {
        operation,
        duration,
        ...this.requestContext.getLogContext(),
        requestDuration: this.requestContext.getRequestDuration(),
      });

      await this.metricsService.recordSlowOperation({
        operation,
        duration,
        userId: this.requestContext.getUserId(),
        path: this.requestContext.getPath(),
      });
    }
  }

  async monitorDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
  ): Promise<T> {
    const start = Date.now();
    try {
      return await queryFn();
    } finally {
      const duration = Date.now() - start;
      await this.trackSlowOperation(`db:${queryName}`, duration);
    }
  }
}
```

## Example 10: Testing with Context

```typescript
import { Test } from '@nestjs/testing';
import { RequestContextService } from '@/common/services/request-context';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let requestContext: RequestContextService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionService,
        RequestContextService,
      ],
    }).compile();

    service = module.get(TransactionService);
    requestContext = module.get(RequestContextService);
  });

  it('should create transaction with user context', async () => {
    const mockContext: RequestContext = {
      correlationId: 'test-123',
      requestId: 'test-123',
      timestamp: new Date(),
      method: 'POST',
      path: '/api/v1/transactions',
      url: '/api/v1/transactions',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      },
      device: {
        id: 'device-123',
        isTrusted: true,
        isRooted: false,
      },
      metadata: {
        ip: '192.168.1.1',
        userAgent: 'Test Agent',
      },
    };

    await requestContext.run(mockContext, async () => {
      const result = await service.createTransaction({
        amount: 100,
        currency: 'USDC',
        recipientId: 'recipient-123',
      });

      expect(result.userId).toBe('user-123');
      expect(result.deviceId).toBe('device-123');
      expect(result.ipAddress).toBe('192.168.1.1');
    });
  });

  it('should reject on rooted device', async () => {
    const mockContext: RequestContext = {
      // ... other fields
      device: {
        isRooted: true,
      },
    };

    await requestContext.run(mockContext, async () => {
      await expect(
        service.createTransaction(dto),
      ).rejects.toThrow('Transactions not allowed on rooted devices');
    });
  });
});
```

## Key Takeaways

1. **No Parameter Passing**: Access user, device, IP, etc. without passing them through function parameters
2. **Deep Call Stacks**: Context available at any depth in the call stack
3. **Consistent Logging**: Structured logs with context everywhere
4. **Audit Trails**: Easy to create comprehensive audit logs
5. **Security Checks**: Device trust, permissions, fraud detection
6. **Multi-Tenant**: Store tenant info for the request
7. **Performance**: Track slow operations with request context
8. **Testing**: Easy to mock context in tests
