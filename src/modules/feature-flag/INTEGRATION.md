# Feature Flags Integration Guide

This guide shows how to integrate feature flags into other JoonaPay modules.

## Table of Contents
1. [Service Injection](#service-injection)
2. [Controller Guards](#controller-guards)
3. [Decorator Pattern](#decorator-pattern)
4. [Conditional Logic](#conditional-logic)
5. [Real-World Examples](#real-world-examples)
6. [Mobile Integration](#mobile-integration)
7. [Testing with Feature Flags](#testing-with-feature-flags)

---

## Service Injection

### Basic Usage

```typescript
import { Injectable } from '@nestjs/common';
import { FeatureFlagService } from '@/modules/feature-flag';

@Injectable()
export class WalletService {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async getAvailableFeatures(userId: string, countryCode: string) {
    const canSaveInPots = await this.featureFlagService.isEnabled(
      'savings_pots',
      { userId, countryCode }
    );

    const canPayBills = await this.featureFlagService.isEnabled(
      'bill_payments',
      { userId, countryCode }
    );

    return {
      savingsPots: canSaveInPots,
      billPayments: canPayBills,
    };
  }
}
```

### Module Import

```typescript
import { Module } from '@nestjs/common';
import { FeatureFlagModule } from '@/modules/feature-flag';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [FeatureFlagModule], // Import the module
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
```

---

## Controller Guards

### Custom Feature Guard

Create a reusable guard for feature-gated endpoints:

```typescript
// src/common/guards/feature.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from '@/modules/feature-flag';

export const FEATURE_KEY = 'feature_flag';
export const RequireFeature = (featureKey: string) =>
  SetMetadata(FEATURE_KEY, featureKey);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.get<string>(
      FEATURE_KEY,
      context.getHandler(),
    );

    if (!featureKey) {
      return true; // No feature flag required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const isEnabled = await this.featureFlagService.isEnabled(featureKey, {
      userId: user.id,
      countryCode: user.countryCode,
      appVersion: request.headers['x-app-version'],
      platform: request.headers['x-platform'],
    });

    if (!isEnabled) {
      throw new ForbiddenException(
        `Feature "${featureKey}" is not available`,
      );
    }

    return true;
  }
}
```

### Usage in Controllers

```typescript
import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { FeatureGuard, RequireFeature } from '@/common/guards/feature.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('savings')
@UseGuards(JwtAuthGuard)
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Post('pots')
  @UseGuards(FeatureGuard)
  @RequireFeature('savings_pots')
  async createSavingsPot(
    @CurrentUser() user: User,
    @Body() dto: CreatePotDto,
  ) {
    return this.savingsService.createPot(user.id, dto);
  }
}
```

---

## Decorator Pattern

### Create Custom Decorator

```typescript
// src/common/decorators/feature-enabled.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const FEATURE_ENABLED_KEY = 'feature_enabled';

export interface FeatureConfig {
  key: string;
  fallbackValue?: any;
  throwOnDisabled?: boolean;
}

export const FeatureEnabled = (config: FeatureConfig | string) =>
  SetMetadata(
    FEATURE_ENABLED_KEY,
    typeof config === 'string' ? { key: config } : config,
  );
```

### Create Interceptor

```typescript
// src/common/interceptors/feature.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { FeatureFlagService } from '@/modules/feature-flag';
import { FEATURE_ENABLED_KEY, FeatureConfig } from '../decorators/feature-enabled.decorator';

@Injectable()
export class FeatureInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const featureConfig = this.reflector.get<FeatureConfig>(
      FEATURE_ENABLED_KEY,
      context.getHandler(),
    );

    if (!featureConfig) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const isEnabled = await this.featureFlagService.isEnabled(
      featureConfig.key,
      {
        userId: user?.id,
        countryCode: user?.countryCode,
        appVersion: request.headers['x-app-version'],
        platform: request.headers['x-platform'],
      },
    );

    if (!isEnabled) {
      if (featureConfig.throwOnDisabled !== false) {
        throw new ForbiddenException(
          `Feature "${featureConfig.key}" is not enabled`,
        );
      }
      return featureConfig.fallbackValue;
    }

    return next.handle();
  }
}
```

---

## Conditional Logic

### In Services

```typescript
@Injectable()
export class TransferService {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly ledgerAdapter: BlnkLedgerAdapter,
  ) {}

  async createTransfer(userId: string, dto: CreateTransferDto) {
    // Check if external transfers are allowed
    if (dto.isExternal) {
      const canTransferExternal = await this.featureFlagService.isEnabled(
        'external_transfers',
        { userId }
      );

      if (!canTransferExternal) {
        throw new ForbiddenException(
          'External transfers are not available for your account'
        );
      }
    }

    // Check if two-factor auth is required
    const requires2FA = await this.featureFlagService.isEnabled(
      'two_factor_auth',
      { userId }
    );

    if (requires2FA && !dto.twoFactorCode) {
      throw new BadRequestException('Two-factor authentication required');
    }

    // Process transfer...
    return this.ledgerAdapter.createTransaction(dto);
  }
}
```

### Conditional Feature Availability

```typescript
@Injectable()
export class UserPreferencesService {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async getAvailableFeatures(userId: string, context: any) {
    // Get all features evaluated for user
    const features = await this.featureFlagService.getEnabledFlagsForContext({
      userId,
      countryCode: context.countryCode,
      appVersion: context.appVersion,
      platform: context.platform,
    });

    return {
      savings: {
        enabled: features.savings_pots,
        features: features.savings_pots
          ? ['create', 'transfer', 'withdraw']
          : [],
      },
      payments: {
        billPayments: features.bill_payments,
        merchantPayments: features.merchant_payments,
        externalTransfers: features.external_transfers,
      },
      security: {
        twoFactorAuth: features.two_factor_auth,
        biometricAuth: features.biometric_auth,
      },
      referral: {
        enabled: features.referral_program,
      },
    };
  }
}
```

---

## Real-World Examples

### Example 1: Transfer Module

```typescript
// src/modules/transfer/application/usecases/create-transfer.use-case.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { FeatureFlagService } from '@/modules/feature-flag';
import { TransferRepository } from '../../domain/repositories/transfer.repository';

@Injectable()
export class CreateTransferUseCase {
  constructor(
    private readonly transferRepository: TransferRepository,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async execute(userId: string, dto: CreateTransferDto) {
    // For external transfers, check feature flag
    if (dto.recipientType === 'external') {
      const canTransferExternal = await this.featureFlagService.isEnabled(
        'external_transfers',
        { userId }
      );

      if (!canTransferExternal) {
        throw new ForbiddenException(
          'External wallet transfers are not available. ' +
          'Please contact support to enable this feature.'
        );
      }
    }

    // Create transfer...
    return this.transferRepository.create({ userId, ...dto });
  }
}
```

### Example 2: Bill Payments Module

```typescript
// src/modules/bill-payments/bill-payments.controller.ts
import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { FeatureGuard, RequireFeature } from '@/common/guards/feature.guard';

@Controller('bill-payments')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class BillPaymentsController {
  constructor(private readonly billPaymentsService: BillPaymentsService) {}

  @Get('providers')
  @RequireFeature('bill_payments')
  async getProviders() {
    return this.billPaymentsService.getProviders();
  }

  @Post('pay')
  @RequireFeature('bill_payments')
  async payBill(@CurrentUser() user: User, @Body() dto: PayBillDto) {
    return this.billPaymentsService.payBill(user.id, dto);
  }
}
```

### Example 3: Merchant QR Payments

```typescript
// src/modules/merchant/merchant.service.ts
import { Injectable } from '@nestjs/common';
import { FeatureFlagService } from '@/modules/feature-flag';

@Injectable()
export class MerchantService {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async generateQRCode(merchantId: string, amount: number) {
    const isEnabled = await this.featureFlagService.isEnabled(
      'merchant_payments',
      { userId: merchantId }
    );

    if (!isEnabled) {
      return {
        success: false,
        message: 'Merchant QR payments are not available yet',
      };
    }

    // Generate QR code...
    const qrCode = await this.generateQR({ merchantId, amount });

    return {
      success: true,
      qrCode,
    };
  }
}
```

### Example 4: Referral Program

```typescript
// src/modules/referral/referral.controller.ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { FeatureFlagService } from '@/modules/feature-flag';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  @Get('code')
  async getReferralCode(@CurrentUser() user: User) {
    const isEnabled = await this.featureFlagService.isEnabled(
      'referral_program',
      { userId: user.id, countryCode: user.countryCode }
    );

    if (!isEnabled) {
      return {
        enabled: false,
        message: 'Referral program coming soon to your region!',
      };
    }

    const code = await this.referralService.getOrCreateCode(user.id);

    return {
      enabled: true,
      code,
      rewards: await this.referralService.getRewards(user.id),
    };
  }
}
```

---

## Mobile Integration

### Flutter/Dart Example

```dart
// lib/services/feature_flag_service.dart
import 'package:dio/dio.dart';

class FeatureFlagService {
  final Dio _dio;
  Map<String, bool>? _cachedFlags;

  FeatureFlagService(this._dio);

  // Fetch all flags on app startup
  Future<void> initialize() async {
    try {
      final response = await _dio.get(
        '/api/v1/feature-flags/me',
        queryParameters: {
          'appVersion': '1.0.0',
          'platform': Platform.isIOS ? 'ios' : 'android',
        },
      );

      _cachedFlags = Map<String, bool>.from(response.data);
    } catch (e) {
      print('Failed to load feature flags: $e');
      _cachedFlags = {}; // Default to empty (all disabled)
    }
  }

  // Check if feature is enabled (uses cache)
  bool isEnabled(String featureKey) {
    return _cachedFlags?[featureKey] ?? false;
  }

  // Check specific feature from server
  Future<bool> checkFeature(String featureKey) async {
    try {
      final response = await _dio.get(
        '/api/v1/feature-flags/check/$featureKey',
        queryParameters: {
          'appVersion': '1.0.0',
          'platform': Platform.isIOS ? 'ios' : 'android',
        },
      );

      return response.data['enabled'] ?? false;
    } catch (e) {
      print('Failed to check feature: $e');
      return false;
    }
  }
}
```

### Usage in Flutter

```dart
// lib/features/savings/savings_screen.dart
class SavingsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featureFlags = ref.watch(featureFlagProvider);

    if (!featureFlags.isEnabled('savings_pots')) {
      return ComingSoonScreen(
        title: 'Savings Pots',
        message: 'This feature is coming soon!',
      );
    }

    return SavingsPotsList();
  }
}
```

---

## Testing with Feature Flags

### Mock in Unit Tests

```typescript
// src/modules/transfer/transfer.service.spec.ts
describe('TransferService', () => {
  let service: TransferService;
  let featureFlagService: jest.Mocked<FeatureFlagService>;

  beforeEach(async () => {
    const mockFeatureFlagService = {
      isEnabled: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        TransferService,
        {
          provide: FeatureFlagService,
          useValue: mockFeatureFlagService,
        },
      ],
    }).compile();

    service = module.get(TransferService);
    featureFlagService = module.get(FeatureFlagService);
  });

  it('should allow external transfer when flag is enabled', async () => {
    featureFlagService.isEnabled.mockResolvedValue(true);

    const result = await service.createTransfer('user-123', {
      recipientType: 'external',
      amount: 100,
    });

    expect(result).toBeDefined();
  });

  it('should block external transfer when flag is disabled', async () => {
    featureFlagService.isEnabled.mockResolvedValue(false);

    await expect(
      service.createTransfer('user-123', {
        recipientType: 'external',
        amount: 100,
      })
    ).rejects.toThrow(ForbiddenException);
  });
});
```

### Integration Tests

```typescript
// test/feature-flags.e2e-spec.ts
describe('Feature Flags (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/feature-flags/me (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/feature-flags/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('external_transfers');
        expect(res.body).toHaveProperty('bill_payments');
      });
  });

  it('/feature-flags/check/:key (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/feature-flags/check/external_transfers')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('key', 'external_transfers');
        expect(res.body).toHaveProperty('enabled');
      });
  });
});
```

---

## Best Practices

### 1. Fail Safe
```typescript
// Always default to disabled if flag doesn't exist
const isEnabled = await this.featureFlagService.isEnabled('new_feature', context);
// Returns false if flag not found
```

### 2. Feature Detection
```typescript
// Check feature availability before showing UI
const features = await this.featureFlagService.getEnabledFlagsForContext(context);

return {
  showSavingsTab: features.savings_pots,
  showBillPayments: features.bill_payments,
  showReferrals: features.referral_program,
};
```

### 3. Graceful Degradation
```typescript
if (!await this.featureFlagService.isEnabled('advanced_analytics', { userId })) {
  // Fall back to basic analytics
  return this.getBasicAnalytics(userId);
}

return this.getAdvancedAnalytics(userId);
```

### 4. Cache Locally in Mobile Apps
```dart
// Cache flags on app startup
await featureFlagService.initialize();

// Use cached values for instant checks
if (featureFlagService.isEnabled('savings_pots')) {
  // Show feature
}
```

### 5. Provide User Feedback
```typescript
throw new ForbiddenException(
  'This feature is not available for your account yet. ' +
  'Contact support@joonapay.com to request early access.'
);
```

---

## Common Patterns

### Pattern 1: Progressive Rollout
```typescript
// Week 1: 5% rollout to beta testers
await featureFlagService.updateFlag('new_dashboard', {
  isEnabled: true,
  rolloutPercentage: 5,
});

// Week 2: 25% rollout
await featureFlagService.updateFlag('new_dashboard', {
  rolloutPercentage: 25,
});

// Week 4: Full rollout
await featureFlagService.updateFlag('new_dashboard', {
  rolloutPercentage: 100,
});
```

### Pattern 2: Regional Launch
```typescript
// Launch in Côte d'Ivoire first
await featureFlagService.updateFlag('mobile_money_xof', {
  isEnabled: true,
  enabledCountries: ['CIV'],
});

// Expand to all West Africa
await featureFlagService.updateFlag('mobile_money_xof', {
  enabledCountries: ['CIV', 'SEN', 'MLI', 'BFA', 'NER'],
});
```

### Pattern 3: Platform-Specific Features
```typescript
// iOS only for now (pending Android development)
await featureFlagService.updateFlag('biometric_face_id', {
  isEnabled: true,
  platforms: ['ios'],
});
```

---

This integration guide should help you effectively use feature flags across the JoonaPay backend and mobile applications.
